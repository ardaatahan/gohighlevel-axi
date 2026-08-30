import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { calendarsList } from "../../src/commands/calendars.js";
import { GHL_BASE_URL } from "../../src/ghl/client.js";

function parsedFor(flags: Record<string, string | boolean> = {}) {
  return { positionals: [], flags: { fields: "id,name,calendarType", ...flags }, help: false };
}

describe("calendars list command", () => {
  beforeEach(() => {
    process.env["GHL_API_KEY"] = "test-token";
    process.env["GHL_LOCATION_ID"] = "loc1";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists calendars with the default field set and a total count", async () => {
    const fetchImpl = vi.fn(async (url: string | URL) => {
      expect(String(url)).toBe(`${GHL_BASE_URL}/calendars/?locationId=loc1`);
      return new Response(
        JSON.stringify({ calendars: [{ id: "cal1", name: "Sales Calls", calendarType: "round_robin" }] }),
        { status: 200 },
      );
    });
    vi.stubGlobal("fetch", fetchImpl);

    const code = await calendarsList.run(parsedFor());
    expect(code).toBe(0);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("names the searched context on an empty result", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ calendars: [] }), { status: 200 })),
    );
    const printed: string[] = [];
    const spy = vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      printed.push(String(chunk));
      return true;
    });

    await calendarsList.run(parsedFor({ group: "grp1" }));
    spy.mockRestore();

    expect(printed.join("")).toContain("0 calendars found");
    expect(printed.join("")).toContain("grp1");
  });

  it("rejects an unknown --fields column before any network call", async () => {
    const fetchImpl = vi.fn();
    vi.stubGlobal("fetch", fetchImpl);
    await expect(calendarsList.run(parsedFor({ fields: "bogus" }))).rejects.toThrow(/unknown field/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
