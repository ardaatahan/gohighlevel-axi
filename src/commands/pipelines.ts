// `gohighlevel-axi pipelines` - list pipelines (read-only). Each pipeline
// nests its stages; the default list view flattens stage names into one
// compact column so an agent can see stage ids without a second call, and
// `pipeline <id>` gives the full per-stage detail when that's not enough.

import type { CommandModule } from "../cli/router.js";
import { UsageError } from "../output/errors.js";
import { emitList, print } from "../output/toon.js";
import { helpBlock } from "../output/suggest.js";
import { listPipelines } from "../ghl/opportunities.js";

const FIELDS = ["id", "name", "stages", "stageCount"];
const DEFAULT_FIELDS = "id,name,stages";

function stagesSummary(stages: Array<{ id: string; name: string }>): string {
  return stages.map((s) => `${s.name}:${s.id}`).join("|");
}

export const pipelinesCommand: CommandModule = {
  spec: {
    name: "pipelines",
    summary: "List pipelines and their stages",
    flags: [
      {
        name: "fields",
        type: "string",
        default: DEFAULT_FIELDS,
        description: `comma-separated columns from: ${FIELDS.join(", ")}`,
      },
    ],
    examples: ["gohighlevel-axi pipelines", "gohighlevel-axi pipelines --fields id,name,stageCount"],
  },
  async run(parsed) {
    const fields = String(parsed.flags["fields"]).split(",").map((f) => f.trim());
    for (const f of fields) {
      if (!FIELDS.includes(f)) {
        throw new UsageError(`unknown field '${f}' for --fields`, `valid fields: ${FIELDS.join(", ")}`);
      }
    }

    const { pipelines } = await listPipelines();
    if (pipelines.length === 0) {
      print("pipelines: 0 pipelines found");
      print(helpBlock(["gohighlevel-axi pipelines"]));
      return 0;
    }

    const rows = pipelines.map((p) => ({
      id: p.id,
      name: p.name,
      stages: stagesSummary(p.stages ?? []),
      stageCount: (p.stages ?? []).length,
    }));
    print(emitList("pipelines", rows, fields));
    print(
      helpBlock([
        `gohighlevel-axi pipeline ${pipelines[0]!.id}`,
        "gohighlevel-axi opportunities --pipeline <pipeline-id>",
      ]),
    );
    return 0;
  },
};

export const pipelineCommand: CommandModule = {
  spec: {
    name: "pipeline",
    summary: "Show a pipeline's full stage list by id",
    args: [{ name: "id", required: true, description: "pipeline id" }],
    flags: [],
    examples: ["gohighlevel-axi pipeline pipe123"],
  },
  async run(parsed) {
    const id = parsed.positionals[0]!;
    const { pipelines } = await listPipelines();
    const pipeline = pipelines.find((p) => p.id === id);
    if (!pipeline) {
      print(`pipeline: 0 pipelines found matching id '${id}'`);
      print(helpBlock(["gohighlevel-axi pipelines"]));
      return 0;
    }

    const rows = (pipeline.stages ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      position: s.position ?? "",
    }));
    print(`pipeline: ${pipeline.name} (${pipeline.id})`);
    print(emitList("stages", rows, ["id", "name", "position"]));
    print(helpBlock([`gohighlevel-axi opportunities --pipeline ${id} --stage <stage-id>`]));
    return 0;
  },
};
