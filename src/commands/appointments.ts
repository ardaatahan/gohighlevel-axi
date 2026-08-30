import type { CommandModule } from "../cli/router.js";
import { parseDateFlag } from "../cli/dates.js";
import { UsageError } from "../output/errors.js";
import { emitList, print } from "../output/toon.js";
import { helpBlock } from "../output/suggest.js";
import { listEvents } from "../ghl/calendars.js";

const FIELDS = ["id", "title", "startTime", "endTime", "calendarId", "contactId", "appointmentStatus"];
const DEFAULT_FIELDS = "id,title,startTime,appointmentStatus";
const DAY_MS = 24 * 60 * 60 * 1000;

export const appointmentsList: CommandModule = {
  spec: {
    name: "appointments",
    summary: "List calendar events/appointments in a time range",
    flags: [
      { name: "calendar", type: "string", description: "filter by calendar id" },
      { name: "user", type: "string", description: "filter by assigned user id" },
      { name: "group", type: "string", description: "filter by calendar group id" },
      { name: "start", type: "string", description: "range start (ISO date or epoch-ms); default: now" },
      { name: "end", type: "string", description: "range end (ISO date or epoch-ms); default: 30 days from now" },
      {
        name: "fields",
        type: "string",
        default: DEFAULT_FIELDS,
        description: `comma-separated columns from: ${FIELDS.join(", ")}`,
      },
    ],
    examples: [
      "gohighlevel-axi appointments",
      "gohighlevel-axi appointments --calendar cal123",
      "gohighlevel-axi appointments --start 2026-09-01 --end 2026-09-30",
    ],
  },
  async run(parsed) {
    const fields = String(parsed.flags["fields"]).split(",").map((f) => f.trim());
    for (const f of fields) {
      if (!FIELDS.includes(f)) {
        throw new UsageError(`unknown field '${f}' for --fields`, `valid fields: ${FIELDS.join(", ")}`);
      }
    }

    const now = Date.now();
    const startInput = (parsed.flags["start"] as string | undefined) ?? String(now);
    const endInput = (parsed.flags["end"] as string | undefined) ?? String(now + 30 * DAY_MS);
    const startTimeMs = parsed.flags["start"] ? parseDateFlag("start", startInput) : startInput;
    const endTimeMs = parsed.flags["end"] ? parseDateFlag("end", endInput) : endInput;

    const calendarId = parsed.flags["calendar"] as string | undefined;
    const userId = parsed.flags["user"] as string | undefined;
    const groupId = parsed.flags["group"] as string | undefined;

    const events = await listEvents({ startTimeMs, endTimeMs, calendarId, userId, groupId });

    const rangeNote = `range ${new Date(Number(startTimeMs)).toISOString()} to ${new Date(Number(endTimeMs)).toISOString()}`;
    const calendarNote = calendarId ? `, calendar '${calendarId}'` : "";

    if (events.length === 0) {
      print(`appointments: 0 appointments found (${rangeNote}${calendarNote})`);
      print(helpBlock(["gohighlevel-axi calendars"]));
      return 0;
    }

    print(emitList("appointments", events.map((e) => ({ ...e })), fields, { total: events.length }));
    print(
      helpBlock([
        "gohighlevel-axi appointment <id>",
        "gohighlevel-axi appointment book --calendar <id> --contact <id> --start <date> --confirm",
      ]),
    );
    return 0;
  },
};
