import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseArgs } from "../../src/cli/args.js";
import { pipelineCommand, pipelinesCommand } from "../../src/commands/pipelines.js";

function captureStdout() {
  const lines: string[] = [];
  const spy = vi.spyOn(process.stdout, "write").mockImplementation((chunk: unknown) => {
    lines.push(String(chunk));
    return true;
  });
  return { lines, restore: () => spy.mockRestore() };
}

const PIPELINES_FIXTURE = {
  pipelines: [
    {
      id: "pipe1",
      name: "Sales",
      stages: [
        { id: "stage1", name: "New", position: 0 },
        { id: "stage2", name: "Won", position: 1 },
      ],
    },
  ],
};

describe("pipelines / pipeline", () => {
  beforeEach(() => {
    process.env["GHL_API_KEY"] = "test-token";
    process.env["GHL_LOCATION_ID"] = "loc1";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("pipelines uses camelCase locationId in the query", async () => {
    const fetchMock = vi.fn(async (url: string | URL) => {
      const u = new URL(String(url));
      expect(u.pathname).toBe("/opportunities/pipelines");
      expect(u.searchParams.get("locationId")).toBe("loc1");
      expect(u.searchParams.has("location_id")).toBe(false);
      return new Response(JSON.stringify(PIPELINES_FIXTURE), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const out = captureStdout();
    const parsed = parseArgs([], pipelinesCommand.spec);
    const code = await pipelinesCommand.run(parsed);
    out.restore();

    expect(code).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(out.lines.join("")).toContain("Sales");
  });

  it("pipelines reports a definitive empty state", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ pipelines: [] }), { status: 200 })));
    const out = captureStdout();
    const code = await pipelinesCommand.run(parseArgs([], pipelinesCommand.spec));
    out.restore();
    expect(code).toBe(0);
    expect(out.lines.join("")).toContain("0 pipelines found");
  });

  it("pipeline <id> shows the full stage list for one pipeline", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(PIPELINES_FIXTURE), { status: 200 })));
    const out = captureStdout();
    const code = await pipelineCommand.run(parseArgs(["pipe1"], pipelineCommand.spec));
    out.restore();
    expect(code).toBe(0);
    const output = out.lines.join("");
    expect(output).toContain("Sales");
    expect(output).toContain("stage1");
    expect(output).toContain("stage2");
  });
});
