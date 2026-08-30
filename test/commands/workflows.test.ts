import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseArgs } from "../../src/cli/args.js";
import { workflowsCommand } from "../../src/commands/workflows.js";

function captureStdout() {
  const lines: string[] = [];
  const spy = vi.spyOn(process.stdout, "write").mockImplementation((chunk: unknown) => {
    lines.push(String(chunk));
    return true;
  });
  return { lines, restore: () => spy.mockRestore() };
}

describe("workflows command", () => {
  beforeEach(() => {
    process.env["GHL_API_KEY"] = "test-token";
    process.env["GHL_LOCATION_ID"] = "loc1";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists workflows read-only", async () => {
    const fetchMock = vi.fn(async (url: string | URL) => {
      expect(String(url)).toContain("/workflows/?locationId=loc1");
      return new Response(
        JSON.stringify({ workflows: [{ id: "wf1", name: "Welcome Series", status: "published" }] }),
        { status: 200 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const out = captureStdout();
    const parsed = parseArgs([], workflowsCommand.spec);
    const code = await workflowsCommand.run(parsed);
    out.restore();

    expect(code).toBe(0);
    expect(out.lines.join("")).toContain("Welcome Series");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("shows a definitive empty state", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ workflows: [] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const out = captureStdout();
    const code = await workflowsCommand.run(parseArgs([], workflowsCommand.spec));
    out.restore();
    expect(code).toBe(0);
    expect(out.lines.join("")).toContain("0 workflows found");
  });
});
