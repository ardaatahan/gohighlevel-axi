import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseArgs } from "../../src/cli/args.js";
import { conversationsCommand } from "../../src/commands/conversations.js";

function captureStdout() {
  const lines: string[] = [];
  const spy = vi.spyOn(process.stdout, "write").mockImplementation((chunk: unknown) => {
    lines.push(String(chunk));
    return true;
  });
  return { lines, restore: () => spy.mockRestore() };
}

describe("conversations list", () => {
  beforeEach(() => {
    process.env["GHL_API_KEY"] = "test-token";
    process.env["GHL_LOCATION_ID"] = "loc1";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists conversations with default columns and a total-count aggregate", async () => {
    const fetchMock = vi.fn(async (url: string | URL) => {
      expect(String(url)).toContain("/conversations/search");
      expect(String(url)).toContain("locationId=loc1");
      return new Response(
        JSON.stringify({
          conversations: [
            { id: "co1", contactId: "c1", fullName: "Jane Doe", lastMessageBody: "hi there", lastMessageDate: "2026-01-01" },
          ],
          total: 5,
        }),
        { status: 200 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const out = captureStdout();
    const parsed = parseArgs([], conversationsCommand.spec);
    const code = await conversationsCommand.run(parsed);
    out.restore();

    expect(code).toBe(0);
    const output = out.lines.join("");
    expect(output).toContain("1 of 5 total");
    expect(output).toContain("Jane Doe");
    expect(output).toContain("hi there");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("filters by --contact and passes it through as a query param", async () => {
    const fetchMock = vi.fn(async (url: string | URL) => {
      expect(String(url)).toContain("contactId=c1");
      return new Response(JSON.stringify({ conversations: [] }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const parsed = parseArgs(["--contact", "c1"], conversationsCommand.spec);
    await conversationsCommand.run(parsed);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("names the active filters in the empty state instead of printing nothing", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ conversations: [] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const out = captureStdout();
    const parsed = parseArgs(["--status", "unread"], conversationsCommand.spec);
    const code = await conversationsCommand.run(parsed);
    out.restore();

    expect(code).toBe(0);
    const output = out.lines.join("");
    expect(output).toContain("0 results found");
    expect(output).toContain("status=unread");
  });

  it("rejects an unknown --fields column before making any network call", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const parsed = parseArgs(["--fields", "bogus"], conversationsCommand.spec);
    await expect(conversationsCommand.run(parsed)).rejects.toThrow(/unknown field/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
