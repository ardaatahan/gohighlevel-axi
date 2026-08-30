// `gohighlevel-axi subscriptions` - list recurring payment subscriptions.
// Read-only, no gating.

import type { CommandModule } from "../cli/router.js";
import { UsageError } from "../output/errors.js";
import { emitList, print } from "../output/toon.js";
import { helpBlock } from "../output/suggest.js";
import { listSubscriptions, subscriptionsOf } from "../ghl/payments.js";

const FIELDS = ["id", "contactId", "amount", "status"];
const DEFAULT_FIELDS = "id,contactId,amount,status";

export const subscriptionsCommand: CommandModule = {
  spec: {
    name: "subscriptions",
    summary: "List payment subscriptions (read-only)",
    flags: [
      { name: "limit", type: "string", default: "100", description: "max subscriptions to return" },
      {
        name: "fields",
        type: "string",
        default: DEFAULT_FIELDS,
        description: `comma-separated columns from: ${FIELDS.join(", ")}`,
      },
    ],
    examples: ["gohighlevel-axi subscriptions"],
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

    const result = await listSubscriptions({ limit });
    const subscriptions = subscriptionsOf(result);

    if (subscriptions.length === 0) {
      print("subscriptions: 0 subscriptions found");
      print(helpBlock(["gohighlevel-axi subscriptions"]));
      return 0;
    }

    const rows = subscriptions.map((s) => ({ ...s, id: s.id ?? s._id ?? "(unknown)" }));
    print(emitList("subscriptions", rows, fields, { total: result.totalCount }));
    print(helpBlock(["gohighlevel-axi payments"]));
    return 0;
  },
};
