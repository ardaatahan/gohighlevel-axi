import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("ghl/config", () => {
  const originalApiKey = process.env["GHL_API_KEY"];
  const originalLocationId = process.env["GHL_LOCATION_ID"];
  const originalHome = process.env["HOME"];

  beforeEach(() => {
    vi.resetModules();
    delete process.env["GHL_API_KEY"];
    delete process.env["GHL_LOCATION_ID"];
  });

  afterEach(() => {
    if (originalApiKey === undefined) delete process.env["GHL_API_KEY"];
    else process.env["GHL_API_KEY"] = originalApiKey;
    if (originalLocationId === undefined) delete process.env["GHL_LOCATION_ID"];
    else process.env["GHL_LOCATION_ID"] = originalLocationId;
    if (originalHome === undefined) delete process.env["HOME"];
    else process.env["HOME"] = originalHome;
  });

  it("prefers GHL_API_KEY over the credentials file", async () => {
    process.env["GHL_API_KEY"] = "env-token";
    const { findApiKey } = await import("../../src/ghl/config.js");
    expect(findApiKey()).toBe("env-token");
  });

  it("falls back to the credentials file when the env var is unset", async () => {
    const home = mkdtempSync(join(tmpdir(), "ghl-axi-"));
    mkdirSync(join(home, ".config", "gohighlevel-axi"), { recursive: true });
    writeFileSync(join(home, ".config", "gohighlevel-axi", "credentials"), "# comment\ntoken = file-token\n");
    process.env["HOME"] = home;
    const { findApiKey } = await import("../../src/ghl/config.js");
    expect(findApiKey()).toBe("file-token");
  });

  it("returns undefined when neither source is set", async () => {
    const home = mkdtempSync(join(tmpdir(), "ghl-axi-empty-"));
    process.env["HOME"] = home;
    const { findApiKey } = await import("../../src/ghl/config.js");
    expect(findApiKey()).toBeUndefined();
  });

  it("requireApiKey throws a structured, non-crashing error naming what to set", async () => {
    const home = mkdtempSync(join(tmpdir(), "ghl-axi-empty2-"));
    process.env["HOME"] = home;
    vi.resetModules();
    const { requireApiKey, MissingCredentialError } = await import("../../src/ghl/config.js");
    let caught: unknown;
    try {
      requireApiKey();
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(MissingCredentialError);
    expect((caught as Error).message).not.toMatch(/undefined|null/);
    expect((caught as { suggestion?: string }).suggestion).toContain("GHL_API_KEY");
  });

  it("resolves locationId from GHL_LOCATION_ID or the credentials file, independently of the token", async () => {
    process.env["GHL_LOCATION_ID"] = "loc-env";
    const { findLocationId } = await import("../../src/ghl/config.js");
    expect(findLocationId()).toBe("loc-env");
  });

  it("requireLocationId throws a structured error distinct from the missing-token error", async () => {
    const home = mkdtempSync(join(tmpdir(), "ghl-axi-noloc-"));
    process.env["HOME"] = home;
    const { requireLocationId, MissingLocationError } = await import("../../src/ghl/config.js");
    expect(() => requireLocationId()).toThrow(MissingLocationError);
  });
});
