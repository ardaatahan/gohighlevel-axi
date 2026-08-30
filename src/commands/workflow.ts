// `gohighlevel-axi workflow trigger <id> --contact <id>` - gated: enrolls a
// real contact into a real automation on a live business account.

import type { CommandModule } from "../cli/router.js";
import { UsageError } from "../output/errors.js";
import { emitKV, print } from "../output/toon.js";
import { enrollContactInWorkflow } from "../ghl/contacts.js";
import { CONFIRM_FLAG, isConfirmed, printDryRun } from "../ghl/gate.js";

export const workflowTriggerCommand: CommandModule = {
  spec: {
    name: "workflow trigger",
    summary: "Enroll a contact into a workflow (gated: triggers real automation)",
    args: [{ name: "id", required: true, description: "workflow id" }],
    flags: [
      { name: "contact", type: "string", description: "contact id to enroll" },
      CONFIRM_FLAG,
    ],
    examples: ["gohighlevel-axi workflow trigger wf123 --contact abc123 --confirm"],
  },
  async run(parsed) {
    const workflowId = parsed.positionals[0]!;
    const contactId = parsed.flags["contact"] as string | undefined;
    if (!contactId) {
      throw new UsageError("workflow trigger requires --contact <contact-id>", "usage: --contact <contact-id>");
    }

    if (!isConfirmed(parsed.flags)) {
      printDryRun({
        method: "POST",
        path: `/contacts/${contactId}/workflow/${workflowId}`,
        summary: `enroll contact ${contactId} into workflow ${workflowId}`,
        payload: { contactId, workflowId },
        confirmExample: `gohighlevel-axi workflow trigger ${workflowId} --contact ${contactId} --confirm`,
      });
      return 0;
    }

    await enrollContactInWorkflow(contactId, workflowId);
    print(emitKV([["enrolled", contactId], ["workflow", workflowId]]));
    return 0;
  },
};
