// `gohighlevel-axi workflows` - list workflows (read-only, for discovering
// ids before `workflow trigger`).

import type { CommandModule } from "../cli/router.js";
import { UsageError } from "../output/errors.js";
import { emitList, print } from "../output/toon.js";
import { helpBlock } from "../output/suggest.js";
import { listWorkflows } from "../ghl/workflows.js";

const FIELDS = ["id", "name", "status"];

export const workflowsCommand: CommandModule = {
  spec: {
    name: "workflows",
    summary: "List automation workflows in the sub-account",
    flags: [
      {
        name: "fields",
        type: "string",
        default: "id,name,status",
        description: `comma-separated columns from: ${FIELDS.join(", ")}`,
      },
    ],
    examples: ["gohighlevel-axi workflows", "gohighlevel-axi workflows --fields id,name"],
  },
  async run(parsed) {
    const fields = String(parsed.flags["fields"]).split(",").map((f) => f.trim());
    for (const f of fields) {
      if (!FIELDS.includes(f)) {
        throw new UsageError(`unknown field '${f}' for --fields`, `valid fields: ${FIELDS.join(", ")}`);
      }
    }

    const { workflows } = await listWorkflows();
    if (workflows.length === 0) {
      print("workflows: 0 workflows found");
      print(helpBlock(["gohighlevel-axi workflows"]));
      return 0;
    }

    print(emitList("workflows", workflows.map((w) => ({ ...w })), fields, { total: workflows.length }));
    print(
      helpBlock([
        `gohighlevel-axi workflow trigger ${workflows[0]!.id} --contact <contact-id> --confirm`,
      ]),
    );
    return 0;
  },
};
