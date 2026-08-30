// Safety gating for every send/trigger/payment/destructive command (the
// project's central design constraint). Absent --confirm, a gated command
// prints exactly what it would do and returns without making any network
// call. Read-only commands never go through this module.

import { emitBlock } from "../output/toon.js";
import { helpBlock } from "../output/suggest.js";
import { print } from "../output/toon.js";

export interface GatedRequest {
  /** HTTP method the confirmed call will use. */
  method: string;
  /** API path the confirmed call will hit. */
  path: string;
  /** One-line human description of the effect, e.g. "send SMS to contact abc123". */
  summary: string;
  /** Request body fields that will be sent, shown verbatim (never secrets). */
  payload?: Record<string, unknown>;
  /** The exact command to re-run with --confirm added. */
  confirmExample: string;
}

/** Renders the dry-run report. Call this and return 0 when --confirm is absent. */
export function renderDryRun(req: GatedRequest): string {
  const parts: string[] = [`dry-run: ${req.summary}`, `would-call: ${req.method} ${req.path}`];
  const payloadEntries = Object.entries(req.payload ?? {});
  if (payloadEntries.length > 0) {
    parts.push(
      emitBlock(
        "payload",
        payloadEntries.map(([key, value]) => `${key}: ${JSON.stringify(value)}`),
      ),
    );
  }
  parts.push(helpBlock([req.confirmExample]));
  return parts.join("\n");
}

/** True when the caller passed --confirm. Centralized so the flag name never drifts. */
export function isConfirmed(flags: Record<string, string | boolean>): boolean {
  return flags["confirm"] === true;
}

/** Prints the dry-run report for a gated request. */
export function printDryRun(req: GatedRequest): void {
  print(renderDryRun(req));
}

export const CONFIRM_FLAG = {
  name: "confirm",
  type: "boolean" as const,
  description: "actually perform this action (without it, prints a dry-run and makes no network call)",
};
