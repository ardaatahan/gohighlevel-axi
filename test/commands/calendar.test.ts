import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { calendarGet } from "../../src/commands/calendar.js";
import { GHL_BASE_URL } from "../../src/ghl/client.js";

describe("calendar detail command", () => {
  beforeEach(() => {
    process.env["GHL_API_KEY"] = "test-token";
    process.env["GHL_LOCATION_ID"] = "loc1";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches a calendar by id and prints its fields", async () => {
    const fetchImpl = vi.fn(async (url: string | URL) => {
      expect(String(url)).toBe(`${GHL_BASE_URL}/calendars/cal123`);
      return new Response(JSON.stringify({ calendar: { id: "cal123", name: "Sales Calls" } }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchImpl);

    const code = await calendarGet.run({ positionals: ["cal123"], flags: {}, help: false });
    expect(code).toBe(0);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("handles an unwrapped calendar object response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ id: "cal999", name: "Support" }), { status: 200 })),
    );
    const code = await calendarGet.run({ positionals: ["cal999"], flags: {}, help: false });
    expect(code).toBe(0);
  });
});
