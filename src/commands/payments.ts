// `gohighlevel-axi payments` - list orders/transactions. Read-only, no
// gating. Money-moving actions live under `payment record` (gated).

import type { CommandModule } from "../cli/router.js";
import { UsageError } from "../output/errors.js";
import { emitList, print } from "../output/toon.js";
import { helpBlock } from "../output/suggest.js";
import { listOrders, orderId, ordersOf } from "../ghl/payments.js";

const FIELDS = ["id", "contactId", "amount", "currency", "status", "createdAt"];
const DEFAULT_FIELDS = "id,contactId,amount,status";

export const paymentsCommand: CommandModule = {
  spec: {
    name: "payments",
    summary: "List orders/transactions (read-only)",
    flags: [
      { name: "contact", type: "string", description: "filter by contact id" },
      { name: "status", type: "string", description: "filter by order status" },
      { name: "limit", type: "string", default: "100", description: "max orders to return" },
      {
        name: "fields",
        type: "string",
        default: DEFAULT_FIELDS,
        description: `comma-separated columns from: ${FIELDS.join(", ")}`,
      },
    ],
    examples: ["gohighlevel-axi payments", "gohighlevel-axi payments --contact abc123"],
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

    const contactId = parsed.flags["contact"] as string | undefined;
    const status = parsed.flags["status"] as string | undefined;
    const result = await listOrders({ contactId, status, limit });
    const orders = ordersOf(result);

    if (orders.length === 0) {
      const filters = [contactId && `contact=${contactId}`, status && `status=${status}`].filter(Boolean);
      const filterNote = filters.length > 0 ? ` (filters: ${filters.join(", ")})` : "";
      print(`payments: 0 orders found${filterNote}`);
      print(helpBlock(["gohighlevel-axi payments"]));
      return 0;
    }

    const rows = orders.map((o) => ({ ...o, id: orderId(o) }));
    print(emitList("orders", rows, fields, { total: result.totalCount }));
    print(
      helpBlock([
        `gohighlevel-axi payment ${orderId(orders[0]!)}`,
        "gohighlevel-axi subscriptions",
      ]),
    );
    return 0;
  },
};
