// Credential resolution for the GoHighLevel Private Integration Token (PIT)
// and the sub-account locationId most endpoints require alongside it.
// Precedence for each: an env var first, then a matching `key = value` line
// in ~/.config/gohighlevel-axi/credentials. The token is never logged or
// echoed.

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { AxiError } from "../output/errors.js";

// Computed fresh on each call (not cached at import time) so it always
// reflects the current $HOME - relevant for tests and for long-lived
// processes that might see HOME change.
export function credentialsPath(): string {
  return join(homedir(), ".config", "gohighlevel-axi", "credentials");
}

export class MissingCredentialError extends AxiError {
  constructor() {
    super(
      "no GoHighLevel API key found",
      `set GHL_API_KEY, or write 'token = <your-token>' to ${credentialsPath()}. ` +
        "Create a Private Integration Token in your GHL sub-account: Settings -> Private Integrations -> Create New Integration.",
    );
  }
}

export class MissingLocationError extends AxiError {
  constructor() {
    super(
      "no GoHighLevel location id found",
      `set GHL_LOCATION_ID, or write 'location_id = <id>' to ${credentialsPath()}. ` +
        "The location id (sub-account id) is shown in Settings -> Business Profile of the sub-account that issued your Private Integration Token.",
    );
  }
}

function readCredentialsKey(key: string): string | undefined {
  let raw: string;
  try {
    raw = readFileSync(credentialsPath(), "utf8");
  } catch {
    return undefined;
  }
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const lineKey = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (lineKey === key && value) return value;
  }
  return undefined;
}

/** Returns the configured token, or undefined if none is set (never throws). */
export function findApiKey(): string | undefined {
  const fromEnv = process.env["GHL_API_KEY"]?.trim();
  if (fromEnv) return fromEnv;
  return readCredentialsKey("token");
}

/** Returns the configured token, or throws a structured MissingCredentialError. */
export function requireApiKey(): string {
  const key = findApiKey();
  if (!key) throw new MissingCredentialError();
  return key;
}

export function hasApiKey(): boolean {
  return findApiKey() !== undefined;
}

/** Returns the configured locationId, or undefined if none is set (never throws). */
export function findLocationId(): string | undefined {
  const fromEnv = process.env["GHL_LOCATION_ID"]?.trim();
  if (fromEnv) return fromEnv;
  return readCredentialsKey("location_id");
}

/** Returns the configured locationId, or throws a structured MissingLocationError. */
export function requireLocationId(): string {
  const id = findLocationId();
  if (!id) throw new MissingLocationError();
  return id;
}
