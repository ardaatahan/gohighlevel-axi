import type { CommandModule } from "../cli/router.js";
import { print, toonValue } from "../output/toon.js";
import { helpBlock } from "../output/suggest.js";
import { truncate, truncationNote } from "../output/truncate.js";
import { getCalendar } from "../ghl/calendars.js";

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

export const calendarGet: CommandModule = {
  spec: {
    name: "calendar",
    summary: "Show calendar detail by id",
    args: [{ name: "id", required: true, description: "calendar id" }],
    flags: [],
    examples: ["gohighlevel-axi calendar cal123"],
  },
  async run(parsed) {
    const id = parsed.positionals[0]!;
    const calendar = await getCalendar(id);
    print(renderDetail("calendar", calendar as Record<string, unknown>));
    print(helpBlock([`gohighlevel-axi appointments --calendar ${id}`]));
    return 0;
  },
};
