import type { CommandModule } from "../cli/router.js";
import { searchConversations } from "../ghl/conversations.js";
import { UsageError } from "../output/errors.js";
import { emitList, print } from "../output/toon.js";
import { helpBlock } from "../output/suggest.js";

interface ConversationRecord {
  id?: string;
  contactId?: string;
  contactName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  lastMessageBody?: string;
  lastMessageType?: string;
  lastMessageDate?: string;
  unreadCount?: number;
  status?: string;
}

const FIELDS = [
  "id",
  "contact",
  "lastMessageBody",
  "lastMessageDate",
  "contactId",
  "lastMessageType",
  "unreadCount",
  "status",
];

function displayContact(c: ConversationRecord): string {
  return c.fullName || c.contactName || c.email || c.phone || c.contactId || "";
}

function preview(text: string | undefined, limit = 80): string {
  if (!text) return "";
  return text.length > limit ? text.slice(0, limit) + "..." : text;
}

function rowFor(c: ConversationRecord, fields: string[]): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const field of fields) {
    if (field === "contact") row[field] = displayContact(c);
    else if (field === "lastMessageBody") row[field] = preview(c.lastMessageBody);
    else row[field] = (c as Record<string, unknown>)[field];
  }
  return row;
}

export const conversationsCommand: CommandModule = {
  spec: {
    name: "conversations",
    summary: "List conversation threads (SMS/email/call)",
    flags: [
      { name: "contact", type: "string", description: "filter by contact id" },
      { name: "query", type: "string", description: "free-text search" },
      { name: "status", type: "string", description: "filter by conversation status" },
      { name: "limit", type: "string", default: "100", description: "max results to return" },
      {
        name: "fields",
        type: "string",
        default: "id,contact,lastMessageBody,lastMessageDate",
        description: `comma-separated columns from: ${FIELDS.join(", ")}`,
      },
    ],
    examples: [
      "gohighlevel-axi conversations",
      "gohighlevel-axi conversations --contact abc123",
      "gohighlevel-axi conversations --status unread --fields id,contact,status",
    ],
  },
  async run(parsed) {
    const fields = String(parsed.flags["fields"]).split(",").map((f) => f.trim());
    for (const f of fields) {
      if (!FIELDS.includes(f)) {
        throw new UsageError(`unknown field '${f}' for --fields`, `valid fields: ${FIELDS.join(", ")}`);
      }
    }
    const contact = parsed.flags["contact"] as string | undefined;
    const query = parsed.flags["query"] as string | undefined;
    const status = parsed.flags["status"] as string | undefined;
    const limit = parsed.flags["limit"] as string;

    const result = (await searchConversations({ contactId: contact, query, status, limit })) as {
      conversations?: ConversationRecord[];
      total?: number;
    };
    const rows = result.conversations ?? [];

    if (rows.length === 0) {
      const filters = [
        contact ? `contact=${contact}` : undefined,
        query ? `query=${query}` : undefined,
        status ? `status=${status}` : undefined,
      ].filter(Boolean);
      const filterNote = filters.length > 0 ? ` (filters: ${filters.join(", ")})` : "";
      print(`conversations: 0 results found${filterNote}`);
      print(helpBlock(["gohighlevel-axi conversations", "gohighlevel-axi contacts"]));
      return 0;
    }

    print(
      emitList(
        "conversations",
        rows.map((r) => rowFor(r, fields)),
        fields,
        { total: result.total },
      ),
    );
    print(
      helpBlock([
        `gohighlevel-axi conversation <id>`,
        `gohighlevel-axi message send --contact <id> --body "..."`,
      ]),
    );
    return 0;
  },
};
