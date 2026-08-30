import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseArgs } from "../../src/cli/args.js";
import { opportunitiesCommand } from "../../src/commands/opportunities.js";

function captureStdout() {
  const lines: string[] = [];
  const spy = vi.spyOn(process.stdout, "write").mockImplementation((chunk: unknown) => {
    lines.push(String(chunk));
    return true;
  });
  return { lines, restore: () => spy.mockRestore() };
}

describe("opportunities", () => {
  beforeEach(() => {
    process.env["GHL_API_KEY"] = "test-token";
    process.env["GHL_LOCATION_ID"] = "loc1";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses snake_case query params for /opportunities/search, not camelCase", async () => {
    const fetchMock = vi.fn(async (url: string | URL) => {
      const u = new URL(String(url));
      expect(u.pathname).toBe("/opportunities/search");
      expect(u.searchParams.get("location_id")).toBe("loc1");
      expect(u.searchParams.get("pipeline_id")).toBe("pipe1");
      expect(u.searchParams.get("pipeline_stage_id")).toBe("stage1");
      expect(u.searchParams.get("contact_id")).toBe("c1");
      expect(u.searchParams.has("locationId")).toBe(false);
      expect(u.searchParams.has("pipelineId")).toBe(false);
      return new Response(
        JSON.stringify({ opportunities: [{ id: "opp1", name: "Big Deal", status: "open", monetaryValue: 500 }] }),
        { status: 200 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const out = captureStdout();
    const parsed = parseArgs(
      ["--pipeline", "pipe1", "--stage", "stage1", "--contact", "c1"],
      opportunitiesCommand.spec,
    );
    const code = await opportunitiesCommand.run(parsed);
    out.restore();

    expect(code).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(out.lines.join("")).toContain("Big Deal");
  });

  it("reports a definitive empty state naming the active filters", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ opportunities: [] }), { status: 200 })),
    );
    const out = captureStdout();
    const parsed = parseArgs(["--status", "won"], opportunitiesCommand.spec);
    const code = await opportunitiesCommand.run(parsed);
    out.restore();
    expect(code).toBe(0);
    const output = out.lines.join("");
    expect(output).toContain("0 opportunities found");
    expect(output).toContain("status=won");
  });

  it("includes the total count aggregate when the API provides meta.total", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              opportunities: [{ id: "opp1", name: "Deal", status: "open", monetaryValue: 10 }],
              meta: { total: 42 },
            }),
            { status: 200 },
          ),
      ),
    );
    const out = captureStdout();
    const code = await opportunitiesCommand.run(parseArgs([], opportunitiesCommand.spec));
    out.restore();
    expect(code).toBe(0);
    expect(out.lines.join("")).toContain("42 total");
  });

  it("rejects an unknown --fields column with a usage error and no network call", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const parsed = parseArgs(["--fields", "bogus"], opportunitiesCommand.spec);
    await expect(opportunitiesCommand.run(parsed)).rejects.toThrow(/unknown field/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
