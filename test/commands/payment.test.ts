import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseArgs } from "../../src/cli/args.js";
import { paymentGetCommand, paymentRecordCommand } from "../../src/commands/payment.js";

function captureStdout() {
  const lines: string[] = [];
  const spy = vi.spyOn(process.stdout, "write").mockImplementation((chunk: unknown) => {
    lines.push(String(chunk));
    return true;
  });
  return { lines, restore: () => spy.mockRestore() };
}

describe("payment detail/record", () => {
  beforeEach(() => {
    process.env["GHL_API_KEY"] = "test-token";
    process.env["GHL_LOCATION_ID"] = "loc1";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("payment <id> prints order detail, handling the data-wrapped response shape", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL) => {
        expect(String(url)).toContain("/payments/orders/order1");
        return new Response(
          JSON.stringify({ data: { _id: "order1", contactId: "c1", amount: 49.99, status: "paid" } }),
          { status: 200 },
        );
      }),
    );
    const out = captureStdout();
    const code = await paymentGetCommand.run(parseArgs(["order1"], paymentGetCommand.spec));
    out.restore();
    expect(code).toBe(0);
    expect(out.lines.join("")).toContain("order1");
  });

  it("payment record without --confirm makes ZERO network calls and exits 0 with an explicit dry-run", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const out = captureStdout();
    const parsed = parseArgs(["order1", "--amount", "49.99", "--mode", "card"], paymentRecordCommand.spec);
    const code = await paymentRecordCommand.run(parsed);
    out.restore();

    expect(code).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
    const output = out.lines.join("");
    expect(output).toContain("dry-run:");
    expect(output).toContain("49.99");
    expect(output).toContain("card");
    expect(output).toContain("order1");
    expect(output).toContain("--confirm");
  });

  it("payment record with --confirm calls POST record-payment exactly once with the exact amount and mode", async () => {
    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      expect(init?.method).toBe("POST");
      expect(String(url)).toContain("/payments/orders/order1/record-payment");
      const body = JSON.parse(String(init?.body));
      expect(body).toMatchObject({ altId: "loc1", altType: "location", mode: "card", amount: 49.99 });
      return new Response(JSON.stringify({ succeeded: true }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const parsed = parseArgs(
      ["order1", "--amount", "49.99", "--mode", "card", "--confirm"],
      paymentRecordCommand.spec,
    );
    const code = await paymentRecordCommand.run(parsed);
    expect(code).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects a non-numeric --amount with a usage error and no network call, even with --confirm", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const parsed = parseArgs(
      ["order1", "--amount", "not-a-number", "--mode", "card", "--confirm"],
      paymentRecordCommand.spec,
    );
    await expect(paymentRecordCommand.run(parsed)).rejects.toThrow(/--amount/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a negative --amount with a usage error and no network call, even with --confirm", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const parsed = parseArgs(
      ["order1", "--amount", "-5", "--mode", "card", "--confirm"],
      paymentRecordCommand.spec,
    );
    await expect(paymentRecordCommand.run(parsed)).rejects.toThrow(/--amount/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requires --mode, even with --confirm, with no network call", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const parsed = parseArgs(["order1", "--amount", "10", "--confirm"], paymentRecordCommand.spec);
    await expect(paymentRecordCommand.run(parsed)).rejects.toThrow(/--mode/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid --mode value at the parser level (FlagSpec.values)", () => {
    expect(() => parseArgs(["order1", "--amount", "10", "--mode", "bitcoin"], paymentRecordCommand.spec)).toThrow(
      /invalid value/,
    );
  });
});
