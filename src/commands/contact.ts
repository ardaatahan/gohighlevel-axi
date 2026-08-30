// `gohighlevel-axi contact <id>` (detail, read-only) plus the `contact add`
// (gated create), `contact rm` (gated delete), and `contact update`
// (ungated field edit) subcommands.
//
// `contact update` is deliberately left ungated: it only edits fields on an
// existing record (no send/trigger/money/irreversible-delete effect), which
// the project's safety model treats as safe-by-default - see README.

import type { CommandModule } from "../cli/router.js";
import { UsageError } from "../output/errors.js";
import { emitBlock, emitKV, print } from "../output/toon.js";
import { helpBlock } from "../output/suggest.js";
import { truncate, truncationNote } from "../output/truncate.js";
import {
  type ContactFields,
  contactDisplayName,
  createContact,
  deleteContact,
  getContact,
  updateContact,
} from "../ghl/contacts.js";
import { CONFIRM_FLAG, isConfirmed, printDryRun } from "../ghl/gate.js";

const FIELD_FLAGS: Array<{ flag: string; key: keyof ContactFields }> = [
  { flag: "first-name", key: "firstName" },
  { flag: "last-name", key: "lastName" },
  { flag: "email", key: "email" },
  { flag: "phone", key: "phone" },
  { flag: "company", key: "companyName" },
  { flag: "address", key: "address1" },
  { flag: "city", key: "city" },
  { flag: "state", key: "state" },
  { flag: "postal-code", key: "postalCode" },
  { flag: "website", key: "website" },
  { flag: "timezone", key: "timezone" },
  { flag: "source", key: "source" },
];

function fieldFlagsSpec(description: (flag: string) => string) {
  return FIELD_FLAGS.map(({ flag }) => ({
    name: flag,
    type: "string" as const,
    description: description(flag),
  }));
}

function collectFields(flags: Record<string, string | boolean>): ContactFields {
  const fields: ContactFields = {};
  for (const { flag, key } of FIELD_FLAGS) {
    const value = flags[flag];
    if (typeof value === "string") (fields as Record<string, string>)[key] = value;
  }
  return fields;
}

export const contactGetCommand: CommandModule = {
  spec: {
    name: "contact",
    summary: "Show contact detail by id",
    args: [{ name: "id", required: true, description: "contact id" }],
    flags: [],
    examples: ["gohighlevel-axi contact abc123"],
  },
  async run(parsed) {
    const id = parsed.positionals[0]!;
    const { contact } = await getContact(id);

    const lines: Array<[string, unknown]> = [
      ["contact", contact.id],
      ["name", contactDisplayName(contact)],
      ["email", contact.email ?? ""],
      ["phone", contact.phone ?? ""],
      ["companyName", contact.companyName ?? ""],
      ["source", contact.source ?? ""],
      ["timezone", contact.timezone ?? ""],
      ["country", contact.country ?? ""],
      ["dateAdded", contact.dateAdded ?? ""],
      ["tags", Array.isArray(contact.tags) ? contact.tags.join("|") : ""],
    ];
    print(emitKV(lines));

    const customFields = contact["customFields"];
    if (Array.isArray(customFields) && customFields.length > 0) {
      const rendered = customFields.map((cf) => {
        const raw = typeof cf === "object" && cf !== null ? JSON.stringify(cf) : String(cf);
        const t = truncate(raw);
        return t.truncated ? `${t.text}\n${truncationNote(t)}` : t.text;
      });
      print(emitBlock("customFields", rendered));
    }

    print(
      helpBlock([
        "gohighlevel-axi contact update " + id + " --email <new-email>",
        "gohighlevel-axi contact rm " + id + " --confirm",
      ]),
    );
    return 0;
  },
};

export const contactAddCommand: CommandModule = {
  spec: {
    name: "contact add",
    summary: "Create a new contact (gated: creates a real record)",
    flags: [...fieldFlagsSpec((flag) => `contact ${flag.replace(/-/g, " ")}`), CONFIRM_FLAG],
    examples: [
      "gohighlevel-axi contact add --first-name Jane --last-name Doe --email jane@example.com --confirm",
      "gohighlevel-axi contact add --phone +15551234567",
    ],
  },
  async run(parsed) {
    const fields = collectFields(parsed.flags);
    if (Object.keys(fields).length === 0) {
      throw new UsageError(
        "contact add requires at least one field flag",
        `valid flags: ${FIELD_FLAGS.map((f) => `--${f.flag}`).join(", ")}`,
      );
    }

    const confirmExample =
      "gohighlevel-axi contact add " +
      Object.entries(fields)
        .map(([k, v]) => {
          const flag = FIELD_FLAGS.find((f) => f.key === k)!.flag;
          return `--${flag} ${JSON.stringify(v)}`;
        })
        .join(" ") +
      " --confirm";

    if (!isConfirmed(parsed.flags)) {
      const combinedName = [fields.firstName, fields.lastName].filter(Boolean).join(" ").trim();
      const displayName = fields.name || combinedName || fields.email;
      printDryRun({
        method: "POST",
        path: "/contacts/",
        summary: `create contact ${displayName || "(unnamed)"}`,
        payload: { ...fields },
        confirmExample,
      });
      return 0;
    }

    const { contact } = await createContact(fields);
    print(emitKV([["created", contact.id], ["name", contactDisplayName(contact)]]));
    print(helpBlock([`gohighlevel-axi contact ${contact.id}`]));
    return 0;
  },
};

export const contactRmCommand: CommandModule = {
  spec: {
    name: "contact rm",
    summary: "Delete a contact (gated: irreversible)",
    args: [{ name: "id", required: true, description: "contact id" }],
    flags: [CONFIRM_FLAG],
    examples: ["gohighlevel-axi contact rm abc123 --confirm"],
  },
  async run(parsed) {
    const id = parsed.positionals[0]!;
    if (!isConfirmed(parsed.flags)) {
      printDryRun({
        method: "DELETE",
        path: `/contacts/${id}`,
        summary: `delete contact ${id}`,
        confirmExample: `gohighlevel-axi contact rm ${id} --confirm`,
      });
      return 0;
    }
    await deleteContact(id);
    print(emitKV([["deleted", id]]));
    return 0;
  },
};

export const contactUpdateCommand: CommandModule = {
  spec: {
    name: "contact update",
    summary: "Update fields on an existing contact (ungated field edit)",
    args: [{ name: "id", required: true, description: "contact id" }],
    flags: fieldFlagsSpec((flag) => `new value for contact ${flag.replace(/-/g, " ")}`),
    examples: [
      "gohighlevel-axi contact update abc123 --email new@example.com",
      "gohighlevel-axi contact update abc123 --phone +15559876543 --city Austin",
    ],
  },
  async run(parsed) {
    const id = parsed.positionals[0]!;
    const fields = collectFields(parsed.flags);
    if (Object.keys(fields).length === 0) {
      throw new UsageError(
        "contact update requires at least one field flag to change",
        `valid flags: ${FIELD_FLAGS.map((f) => `--${f.flag}`).join(", ")}`,
      );
    }
    const { contact } = await updateContact(id, fields);
    print(emitKV([["updated", contact.id], ...Object.entries(fields)]));
    print(helpBlock([`gohighlevel-axi contact ${id}`]));
    return 0;
  },
};
