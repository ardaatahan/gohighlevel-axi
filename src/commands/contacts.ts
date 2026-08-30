// `gohighlevel-axi contacts` - list/search contacts. Read-only, no gating.

import type { CommandModule } from "../cli/router.js";
import { UsageError } from "../output/errors.js";
import { emitList, print } from "../output/toon.js";
import { helpBlock } from "../output/suggest.js";
import { contactDisplayName, listContacts } from "../ghl/contacts.js";

const FIELDS = [
  "id",
  "name",
  "email",
  "phone",
  "locationId",
  "tags",
  "source",
  "dateAdded",
  "country",
  "companyName",
];
const DEFAULT_FIELDS = "id,name,email,phone";

export const contactsCommand: CommandModule = {
  spec: {
    name: "contacts",
    summary: "List/search contacts in the sub-account",
    flags: [
      { name: "query", type: "string", description: "free-text search (matches name, email, phone, etc.)" },
      { name: "limit", type: "string", default: "100", description: "max contacts to return" },
      { name: "after", type: "string", description: "startAfterId cursor for the next page" },
      {
        name: "fields",
        type: "string",
        default: DEFAULT_FIELDS,
        description: `comma-separated columns from: ${FIELDS.join(", ")}`,
      },
    ],
    examples: [
      "gohighlevel-axi contacts",
      "gohighlevel-axi contacts --query jane@example.com",
      "gohighlevel-axi contacts --fields id,name,email,tags --limit 25",
    ],
  },
  async run(parsed) {
    const fields = String(parsed.flags["fields"]).split(",").map((f) => f.trim());
    for (const f of fields) {
      if (!FIELDS.includes(f)) {
        throw new UsageError(`unknown field '${f}' for --fields`, `valid fields: ${FIELDS.join(", ")}`);
      }
    }
    const limitRaw = parsed.flags["limit"];
    const limit = limitRaw === undefined ? 100 : Number(limitRaw);
    if (!Number.isFinite(limit) || limit <= 0) {
      throw new UsageError(`invalid --limit '${String(limitRaw)}'`, "usage: --limit <positive integer>");
    }
    const query = parsed.flags["query"] as string | undefined;
    const after = parsed.flags["after"] as string | undefined;

    const result = await listContacts({ query, limit, startAfterId: after });

    if (result.contacts.length === 0) {
      const filterNote = query ? ` matching query '${query}'` : "";
      print(`contacts: 0 contacts found${filterNote}`);
      print(helpBlock(["gohighlevel-axi contacts"]));
      return 0;
    }

    const rows = result.contacts.map((c) => ({
      ...c,
      name: contactDisplayName(c),
      tags: Array.isArray(c["tags"]) ? (c["tags"] as string[]).join("|") : c["tags"],
    }));
    print(emitList("contacts", rows, fields, { total: result.count }));
    print(
      helpBlock([
        `gohighlevel-axi contact ${result.contacts[0]!.id}`,
        "gohighlevel-axi contacts --query <text>",
        "gohighlevel-axi contacts --fields id,name,email,tags",
      ]),
    );
    return 0;
  },
};
