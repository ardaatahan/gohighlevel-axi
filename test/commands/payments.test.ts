import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseArgs } from "../../src/cli/args.js";
import { paymentsCommand } from "../../src/commands/payments.js";

function captureStdout() {
  const lines: string[] = [];
  const spy = vi.spyOn(process.stdout, "write").mockImplementation((chunk: unknown) => {
    lines.push(String(chunk));
    return true;
  });
  return { lines, restore: () => spy.mockRestore() };
}

describe("payments (read-only order/transaction list)", () => {
  const originalHome = process.env["HOME"];

  beforeEach(() => {
    process.env["GHL_API_KEY"] = "test-token";
    process.env["GHL_LOCATION_ID"] = "loc1";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalHome === undefined) delete process.env["HOME"];
    else process.env["HOME"] = originalHome;
  });

  it("sends altId=locationId and altType=location, and handles the data/_id response shape", async () => {
    const fetchMock = vi.fn(async (url: string | URL) => {
      const u = new URL(String(url));
      expect(u.pathname).toBe("/payments/orders");
      expect(u.searchParams.get("altId")).toBe("loc1");
      expect(u.searchParams.get("altType")).toBe("location");
      return new Response(
        JSON.stringify({ data: [{ _id: "order1", contactId: "c1", amount: 49.99, status: "paid" }] }),
        { status: 200 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const out = captureStdout();
    const code = await paymentsCommand.run(parseArgs([], paymentsCommand.spec));
    out.restore();

    expect(code).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(out.lines.join("")).toContain("order1");
  });

  it("reports a definitive empty state naming active filters", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ data: [] }), { status: 200 })));
    const out = captureStdout();
    const parsed = parseArgs(["--contact", "c1"], paymentsCommand.spec);
    const code = await paymentsCommand.run(parsed);
    out.restore();
    expect(code).toBe(0);
    const output = out.lines.join("");
    expect(output).toContain("0 orders found");
    expect(output).toContain("contact=c1");
  });

  it("never calls the network when no API key is configured", async () => {
    delete process.env["GHL_API_KEY"];
    process.env["HOME"] = mkdtempSync(join(tmpdir(), "ghl-axi-payments-nokey-"));
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(paymentsCommand.run(parseArgs([], paymentsCommand.spec))).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
