// `gohighlevel-axi opportunity <id>` (detail, read-only) plus the gated
// `opportunity move` subcommand that changes pipeline stage - a real change
// that can fire stage-based automations downstream.

import type { CommandModule } from "../cli/router.js";
import { UsageError } from "../output/errors.js";
import { emitKV, print } from "../output/toon.js";
import { helpBlock } from "../output/suggest.js";
import { getOpportunity, moveOpportunityStage } from "../ghl/opportunities.js";
import { CONFIRM_FLAG, isConfirmed, printDryRun } from "../ghl/gate.js";

export const opportunityGetCommand: CommandModule = {
  spec: {
    name: "opportunity",
    summary: "Show opportunity detail by id",
    args: [{ name: "id", required: true, description: "opportunity id" }],
    flags: [],
    examples: ["gohighlevel-axi opportunity opp123"],
  },
  async run(parsed) {
    const id = parsed.positionals[0]!;
    const { opportunity } = await getOpportunity(id);

    print(
      emitKV([
        ["opportunity", opportunity.id],
        ["name", opportunity.name],
        ["status", opportunity.status ?? ""],
        ["monetaryValue", opportunity.monetaryValue ?? ""],
        ["pipelineId", opportunity.pipelineId ?? ""],
        ["pipelineStageId", opportunity.pipelineStageId ?? ""],
        ["contactId", opportunity.contactId ?? ""],
        ["assignedTo", opportunity.assignedTo ?? ""],
      ]),
    );
    print(
      helpBlock([
        `gohighlevel-axi opportunity move ${id} --stage <stage-id> --confirm`,
        opportunity.pipelineId ? `gohighlevel-axi pipeline ${opportunity.pipelineId}` : "gohighlevel-axi pipelines",
      ]),
    );
    return 0;
  },
};

export const opportunityMoveCommand: CommandModule = {
  spec: {
    name: "opportunity move",
    summary: "Move an opportunity to a different pipeline stage (gated: real pipeline change)",
    args: [{ name: "id", required: true, description: "opportunity id" }],
    flags: [
      { name: "stage", type: "string", description: "target pipeline stage id" },
      CONFIRM_FLAG,
    ],
    examples: ["gohighlevel-axi opportunity move opp123 --stage stage456 --confirm"],
  },
  async run(parsed) {
    const id = parsed.positionals[0]!;
    const stage = parsed.flags["stage"] as string | undefined;
    if (!stage) {
      throw new UsageError("opportunity move requires --stage <stage-id>", "usage: --stage <stage-id>");
    }

    if (!isConfirmed(parsed.flags)) {
      printDryRun({
        method: "PUT",
        path: `/opportunities/${id}`,
        summary: `move opportunity ${id} to pipeline stage ${stage}`,
        payload: { pipelineStageId: stage },
        confirmExample: `gohighlevel-axi opportunity move ${id} --stage ${stage} --confirm`,
      });
      return 0;
    }

    const { opportunity } = await moveOpportunityStage(id, stage);
    print(emitKV([["moved", opportunity.id], ["pipelineStageId", opportunity.pipelineStageId ?? stage]]));
    print(helpBlock([`gohighlevel-axi opportunity ${id}`]));
    return 0;
  },
};
