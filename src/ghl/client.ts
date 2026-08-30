// Single centralized HTTP client for the GoHighLevel v2 API. Every command
// that talks to the network goes through `ghlRequest` so the base URL, the
// required `Version` header, auth, and 429 backoff live in exactly one place.

import { AxiError } from "../output/errors.js";
import { requireApiKey } from "./config.js";

export const GHL_BASE_URL = "https://services.leadconnectorhq.com";

// GoHighLevel v2 requires a dated `Version` header on every request,
// independent of auth. The dated value is NOT uniform across the API - each
// resource group documents its own version - so this map is the single
// source of truth: bump an entry here when GHL ships a newer documented
// version for that group. See README "Version header" section.
export type GhlResourceGroup =
  | "contacts"
  | "conversations"
  | "calendars"
  | "opportunities"
  | "payments"
  | "workflows";

export const GHL_API_VERSIONS: Record<GhlResourceGroup, string> = {
  contacts: "2021-07-28",
  opportunities: "2021-07-28",
  workflows: "2021-07-28",
  payments: "2021-07-28",
  calendars: "2021-04-15",
  conversations: "2021-04-15",
};

const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 500;

export class GhlApiError extends AxiError {
  status: number;

  constructor(status: number, message: string, suggestion?: string) {
    super(message, suggestion);
    this.status = status;
    this.exitCode = 1;
  }
}

export interface GhlRequestOptions {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  /** Selects which entry of GHL_API_VERSIONS is sent as the Version header. */
  resource: GhlResourceGroup;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  /** Injected for tests; defaults to the global fetch. */
  fetchImpl?: typeof fetch;
  /** Injected for tests; defaults to a real delay. */
  sleepImpl?: (ms: number) => Promise<void>;
}

function buildUrl(path: string, query?: GhlRequestOptions["query"]): string {
  const url = new URL(path, GHL_BASE_URL);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Performs one GoHighLevel API call. Retries on HTTP 429 with backoff
 * (honoring `Retry-After` when present) up to MAX_RETRIES times.
 *
 * The bearer token is read fresh from config on each call and is never
 * included in thrown error messages.
 */
export async function ghlRequest<T = unknown>(opts: GhlRequestOptions): Promise<T> {
  const token = requireApiKey();
  const fetchImpl = opts.fetchImpl ?? fetch;
  const sleep = opts.sleepImpl ?? defaultSleep;
  const url = buildUrl(opts.path, opts.query);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Version: GHL_API_VERSIONS[opts.resource],
    Accept: "application/json",
  };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";

  let attempt = 0;
  for (;;) {
    const res = await fetchImpl(url, {
      method: opts.method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });

    if (res.status === 429 && attempt < MAX_RETRIES) {
      const retryAfterHeader = res.headers.get("Retry-After");
      const retryAfterMs = retryAfterHeader
        ? Number(retryAfterHeader) * 1000
        : BASE_BACKOFF_MS * 2 ** attempt;
      await sleep(Number.isFinite(retryAfterMs) ? retryAfterMs : BASE_BACKOFF_MS);
      attempt++;
      continue;
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      let message = `GoHighLevel API returned ${res.status} for ${opts.method} ${opts.path}`;
      try {
        const parsed = JSON.parse(text) as { message?: string | string[] };
        if (Array.isArray(parsed.message)) message = parsed.message.join("; ");
        else if (parsed.message) message = parsed.message;
      } catch {
        // leave the default message
      }
      throw new GhlApiError(
        res.status,
        message,
        res.status === 401 || res.status === 403
          ? "check that GHL_API_KEY is a valid Private Integration Token with the required scopes"
          : undefined,
      );
    }

    if (res.status === 204) return undefined as T;
    const text = await res.text();
    return text ? (JSON.parse(text) as T) : (undefined as T);
  }
}
