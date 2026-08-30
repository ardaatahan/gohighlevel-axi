import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseArgs } from "../../src/cli/args.js";
import { subscriptionsCommand } from "../../src/commands/subscriptions.js";

function captureStdout() {
  const lines: string[] = [];
  const spy = vi.spyOn(process.stdout, "write").mockImplementation((chunk: unknown) => {
    lines.push(String(chunk));
    return true;
  });
  return { lines, restore: () => spy.mockRestore() };
}

describe("subscriptions", () => {
  beforeEach(() => {
    process.env["GHL_API_KEY"] = "test-token";
    process.env["GHL_LOCATION_ID"] = "loc1";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists subscriptions using altId/altType=location", async () => {
    const fetchMock = vi.fn(async (url: string | URL) => {
      const u = new URL(String(url));
      expect(u.pathname).toBe("/payments/subscriptions");
      expect(u.searchParams.get("altId")).toBe("loc1");
      expect(u.searchParams.get("altType")).toBe("location");
      return new Response(
        JSON.stringify({ data: [{ _id: "sub1", contactId: "c1", amount: 19.99, status: "active" }] }),
        { status: 200 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const out = captureStdout();
    const code = await subscriptionsCommand.run(parseArgs([], subscriptionsCommand.spec));
    out.restore();

    expect(code).toBe(0);
    expect(out.lines.join("")).toContain("sub1");
  });

  it("reports a definitive empty state", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ data: [] }), { status: 200 })));
    const out = captureStdout();
    const code = await subscriptionsCommand.run(parseArgs([], subscriptionsCommand.spec));
    out.restore();
    expect(code).toBe(0);
    expect(out.lines.join("")).toContain("0 subscriptions found");
  });
});
