import type { CommandModule } from "../cli/router.js";
import { UsageError } from "../output/errors.js";
import { emitList, print } from "../output/toon.js";
import { helpBlock } from "../output/suggest.js";
import { listCalendars } from "../ghl/calendars.js";

const FIELDS = ["id", "name", "calendarType", "isActive"];
const DEFAULT_FIELDS = "id,name,calendarType";

export const calendarsList: CommandModule = {
  spec: {
    name: "calendars",
    summary: "List calendars in the configured location",
    flags: [
      { name: "group", type: "string", description: "filter by calendar group id" },
      { name: "show-drafted", type: "boolean", description: "include draft (unpublished) calendars" },
      {
        name: "fields",
        type: "string",
        default: DEFAULT_FIELDS,
        description: `comma-separated columns from: ${FIELDS.join(", ")}`,
      },
    ],
    examples: [
      "gohighlevel-axi calendars",
      "gohighlevel-axi calendars --group grp123",
      "gohighlevel-axi calendars --fields id,name,isActive",
    ],
  },
  async run(parsed) {
    const fields = String(parsed.flags["fields"]).split(",").map((f) => f.trim());
    for (const f of fields) {
      if (!FIELDS.includes(f)) {
        throw new UsageError(`unknown field '${f}' for --fields`, `valid fields: ${FIELDS.join(", ")}`);
      }
    }
    const groupId = parsed.flags["group"] as string | undefined;
    const showDrafted = parsed.flags["show-drafted"] === true ? true : undefined;

    const calendars = await listCalendars({ groupId, showDrafted });

    if (calendars.length === 0) {
      const filterNote = groupId ? ` matching group '${groupId}'` : "";
      print(`calendars: 0 calendars found${filterNote}`);
      print(helpBlock(["gohighlevel-axi calendars"]));
      return 0;
    }

    print(emitList("calendars", calendars.map((c) => ({ ...c })), fields, { total: calendars.length }));
    print(
      helpBlock([
        "gohighlevel-axi calendar <id>",
        "gohighlevel-axi appointments --calendar <id>",
      ]),
    );
    return 0;
  },
};
