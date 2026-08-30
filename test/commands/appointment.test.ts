import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appointmentBook, appointmentCancel, appointmentGet } from "../../src/commands/appointment.js";
import { GHL_BASE_URL } from "../../src/ghl/client.js";

describe("appointment detail command", () => {
  beforeEach(() => {
    process.env["GHL_API_KEY"] = "test-token";
    process.env["GHL_LOCATION_ID"] = "loc1";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches an appointment by id", async () => {
    const fetchImpl = vi.fn(async (url: string | URL) => {
      expect(String(url)).toBe(`${GHL_BASE_URL}/calendars/events/appointments/evt123`);
      return new Response(JSON.stringify({ appointment: { id: "evt123", title: "Intro Call" } }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchImpl);

    const code = await appointmentGet.run({ positionals: ["evt123"], flags: {}, help: false });
    expect(code).toBe(0);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe("appointment book command (gated)", () => {
  beforeEach(() => {
    process.env["GHL_API_KEY"] = "test-token";
    process.env["GHL_LOCATION_ID"] = "loc1";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const baseFlags = {
    calendar: "cal123",
    contact: "ct456",
    start: "2026-09-10T15:00:00Z",
  };

  it("without --confirm: makes zero network calls, exits 0, and prints a dry-run", async () => {
    const fetchImpl = vi.fn();
    vi.stubGlobal("fetch", fetchImpl);
    const printed: string[] = [];
    const spy = vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      printed.push(String(chunk));
      return true;
    });

    const code = await appointmentBook.run({ positionals: [], flags: { ...baseFlags }, help: false });
    spy.mockRestore();

    expect(code).toBe(0);
    expect(fetchImpl).not.toHaveBeenCalled();
    const out = printed.join("");
    expect(out).toContain("dry-run:");
    expect(out).toContain("POST /calendars/events/appointments");
    expect(out).toContain("cal123");
    expect(out).toContain("--confirm");
  });

  it("with --confirm: calls POST exactly once with the correct body", async () => {
    const fetchImpl = vi.fn(async (url: string | URL, init?: RequestInit) => {
      expect(String(url)).toBe(`${GHL_BASE_URL}/calendars/events/appointments`);
      expect(init?.method).toBe("POST");
      const body = JSON.parse(String(init?.body));
      expect(body).toMatchObject({
        calendarId: "cal123",
        locationId: "loc1",
        contactId: "ct456",
      });
      return new Response(JSON.stringify({ id: "evt999" }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchImpl);

    const code = await appointmentBook.run({ positionals: [], flags: { ...baseFlags, confirm: true }, help: false });
    expect(code).toBe(0);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("fails fast with a UsageError when --calendar is missing, even with --confirm", async () => {
    const fetchImpl = vi.fn();
    vi.stubGlobal("fetch", fetchImpl);
    await expect(
      appointmentBook.run({
        positionals: [],
        flags: { contact: "ct456", start: "2026-09-10T15:00:00Z", confirm: true },
        help: false,
      }),
    ).rejects.toThrow(/--calendar/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("fails fast with a UsageError when --contact is missing, even with --confirm", async () => {
    const fetchImpl = vi.fn();
    vi.stubGlobal("fetch", fetchImpl);
    await expect(
      appointmentBook.run({
        positionals: [],
        flags: { calendar: "cal123", start: "2026-09-10T15:00:00Z", confirm: true },
        help: false,
      }),
    ).rejects.toThrow(/--contact/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects a malformed --start before any network call", async () => {
    const fetchImpl = vi.fn();
    vi.stubGlobal("fetch", fetchImpl);
    await expect(
      appointmentBook.run({
        positionals: [],
        flags: { ...baseFlags, start: "not-a-date", confirm: true },
        help: false,
      }),
    ).rejects.toThrow(/invalid date/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("appointment cancel command (gated)", () => {
  beforeEach(() => {
    process.env["GHL_API_KEY"] = "test-token";
    process.env["GHL_LOCATION_ID"] = "loc1";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("without --confirm: makes zero network calls and exits 0 with a dry-run", async () => {
    const fetchImpl = vi.fn();
    vi.stubGlobal("fetch", fetchImpl);
    const printed: string[] = [];
    const spy = vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      printed.push(String(chunk));
      return true;
    });

    const code = await appointmentCancel.run({ positionals: ["evt123"], flags: {}, help: false });
    spy.mockRestore();

    expect(code).toBe(0);
    expect(fetchImpl).not.toHaveBeenCalled();
    const out = printed.join("");
    expect(out).toContain("dry-run:");
    expect(out).toContain("DELETE /calendars/events/evt123");
  });

  it("with --confirm: calls DELETE exactly once on the right path", async () => {
    const fetchImpl = vi.fn(async (url: string | URL, init?: RequestInit) => {
      expect(String(url)).toBe(`${GHL_BASE_URL}/calendars/events/evt123`);
      expect(init?.method).toBe("DELETE");
      return new Response(null, { status: 204 });
    });
    vi.stubGlobal("fetch", fetchImpl);

    const code = await appointmentCancel.run({ positionals: ["evt123"], flags: { confirm: true }, help: false });
    expect(code).toBe(0);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
