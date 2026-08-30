// Shared date-flag parsing for calendar/appointment commands: accepts an
// ISO-8601 string or a bare epoch-ms number and normalizes to the epoch-ms
// string GoHighLevel's calendar endpoints require.

import { UsageError } from "../output/errors.js";

export function parseDateFlag(flagName: string, value: string): string {
  const ms = new Date(value).getTime();
  if (Number.isNaN(ms)) {
    throw new UsageError(
      `invalid date '${value}' for --${flagName}`,
      `use an ISO-8601 date/time (e.g. 2026-09-01 or 2026-09-01T10:00:00Z) or an epoch-ms number for --${flagName}`,
    );
  }
  return String(ms);
}
