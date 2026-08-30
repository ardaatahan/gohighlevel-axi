// No-args home view (AXI principle 8): content-first, not a usage dump.
// With credentials configured, shows a live account summary; without them,
// falls back to the static compact command overview from src/skill/content.ts.

import type { CommandModule } from "../cli/router.js";
import { emitKV, print } from "../output/toon.js";
import { helpBlock } from "../output/suggest.js";
import { findApiKey, findLocationId } from "../ghl/config.js";
import { listContacts } from "../ghl/contacts.js";
import { homeBody, homeHeader, rootHelpText } from "../skill/content.js";

async function renderLiveSummary(locationId: string): Promise<string> {
  const pairs: Array<[string, string]> = [
    ["credentials", "configured"],
    ["locationId", locationId],
  ];
  try {
    const result = await listContacts({ limit: 1 });
    pairs.push(["contacts", `${result.count} total`]);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    pairs.push(["live summary", `unavailable (${message})`]);
  }
  const help = helpBlock([
    "gohighlevel-axi contacts --query <text>",
    "gohighlevel-axi conversations --contact <id>",
    "gohighlevel-axi opportunities --pipeline <id>",
  ]);
  return [emitKV(pairs), help].join("\n");
}

export const homeCommand: CommandModule = {
  spec: {
    name: "",
    summary: "Home view: live account summary when credentialed, else a compact command overview",
    flags: [
      { name: "version", type: "boolean", description: "print the tool version" },
    ],
    examples: ["gohighlevel-axi", "gohighlevel-axi --version"],
  },
  async run(parsed) {
    if (parsed.flags["version"]) {
      print("gohighlevel-axi: 0.1.0");
      return 0;
    }

    const header = homeHeader(process.argv[1] ?? "gohighlevel-axi");
    const apiKey = findApiKey();
    const locationId = findLocationId();
    if (apiKey && locationId) {
      print([header, await renderLiveSummary(locationId)].join("\n"));
      return 0;
    }

    const missing = [!apiKey && "GHL_API_KEY", !locationId && "GHL_LOCATION_ID"].filter(Boolean).join(" and ");
    print([header, `credentials: not configured (missing ${missing})`, homeBody("gohighlevel-axi")].join("\n"));
    return 0;
  },
};

export function rootHelp(): string {
  return rootHelpText();
}
