// `gohighlevel-axi payment <id>` (detail, read-only) plus `payment record` -
// the single highest-stakes write endpoint in the whole CLI: it logs a real
// payment against a real order on a live account. Gated at least as
// strictly as message-send/workflow-trigger per the project's safety model.

import type { CommandModule } from "../cli/router.js";
import { UsageError } from "../output/errors.js";
import { emitKV, print } from "../output/toon.js";
import { helpBlock } from "../output/suggest.js";
import { getOrder, orderId, orderOf, recordPayment, type RecordPaymentFields } from "../ghl/payments.js";
import { CONFIRM_FLAG, isConfirmed, printDryRun } from "../ghl/gate.js";

const PAYMENT_MODES = ["cash", "cheque", "card", "custom"];

export const paymentGetCommand: CommandModule = {
  spec: {
    name: "payment",
    summary: "Show order/transaction detail by id",
    args: [{ name: "id", required: true, description: "order id" }],
    flags: [],
    examples: ["gohighlevel-axi payment order123"],
  },
  async run(parsed) {
    const id = parsed.positionals[0]!;
    const result = await getOrder(id);
    const order = orderOf(result);

    print(
      emitKV([
        ["order", orderId(order)],
        ["contactId", order.contactId ?? ""],
        ["amount", order.amount ?? ""],
        ["currency", order.currency ?? ""],
        ["status", order.status ?? ""],
        ["createdAt", order.createdAt ?? ""],
      ]),
    );
    print(helpBlock([`gohighlevel-axi payment record ${id} --amount <n> --mode cash --confirm`]));
    return 0;
  },
};

export const paymentRecordCommand: CommandModule = {
  spec: {
    name: "payment record",
    summary:
      "Record a payment against an existing order (gated: logs REAL money moved - handle with care)",
    args: [{ name: "id", required: true, description: "order id" }],
    flags: [
      { name: "amount", type: "string", description: "payment amount to record" },
      { name: "mode", type: "string", values: PAYMENT_MODES, description: "how the payment was collected" },
      { name: "notes", type: "string", description: "optional free-text note" },
      CONFIRM_FLAG,
    ],
    examples: ["gohighlevel-axi payment record order123 --amount 49.99 --mode card --confirm"],
  },
  async run(parsed) {
    const id = parsed.positionals[0]!;
    const amountRaw = parsed.flags["amount"];
    const mode = parsed.flags["mode"] as string | undefined;

    if (amountRaw === undefined) {
      throw new UsageError("payment record requires --amount <n>", "usage: --amount <positive number>");
    }
    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new UsageError(`invalid --amount '${String(amountRaw)}'`, "usage: --amount <positive number>");
    }
    if (!mode) {
      throw new UsageError(
        `payment record requires --mode <${PAYMENT_MODES.join("|")}>`,
        `usage: --mode <${PAYMENT_MODES.join("|")}>`,
      );
    }

    const notes = parsed.flags["notes"] as string | undefined;
    const fields: RecordPaymentFields = { amount, mode: mode as RecordPaymentFields["mode"], notes };

    if (!isConfirmed(parsed.flags)) {
      printDryRun({
        method: "POST",
        path: `/payments/orders/${id}/record-payment`,
        summary: `record a payment of $${amount} (${mode}) against order ${id}`,
        payload: { amount, mode, notes },
        confirmExample: `gohighlevel-axi payment record ${id} --amount ${amount} --mode ${mode} --confirm`,
      });
      return 0;
    }

    const result = await recordPayment(id, fields);
    print(emitKV([["order", id], ["amount", amount], ["mode", mode], ["result", JSON.stringify(result)]]));
    print(helpBlock([`gohighlevel-axi payment ${id}`]));
    return 0;
  },
};
