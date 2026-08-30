// Webhooks: verified against the live GoHighLevel v2 API surface (every
// resource spec in github.com/GoHighLevel/highlevel-api-docs was checked for
// a "webhook" path - there is none). Webhook subscriptions are configured
// only in the marketplace app manifest at app-creation time; there is no
// runtime CRUD endpoint a Private Integration Token can call to list, add,
// or remove them on a sub-account. `docs/webhook events/*.md` only documents
// the payload shape of inbound event notifications, which this CLI has
// nothing to poll or manage - GHL pushes those to a URL you configure in the
// marketplace developer portal, not through this tool.
//
// Rather than fake a gated network call against an endpoint that does not
// exist, every subcommand here reports this limitation directly.

import type { CommandModule } from "../cli/router.js";
import { AxiError } from "../output/errors.js";
import { emitBlock, print } from "../output/toon.js";
import { helpBlock } from "../output/suggest.js";

const PORTAL_HINT =
  "configure webhook subscriptions in the marketplace developer portal (app manifest), not at runtime";

function explanation(): string {
  return [
    "webhooks: not manageable via the GoHighLevel REST API",
    emitBlock("reason", [
      "no /webhooks endpoint exists in the documented v2 API surface (verified against every resource spec)",
      "subscriptions are declared in the marketplace app manifest at app-creation time",
      "a Private Integration Token cannot list, add, or remove webhook subscriptions at runtime",
    ]),
    helpBlock(["see README.md 'Webhooks' section for the marketplace developer portal workflow"]),
  ].join("\n");
}

export const webhooksList: CommandModule = {
  spec: {
    name: "webhooks",
    summary: "Explain why webhook subscriptions cannot be listed via this CLI",
    flags: [],
    examples: ["gohighlevel-axi webhooks"],
  },
  run() {
    print(explanation());
    return 0;
  },
};

class WebhooksUnsupportedError extends AxiError {
  constructor(action: "add" | "rm") {
    super(
      `webhook ${action === "add" ? "creation" : "removal"} is not available through the GoHighLevel REST API`,
      PORTAL_HINT + "; run 'gohighlevel-axi webhooks' for details",
    );
  }
}

export const webhooksAdd: CommandModule = {
  spec: {
    name: "webhooks add",
    summary: "Not supported: no runtime webhook-creation endpoint exists",
    args: [{ name: "url", required: true, description: "would-be callback URL (accepted for CLI-shape compatibility only)" }],
    flags: [{ name: "events", type: "string", description: "would-be comma-separated event list (unused - see summary)" }],
    examples: ["gohighlevel-axi webhooks add https://example.com/hook --events ContactCreate"],
  },
  async run() {
    throw new WebhooksUnsupportedError("add");
  },
};

export const webhooksRm: CommandModule = {
  spec: {
    name: "webhooks rm",
    summary: "Not supported: no runtime webhook-removal endpoint exists",
    args: [{ name: "id", required: true, description: "would-be webhook subscription id (accepted for CLI-shape compatibility only)" }],
    flags: [],
    examples: ["gohighlevel-axi webhooks rm sub_123"],
  },
  async run() {
    throw new WebhooksUnsupportedError("rm");
  },
};
