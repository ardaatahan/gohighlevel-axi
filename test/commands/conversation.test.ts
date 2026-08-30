import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseArgs } from "../../src/cli/args.js";
import { conversationCommand } from "../../src/commands/conversation.js";

function captureStdout() {
  const lines: string[] = [];
  const spy = vi.spyOn(process.stdout, "write").mockImplementation((chunk: unknown) => {
    lines.push(String(chunk));
    return true;
  });
  return { lines, restore: () => spy.mockRestore() };
}

describe("conversation detail", () => {
  beforeEach(() => {
    process.env["GHL_API_KEY"] = "test-token";
    process.env["GHL_LOCATION_ID"] = "loc1";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows conversation metadata and recent messages", async () => {
    const fetchMock = vi.fn(async (url: string | URL) => {
      const u = String(url);
      if (u.includes("/messages")) {
        return new Response(
          JSON.stringify({
            messages: {
              messages: [
                { id: "m1", type: "SMS", direction: "inbound", body: "hello", dateAdded: "2026-01-01" },
              ],
            },
          }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({ id: "co1", contactId: "c1", status: "open" }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const out = captureStdout();
    const parsed = parseArgs(["co1"], conversationCommand.spec);
    const code = await conversationCommand.run(parsed);
    out.restore();

    expect(code).toBe(0);
    const output = out.lines.join("");
    expect(output).toContain("co1");
    expect(output).toContain("hello");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("truncates a long message body and shows a --full hint only when actually cut", async () => {
    const longBody = "x".repeat(2000);
    const fetchMock = vi.fn(async (url: string | URL) => {
      if (String(url).includes("/messages")) {
        return new Response(
          JSON.stringify({ messages: { messages: [{ id: "m1", body: longBody, dateAdded: "2026-01-01" }] } }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({ id: "co1" }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const out = captureStdout();
    const parsed = parseArgs(["co1"], conversationCommand.spec);
    await conversationCommand.run(parsed);
    out.restore();

    const output = out.lines.join("");
    expect(output).toContain("truncated");
    expect(output).toContain("conversation co1 --full");
  });

  it("handles zero messages with a definitive empty state", async () => {
    const fetchMock = vi.fn(async (url: string | URL) => {
      if (String(url).includes("/messages")) {
        return new Response(JSON.stringify({ messages: { messages: [] } }), { status: 200 });
      }
      return new Response(JSON.stringify({ id: "co1" }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const out = captureStdout();
    const parsed = parseArgs(["co1"], conversationCommand.spec);
    const code = await conversationCommand.run(parsed);
    out.restore();

    expect(code).toBe(0);
    expect(out.lines.join("")).toContain("0 messages found for conversation co1");
  });
});
