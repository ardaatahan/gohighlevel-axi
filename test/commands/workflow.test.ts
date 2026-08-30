import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseArgs } from "../../src/cli/args.js";
import { workflowTriggerCommand } from "../../src/commands/workflow.js";

function captureStdout() {
  const lines: string[] = [];
  const spy = vi.spyOn(process.stdout, "write").mockImplementation((chunk: unknown) => {
    lines.push(String(chunk));
    return true;
  });
  return { lines, restore: () => spy.mockRestore() };
}

describe("workflow trigger command", () => {
  beforeEach(() => {
    process.env["GHL_API_KEY"] = "test-token";
    process.env["GHL_LOCATION_ID"] = "loc1";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("without --confirm makes zero network calls and exits 0", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const out = captureStdout();
    const parsed = parseArgs(["wf1", "--contact", "c1"], workflowTriggerCommand.spec);
    const code = await workflowTriggerCommand.run(parsed);
    out.restore();
    expect(code).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(out.lines.join("")).toContain("dry-run: enroll contact c1 into workflow wf1");
  });

  it("with --confirm calls POST /contacts/{contactId}/workflow/{workflowId} exactly once", async () => {
    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      expect(init?.method).toBe("POST");
      expect(String(url)).toContain("/contacts/c1/workflow/wf1");
      return new Response(JSON.stringify({ succeded: true }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const parsed = parseArgs(["wf1", "--contact", "c1", "--confirm"], workflowTriggerCommand.spec);
    const code = await workflowTriggerCommand.run(parsed);
    expect(code).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("requires --contact before attempting any call", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const parsed = parseArgs(["wf1"], workflowTriggerCommand.spec);
    await expect(workflowTriggerCommand.run(parsed)).rejects.toThrow(/--contact/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
