import type { CommandModule } from "../cli/router.js";
import { parseDateFlag } from "../cli/dates.js";
import { CONFIRM_FLAG, isConfirmed, printDryRun } from "../ghl/gate.js";
import { UsageError } from "../output/errors.js";
import { print, toonValue } from "../output/toon.js";
import { helpBlock } from "../output/suggest.js";
import { truncate, truncationNote } from "../output/truncate.js";
import { bookAppointment, cancelAppointment, getAppointment } from "../ghl/calendars.js";

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return toonValue(value);
}

function renderDetail(name: string, obj: Record<string, unknown>): string {
  const lines: string[] = [`${name}:`];
  for (const [key, raw] of Object.entries(obj)) {
    const formatted = formatValue(raw);
    if (formatted.length > 800) {
      const t = truncate(formatted);
      lines.push(`  ${key}: ${t.text}`);
      lines.push(truncationNote(t));
    } else {
      lines.push(`  ${key}: ${formatted}`);
    }
  }
  return lines.join("\n");
}

export const appointmentGet: CommandModule = {
  spec: {
    name: "appointment",
    summary: "Show appointment detail by id",
    args: [{ name: "id", required: true, description: "appointment (event) id" }],
    flags: [],
    examples: ["gohighlevel-axi appointment evt123"],
  },
  async run(parsed) {
    const id = parsed.positionals[0]!;
    const appointment = await getAppointment(id);
    print(renderDetail("appointment", appointment as Record<string, unknown>));
    return 0;
  },
};

export const appointmentBook: CommandModule = {
  spec: {
    name: "appointment book",
    summary: "Book a new appointment on a calendar (real booking - gated)",
    flags: [
      { name: "calendar", type: "string", description: "calendar id to book on (required)" },
      { name: "contact", type: "string", description: "contact id for the appointment (required)" },
      { name: "start", type: "string", description: "start time, ISO date or epoch-ms (required)" },
      { name: "end", type: "string", description: "end time, ISO date or epoch-ms" },
      { name: "title", type: "string", description: "appointment title" },
      { name: "user", type: "string", description: "assigned user id" },
      { name: "address", type: "string", description: "meeting address/location" },
      CONFIRM_FLAG,
    ],
    examples: [
      "gohighlevel-axi appointment book --calendar cal123 --contact ct456 --start 2026-09-10T15:00:00Z",
      "gohighlevel-axi appointment book --calendar cal123 --contact ct456 --start 2026-09-10T15:00:00Z --confirm",
    ],
  },
  async run(parsed) {
    const calendarId = parsed.flags["calendar"] as string | undefined;
    const contactId = parsed.flags["contact"] as string | undefined;
    const startRaw = parsed.flags["start"] as string | undefined;
    const endRaw = parsed.flags["end"] as string | undefined;
    const title = parsed.flags["title"] as string | undefined;
    const assignedUserId = parsed.flags["user"] as string | undefined;
    const address = parsed.flags["address"] as string | undefined;

    if (!calendarId) throw new UsageError("missing required flag --calendar", "usage: --calendar <id>");
    if (!contactId) throw new UsageError("missing required flag --contact", "usage: --contact <id>");
    if (!startRaw) throw new UsageError("missing required flag --start", "usage: --start <date>");

    const startTimeMs = parseDateFlag("start", startRaw);
    const endTimeMs = endRaw ? parseDateFlag("end", endRaw) : undefined;

    const payload: Record<string, unknown> = { calendarId, contactId, startTime: startTimeMs };
    if (endTimeMs !== undefined) payload["endTime"] = endTimeMs;
    if (title !== undefined) payload["title"] = title;
    if (assignedUserId !== undefined) payload["assignedUserId"] = assignedUserId;
    if (address !== undefined) payload["address"] = address;

    if (!isConfirmed(parsed.flags)) {
      printDryRun({
        method: "POST",
        path: "/calendars/events/appointments",
        summary: `book appointment on calendar ${calendarId} for contact ${contactId}`,
        payload,
        confirmExample: `gohighlevel-axi appointment book --calendar ${calendarId} --contact ${contactId} --start ${startRaw}${endRaw ? ` --end ${endRaw}` : ""} --confirm`,
      });
      return 0;
    }

    const appointment = await bookAppointment({
      calendarId,
      contactId,
      startTimeMs,
      endTimeMs,
      title,
      assignedUserId,
      address,
    });
    print(renderDetail("appointment", appointment as Record<string, unknown>));
    return 0;
  },
};

export const appointmentCancel: CommandModule = {
  spec: {
    name: "appointment cancel",
    summary: "Cancel (delete) an appointment (gated)",
    args: [{ name: "id", required: true, description: "appointment (event) id" }],
    flags: [CONFIRM_FLAG],
    examples: [
      "gohighlevel-axi appointment cancel evt123",
      "gohighlevel-axi appointment cancel evt123 --confirm",
    ],
  },
  async run(parsed) {
    const id = parsed.positionals[0]!;

    if (!isConfirmed(parsed.flags)) {
      printDryRun({
        method: "DELETE",
        path: `/calendars/events/${id}`,
        summary: `cancel appointment ${id}`,
        confirmExample: `gohighlevel-axi appointment cancel ${id} --confirm`,
      });
      return 0;
    }

    await cancelAppointment(id);
    print(`appointment: cancelled ${id}`);
    return 0;
  },
};
