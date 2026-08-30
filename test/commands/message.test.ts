import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseArgs } from "../../src/cli/args.js";
import { messageSendCommand } from "../../src/commands/message.js";

function captureStdout() {
  const lines: string[] = [];
  const spy = vi.spyOn(process.stdout, "write").mockImplementation((chunk: unknown) => {
    lines.push(String(chunk));
    return true;
  });
  return { lines, restore: () => spy.mockRestore() };
}

describe("message send (SAFETY-GATED: sends a real SMS/email)", () => {
  beforeEach(() => {
    process.env["GHL_API_KEY"] = "test-token";
    process.env["GHL_LOCATION_ID"] = "loc1";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("without --confirm makes ZERO network calls, exits 0, and prints the exact would-be call", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const out = captureStdout();
    const parsed = parseArgs(["--contact", "c1", "--body", "hello there"], messageSendCommand.spec);
    const code = await messageSendCommand.run(parsed);
    out.restore();

    expect(code).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
    const output = out.lines.join("");
    expect(output).toContain("dry-run:");
    expect(output).toContain("POST /conversations/messages");
    expect(output).toContain("c1");
    expect(output).toContain("hello there");
    expect(output).toContain("--confirm");
  });

  it("with --confirm calls POST /conversations/messages exactly once with the right body", async () => {
    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      expect(String(url)).toContain("/conversations/messages");
      expect(init?.method).toBe("POST");
      const body = JSON.parse(String(init?.body));
      expect(body).toEqual({ contactId: "c1", type: "SMS", message: "hello there" });
      return new Response(JSON.stringify({ messageId: "m1", conversationId: "co1" }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const parsed = parseArgs(["--contact", "c1", "--body", "hello there", "--confirm"], messageSendCommand.spec);
    const code = await messageSendCommand.run(parsed);

    expect(code).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("includes subject in the payload for --type Email", async () => {
    const fetchMock = vi.fn(async (_url: string | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body).toEqual({ contactId: "c1", type: "Email", message: "see attached", subject: "Update" });
      return new Response(JSON.stringify({}), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const parsed = parseArgs(
      ["--contact", "c1", "--type", "Email", "--subject", "Update", "--body", "see attached", "--confirm"],
      messageSendCommand.spec,
    );
    await messageSendCommand.run(parsed);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects an invalid --type value before any network call", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(() => parseArgs(["--contact", "c1", "--body", "hi", "--type", "Fax"], messageSendCommand.spec)).toThrow(
      /invalid value/,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("missing --contact fails with a UsageError before any network call, even with --confirm", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const parsed = parseArgs(["--body", "hi", "--confirm"], messageSendCommand.spec);
    await expect(messageSendCommand.run(parsed)).rejects.toThrow(/--contact/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("missing --body fails with a UsageError before any network call, even with --confirm", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const parsed = parseArgs(["--contact", "c1", "--confirm"], messageSendCommand.spec);
    await expect(messageSendCommand.run(parsed)).rejects.toThrow(/--body/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
