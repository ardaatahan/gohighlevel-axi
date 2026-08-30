import type { CommandModule } from "../cli/router.js";
import { CONFIRM_FLAG, isConfirmed, printDryRun } from "../ghl/gate.js";
import { sendMessage } from "../ghl/conversations.js";
import { UsageError } from "../output/errors.js";
import { emitKV, print } from "../output/toon.js";
import { helpBlock } from "../output/suggest.js";

export const messageSendCommand: CommandModule = {
  spec: {
    name: "message send",
    summary: "Send an SMS or email to a contact (SAFETY-GATED: sends a real message)",
    flags: [
      { name: "contact", type: "string", description: "contact id to message (required)" },
      { name: "body", type: "string", description: "message text (required)" },
      { name: "type", type: "string", default: "SMS", values: ["SMS", "Email"], description: "message channel" },
      { name: "subject", type: "string", description: "email subject (only used when --type Email)" },
      CONFIRM_FLAG,
    ],
    examples: [
      "gohighlevel-axi message send --contact abc123 --body \"Running 10 min late\"",
      "gohighlevel-axi message send --contact abc123 --body \"Running 10 min late\" --confirm",
      "gohighlevel-axi message send --contact abc123 --type Email --subject \"Update\" --body \"See attached\" --confirm",
    ],
  },
  async run(parsed) {
    const contactId = parsed.flags["contact"] as string | undefined;
    const body = parsed.flags["body"] as string | undefined;
    const type = parsed.flags["type"] as "SMS" | "Email";
    const subject = parsed.flags["subject"] as string | undefined;

    if (!contactId) {
      throw new UsageError("missing required flag --contact", "usage: --contact <contact-id>");
    }
    if (!body) {
      throw new UsageError("missing required flag --body", "usage: --body <message text>");
    }

    const payload: Record<string, unknown> = { contactId, type, message: body };
    if (subject) payload["subject"] = subject;

    if (!isConfirmed(parsed.flags)) {
      printDryRun({
        method: "POST",
        path: "/conversations/messages",
        summary: `send ${type} to contact ${contactId}`,
        payload,
        confirmExample: `gohighlevel-axi message send --contact ${contactId} --body ${JSON.stringify(body)}${
          type === "Email" ? ` --type Email${subject ? ` --subject ${JSON.stringify(subject)}` : ""}` : ""
        } --confirm`,
      });
      return 0;
    }

    const result = (await sendMessage({ contactId, type, message: body, subject })) as Record<string, unknown>;
    print(emitKV(Object.entries(result)));
    print(helpBlock([`gohighlevel-axi conversations --contact ${contactId}`]));
    return 0;
  },
};
