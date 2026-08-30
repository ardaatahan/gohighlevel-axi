import type { CommandModule } from "../cli/router.js";
import { getConversation, listMessages } from "../ghl/conversations.js";
import { emitBlock, emitKV, print } from "../output/toon.js";
import { truncate, truncationNote } from "../output/truncate.js";
import { helpBlock } from "../output/suggest.js";

interface MessageRecord {
  id?: string;
  type?: string;
  messageType?: string;
  body?: string;
  direction?: string;
  dateAdded?: string;
  status?: string;
}

function extractMessages(raw: unknown): MessageRecord[] {
  if (!raw || typeof raw !== "object") return [];
  const obj = raw as Record<string, unknown>;
  const nested = obj["messages"];
  if (nested && typeof nested === "object" && Array.isArray((nested as Record<string, unknown>)["messages"])) {
    return (nested as { messages: MessageRecord[] }).messages;
  }
  if (Array.isArray(nested)) return nested as MessageRecord[];
  return [];
}

function extractConversation(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  const obj = raw as Record<string, unknown>;
  if (obj["conversation"] && typeof obj["conversation"] === "object") {
    return obj["conversation"] as Record<string, unknown>;
  }
  return obj;
}

export const conversationCommand: CommandModule = {
  spec: {
    name: "conversation",
    summary: "Show a conversation's metadata and recent messages",
    args: [{ name: "id", required: true, description: "conversation id" }],
    flags: [{ name: "full", type: "boolean", description: "show full message bodies without truncation" }],
    examples: ["gohighlevel-axi conversation abc123", "gohighlevel-axi conversation abc123 --full"],
  },
  async run(parsed) {
    const id = parsed.positionals[0]!;
    const full = parsed.flags["full"] === true;

    const [convoRaw, messagesRaw] = await Promise.all([getConversation(id), listMessages(id)]);
    const convo = extractConversation(convoRaw);
    const messages = extractMessages(messagesRaw);

    const kvPairs: Array<[string, unknown]> = [
      ["id", convo["id"] ?? id],
      ["contactId", convo["contactId"]],
      ["status", convo["status"]],
      ["lastMessageType", convo["lastMessageType"]],
      ["unreadCount", convo["unreadCount"]],
    ].filter(([, v]) => v !== undefined) as Array<[string, unknown]>;
    print(emitKV(kvPairs));

    if (messages.length === 0) {
      print(`messages: 0 messages found for conversation ${id}`);
    } else {
      const limit = full ? Infinity : 500;
      const lines = messages.map((m) => {
        const t = truncate(m.body ?? "", limit === Infinity ? Number.MAX_SAFE_INTEGER : limit);
        const suffix = t.truncated ? ` ${truncationNote(t)}` : "";
        return `${m.dateAdded ?? ""} [${m.direction ?? "?"}/${m.type ?? m.messageType ?? "?"}] ${t.text}${suffix}`;
      });
      print(emitBlock("messages", lines));
      const anyTruncated = !full && messages.some((m) => (m.body?.length ?? 0) > 500);
      if (anyTruncated) {
        print(helpBlock([`gohighlevel-axi conversation ${id} --full`]));
        return 0;
      }
    }

    print(helpBlock([`gohighlevel-axi message send --contact <id> --body "..."`]));
    return 0;
  },
};
