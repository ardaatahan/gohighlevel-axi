import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GHL_API_VERSIONS, GHL_BASE_URL, GhlApiError, ghlRequest } from "../../src/ghl/client.js";

describe("ghlRequest", () => {
  beforeEach(() => {
    process.env["GHL_API_KEY"] = "test-token";
  });

  it("sends the bearer token, Version header, and builds the query string", async () => {
    const fetchImpl = vi.fn(async (url: string | URL, init?: RequestInit) => {
      expect(String(url)).toBe(`${GHL_BASE_URL}/contacts/?locationId=loc1`);
      const headers = init?.headers as Record<string, string>;
      expect(headers["Authorization"]).toBe("Bearer test-token");
      expect(headers["Version"]).toBe(GHL_API_VERSIONS.contacts);
      return new Response(JSON.stringify({ contacts: [] }), { status: 200 });
    });

    const result = await ghlRequest({
      method: "GET",
      path: "/contacts/",
      resource: "contacts",
      query: { locationId: "loc1" },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result).toEqual({ contacts: [] });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("uses the calendars/conversations Version date, distinct from contacts", async () => {
    const fetchImpl = vi.fn(async (_url: string | URL, init?: RequestInit) => {
      const headers = init?.headers as Record<string, string>;
      expect(headers["Version"]).toBe(GHL_API_VERSIONS.calendars);
      expect(headers["Version"]).not.toBe(GHL_API_VERSIONS.contacts);
      return new Response(JSON.stringify({}), { status: 200 });
    });
    await ghlRequest({
      method: "GET",
      path: "/calendars/",
      resource: "calendars",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
  });

  it("never leaks the token into the thrown error message", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ message: "invalid contact id" }), { status: 404 }),
    );
    await expect(
      ghlRequest({ method: "GET", path: "/contacts/bad", resource: "contacts", fetchImpl: fetchImpl as unknown as typeof fetch }),
    ).rejects.toThrow("invalid contact id");
  });

  it("throws GhlApiError carrying the HTTP status", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ message: "nope" }), { status: 403 }));
    try {
      await ghlRequest({ method: "GET", path: "/x", resource: "contacts", fetchImpl: fetchImpl as unknown as typeof fetch });
      expect.unreachable("expected ghlRequest to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(GhlApiError);
      expect((err as GhlApiError).status).toBe(403);
      expect((err as GhlApiError).suggestion).toMatch(/Private Integration Token/);
    }
  });

  it("retries once on 429 honoring Retry-After, then returns the successful response", async () => {
    let calls = 0;
    const fetchImpl = vi.fn(async () => {
      calls++;
      if (calls === 1) {
        return new Response("", { status: 429, headers: { "Retry-After": "0" } });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    const sleepImpl = vi.fn(async () => undefined);

    const result = await ghlRequest({
      method: "GET",
      path: "/contacts",
      resource: "contacts",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleepImpl,
    });

    expect(calls).toBe(2);
    expect(sleepImpl).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ ok: true });
  });

  it("gives up after repeated 429s and surfaces a GhlApiError", async () => {
    const fetchImpl = vi.fn(async () => new Response("", { status: 429, headers: { "Retry-After": "0" } }));
    const sleepImpl = vi.fn(async () => undefined);

    await expect(
      ghlRequest({
        method: "GET",
        path: "/contacts",
        resource: "contacts",
        fetchImpl: fetchImpl as unknown as typeof fetch,
        sleepImpl,
      }),
    ).rejects.toBeInstanceOf(GhlApiError);
  });

  it("never calls fetch when no API key is configured", async () => {
    delete process.env["GHL_API_KEY"];
    process.env["HOME"] = mkdtempSync(join(tmpdir(), "ghl-axi-client-nokey-"));
    const fetchImpl = vi.fn();

    await expect(
      ghlRequest({ method: "GET", path: "/contacts", resource: "contacts", fetchImpl: fetchImpl as unknown as typeof fetch }),
    ).rejects.toThrow();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
