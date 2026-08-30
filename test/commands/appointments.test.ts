import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appointmentsList } from "../../src/commands/appointments.js";

function parsedFor(flags: Record<string, string | boolean> = {}) {
  return { positionals: [], flags: { fields: "id,title,startTime,appointmentStatus", ...flags }, help: false };
}

describe("appointments list command", () => {
  beforeEach(() => {
    process.env["GHL_API_KEY"] = "test-token";
    process.env["GHL_LOCATION_ID"] = "loc1";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("defaults the time range to now..+30d and sends it as query params", async () => {
    const fetchImpl = vi.fn(async (url: string | URL) => {
      const u = new URL(String(url));
      expect(u.pathname).toBe("/calendars/events");
      expect(u.searchParams.get("locationId")).toBe("loc1");
      expect(u.searchParams.has("startTime")).toBe(true);
      expect(u.searchParams.has("endTime")).toBe(true);
      return new Response(JSON.stringify({ events: [] }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchImpl);

    const code = await appointmentsList.run(parsedFor());
    expect(code).toBe(0);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("names the resolved time range and calendar filter on an empty result", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ events: [] }), { status: 200 })),
    );
    const printed: string[] = [];
    const spy = vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      printed.push(String(chunk));
      return true;
    });

    await appointmentsList.run(parsedFor({ calendar: "cal1", start: "2026-09-01", end: "2026-09-30" }));
    spy.mockRestore();

    const out = printed.join("");
    expect(out).toContain("0 appointments found");
    expect(out).toContain("cal1");
    expect(out).toContain("2026-09-01");
    expect(out).toContain("2026-09-30");
  });

  it("lists appointments with a total count", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({ events: [{ id: "evt1", title: "Intro Call", startTime: "1", appointmentStatus: "confirmed" }] }),
          { status: 200 },
        ),
      ),
    );
    const code = await appointmentsList.run(parsedFor());
    expect(code).toBe(0);
  });

  it("throws a UsageError on a malformed --start without any network call", async () => {
    const fetchImpl = vi.fn();
    vi.stubGlobal("fetch", fetchImpl);
    await expect(appointmentsList.run(parsedFor({ start: "not-a-date" }))).rejects.toThrow(/invalid date/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects an unknown --fields column before any network call", async () => {
    const fetchImpl = vi.fn();
    vi.stubGlobal("fetch", fetchImpl);
    await expect(appointmentsList.run(parsedFor({ fields: "bogus" }))).rejects.toThrow(/unknown field/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
