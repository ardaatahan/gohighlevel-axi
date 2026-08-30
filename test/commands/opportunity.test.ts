import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseArgs } from "../../src/cli/args.js";
import { opportunityGetCommand, opportunityMoveCommand } from "../../src/commands/opportunity.js";

function captureStdout() {
  const lines: string[] = [];
  const spy = vi.spyOn(process.stdout, "write").mockImplementation((chunk: unknown) => {
    lines.push(String(chunk));
    return true;
  });
  return { lines, restore: () => spy.mockRestore() };
}

describe("opportunity detail/move", () => {
  beforeEach(() => {
    process.env["GHL_API_KEY"] = "test-token";
    process.env["GHL_LOCATION_ID"] = "loc1";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("opportunity <id> prints detail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL) => {
        expect(String(url)).toContain("/opportunities/opp1");
        return new Response(
          JSON.stringify({ opportunity: { id: "opp1", name: "Big Deal", status: "open", pipelineStageId: "stage1" } }),
          { status: 200 },
        );
      }),
    );
    const out = captureStdout();
    const code = await opportunityGetCommand.run(parseArgs(["opp1"], opportunityGetCommand.spec));
    out.restore();
    expect(code).toBe(0);
    expect(out.lines.join("")).toContain("Big Deal");
  });

  it("opportunity move without --confirm makes no network call and exits 0", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const out = captureStdout();
    const parsed = parseArgs(["opp1", "--stage", "stage2"], opportunityMoveCommand.spec);
    const code = await opportunityMoveCommand.run(parsed);
    out.restore();
    expect(code).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(out.lines.join("")).toContain("dry-run:");
    expect(out.lines.join("")).toContain("--confirm");
  });

  it("opportunity move with --confirm calls PUT /opportunities/{id} with pipelineStageId", async () => {
    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      expect(init?.method).toBe("PUT");
      expect(String(url)).toContain("/opportunities/opp1");
      const body = JSON.parse(String(init?.body));
      expect(body).toEqual({ pipelineStageId: "stage2" });
      return new Response(JSON.stringify({ opportunity: { id: "opp1", pipelineStageId: "stage2" } }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const parsed = parseArgs(["opp1", "--stage", "stage2", "--confirm"], opportunityMoveCommand.spec);
    const code = await opportunityMoveCommand.run(parsed);
    expect(code).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("opportunity move requires --stage even with --confirm, and makes no network call without it", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const parsed = parseArgs(["opp1", "--confirm"], opportunityMoveCommand.spec);
    await expect(opportunityMoveCommand.run(parsed)).rejects.toThrow(/--stage/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
