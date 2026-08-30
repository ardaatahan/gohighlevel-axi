// `gohighlevel-axi opportunities` - list/search opportunities. Read-only,
// no gating.

import type { CommandModule } from "../cli/router.js";
import { UsageError } from "../output/errors.js";
import { emitList, print } from "../output/toon.js";
import { helpBlock } from "../output/suggest.js";
import { searchOpportunities } from "../ghl/opportunities.js";

const STATUS_VALUES = ["open", "won", "lost", "abandoned", "all"];
const FIELDS = ["id", "name", "status", "monetaryValue", "pipelineId", "pipelineStageId", "contactId", "assignedTo"];
const DEFAULT_FIELDS = "id,name,status,monetaryValue";

export const opportunitiesCommand: CommandModule = {
  spec: {
    name: "opportunities",
    summary: "List/search opportunities across pipelines",
    flags: [
      { name: "pipeline", type: "string", description: "filter by pipeline id" },
      { name: "stage", type: "string", description: "filter by pipeline stage id" },
      { name: "contact", type: "string", description: "filter by contact id" },
      { name: "status", type: "string", values: STATUS_VALUES, description: "filter by opportunity status" },
      { name: "limit", type: "string", default: "100", description: "max opportunities to return" },
      {
        name: "fields",
        type: "string",
        default: DEFAULT_FIELDS,
        description: `comma-separated columns from: ${FIELDS.join(", ")}`,
      },
    ],
    examples: [
      "gohighlevel-axi opportunities",
      "gohighlevel-axi opportunities --pipeline pipe123 --status open",
      "gohighlevel-axi opportunities --contact abc123 --fields id,name,pipelineStageId",
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

    const pipelineId = parsed.flags["pipeline"] as string | undefined;
    const pipelineStageId = parsed.flags["stage"] as string | undefined;
    const contactId = parsed.flags["contact"] as string | undefined;
    const status = parsed.flags["status"] as string | undefined;

    const result = await searchOpportunities({ pipelineId, pipelineStageId, contactId, status, limit });

    if (result.opportunities.length === 0) {
      const filters = [
        pipelineId && `pipeline=${pipelineId}`,
        pipelineStageId && `stage=${pipelineStageId}`,
        contactId && `contact=${contactId}`,
        status && `status=${status}`,
      ].filter(Boolean);
      const filterNote = filters.length > 0 ? ` (filters: ${filters.join(", ")})` : "";
      print(`opportunities: 0 opportunities found${filterNote}`);
      print(helpBlock(["gohighlevel-axi opportunities", "gohighlevel-axi pipelines"]));
      return 0;
    }

    print(emitList("opportunities", result.opportunities, fields, { total: result.meta?.total }));
    print(
      helpBlock([
        `gohighlevel-axi opportunity ${result.opportunities[0]!.id}`,
        `gohighlevel-axi opportunity move ${result.opportunities[0]!.id} --stage <stage-id> --confirm`,
        "gohighlevel-axi pipelines",
      ]),
    );
    return 0;
  },
};
