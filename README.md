# gohighlevel-axi

An AXI (Agent eXperience Interface)-compliant CLI for the [GoHighLevel](https://www.gohighlevel.com/) (LeadConnector) v2 API. It lets an agent - or a human - inspect and manage contacts, conversations, calendars, opportunities/pipelines, payments, and workflows from the terminal, with structured TOON (Token-Oriented Object Notation) output on stdout and a strict safety model around every action that sends a message, moves money, or triggers automation on a live business account.

Built against AXI spec `axi/1.0-2026-07`.

## Why this exists

GoHighLevel is a real, live business platform: sending a message reaches a real customer, recording a payment logs real money, triggering a workflow fires real automation. This CLI is designed so an autonomous agent can safely read GoHighLevel data and only ever take a real, consequential action when a human (or an explicit, reviewed decision) has approved it. See [Safety model](#safety-model) below - that constraint shapes almost every command here.

## Install

```bash
# Run without installing
npx github:ardaatahan/gohighlevel-axi --help

# Or install globally from the GitHub repo
npm install -g github:ardaatahan/gohighlevel-axi
gohighlevel-axi --help

# Or clone and build locally
git clone https://github.com/ardaatahan/gohighlevel-axi.git
cd gohighlevel-axi
npm install
npm run build
node bin/gohighlevel-axi.js --help
```

Requires Node.js >= 20. Runtime dependencies are none - only the Node standard library (`fetch`, `fs`, `path`, `os`) and a build-time TypeScript/Vitest toolchain.

## Credentials: Private Integration Token setup

This CLI authenticates with a GoHighLevel **Private Integration Token (PIT)** - a bearer token generated directly in a sub-account, with no OAuth flow. Full OAuth 2.0 (for marketplace-distributed apps) is **out of scope for v1**.

1. In the target GoHighLevel sub-account, go to **Settings -> Private Integrations -> Create New Integration**.
2. Grant it the scopes the commands you need require (see each resource's scope in the sections below - e.g. `contacts.readonly`/`contacts.write`, `conversations/message.write`, `calendars/events.write`, `opportunities.write`, `payments/orders.readonly`, `payments/orders.collectPayment`, `workflows.readonly`). A token with only read scopes can safely run every read-only command; write scopes are only needed for the specific gated commands you intend to actually confirm.
3. Copy the generated token, and find the sub-account's **location id** in **Settings -> Business Profile** - most endpoints require both.

Configure both, in order of precedence:

1. Environment variables (recommended for agents/CI):
   ```bash
   export GHL_API_KEY="pit-xxxxxxxx"
   export GHL_LOCATION_ID="loc_xxxxxxxx"
   ```
2. Or a credentials file at `~/.config/gohighlevel-axi/credentials`:
   ```
   token = pit-xxxxxxxx
   location_id = loc_xxxxxxxx
   ```

The token is never logged, echoed, or included in any error message. A missing key produces a structured error naming exactly what to set and where to create one - never a crash or a stack trace.

Without credentials, every read command and every gated command's dry-run still work (dry-run makes no network call, so no key is required to see what a command *would* do). Only an actual `--confirm`'d network call requires a valid token, and list/get commands that hit the API obviously need one too.

## Safety model

**This is the central design constraint of this CLI, not a footnote.** Any command that sends a message, triggers/enrolls a workflow, creates or records a payment, or causes another irreversible change (delete a contact, cancel an appointment, move an opportunity's stage) works like this:

1. **By default it dry-runs.** It prints the exact HTTP method, endpoint, and payload it would send, and makes **no network call**.
2. **You must pass `--confirm`** to actually execute it.
3. **There is no bare/no-flag way to trigger the real effect.** The gated behavior is not reachable by accident.

```
$ gohighlevel-axi message send --contact c1 --body "hi there"
dry-run: send SMS to contact c1
would-call: POST /conversations/messages
payload[3]:
  contactId: "c1"
  type: "SMS"
  message: "hi there"
help[1]:
  gohighlevel-axi message send --contact c1 --body "hi there" --confirm
```

Read-only commands (`list`/`get`-style - `contacts`, `contact <id>`, `conversations`, `calendars`, `appointments`, `opportunities`, `pipelines`, `payments`, `subscriptions`, `workflows`, and their singular detail forms) need no gate and call the API directly.

**Gated commands in this CLI:** `contact add`, `contact rm`, `message send`, `appointment book`, `appointment cancel`, `opportunity move`, `payment record`, `workflow trigger`.

**Ungated on purpose:** `contact update` performs non-destructive field edits (name/email/phone/address/etc. on an existing record) - it calls the API directly without `--confirm`. This is a deliberate line: it can't send anything, move money, trigger automation, or delete data, so gating it would only add friction. Everything on the other side of that line (create, delete, send, trigger, charge, stage-move) is gated.

### Payments and messaging: handle with care

- **`payment record <id> --amount <n> --mode <cash|cheque|card|custom> --confirm`** is the single highest-stakes command in this CLI. It calls `POST /payments/orders/{orderId}/record-payment`, which logs a real payment against a real order on your live account. There is no order/charge-creation endpoint exposed anywhere in GoHighLevel's documented v2 API surface reachable by a Private Integration Token - `record-payment` (logging a payment, typically an offline/manually-collected one, against an *existing* order) is the only money-moving write endpoint that exists. It is gated identically to every other dangerous command, but treat it with extra caution: double-check the order id, amount, and mode in the dry-run output before adding `--confirm`.
- **`message send --confirm`** sends a real SMS or email to a real person through the sub-account's connected number/inbox. There is no simulation mode beyond the dry-run - once confirmed, the message is sent.
- **`workflow trigger <id> --contact <id> --confirm`** enrolls a real contact into a real automation (the underlying call is `POST /contacts/{contactId}/workflow/{workflowId}` - it lives under the Contacts API despite being a workflow action). Downstream automation (more messages, tasks, pipeline moves) may fire as a result.

## Version header

GoHighLevel v2 requires a dated `Version` header on every request, in addition to auth. **It is not a single global constant** - GoHighLevel documents a different dated value per resource group. This CLI centralizes that mapping in one place, `src/ghl/client.ts` (`GHL_API_VERSIONS`):

| Resource group | Version header |
|---|---|
| Contacts | `2021-07-28` |
| Opportunities | `2021-07-28` |
| Workflows | `2021-07-28` |
| Payments | `2021-07-28` |
| Calendars | `2021-04-15` |
| Conversations | `2021-04-15` |

If GoHighLevel ships a newer documented version for a group, update that one entry.

## Commands

Every command supports `--help` (flags, defaults, examples - never a side effect). Output is TOON (Token-Oriented Object Notation) on stdout. Exit codes: `0` success/no-op, `1` error, `2` usage error. Running with no arguments shows a live account summary (contact count, location id) when credentials are configured, or a compact command overview when they aren't - never a raw usage dump.

### Contacts

```bash
gohighlevel-axi contacts [--query <text>] [--limit <n>] [--after <id>] [--fields <csv>]
gohighlevel-axi contact <id>
gohighlevel-axi contact add [--first-name ...] [--last-name ...] [--email ...] [--phone ...] [--company ...] ... [--confirm]
gohighlevel-axi contact rm <id> --confirm
gohighlevel-axi contact update <id> [--email ...] [--phone ...] ...   # ungated field edit
```

### Conversations & Messages

```bash
gohighlevel-axi conversations [--contact <id>] [--query <text>] [--status <s>]
gohighlevel-axi conversation <id> [--full]
gohighlevel-axi message send --contact <id> --body "..." [--type SMS|Email] [--subject ...] --confirm
```

### Calendars & Appointments

```bash
gohighlevel-axi calendars [--group <id>] [--show-drafted]
gohighlevel-axi calendar <id>
gohighlevel-axi appointments [--calendar <id>] [--start <date>] [--end <date>]   # default range: now .. +30 days
gohighlevel-axi appointment <id>
gohighlevel-axi appointment book --calendar <id> --contact <id> --start <date> [--end ...] [--title ...] --confirm
gohighlevel-axi appointment cancel <id> --confirm
```

`appointment cancel` maps to `DELETE /calendars/events/{eventId}` - GoHighLevel's documented API has no separate cancel-status endpoint, so cancellation and deletion are the same call.

### Opportunities & Pipelines

```bash
gohighlevel-axi pipelines
gohighlevel-axi pipeline <id>
gohighlevel-axi opportunities [--pipeline <id>] [--stage <id>] [--contact <id>] [--status open|won|lost|abandoned|all]
gohighlevel-axi opportunity <id>
gohighlevel-axi opportunity move <id> --stage <id> --confirm
```

### Payments

```bash
gohighlevel-axi payments [--contact <id>] [--status <s>]        # read-only
gohighlevel-axi subscriptions                                   # read-only
gohighlevel-axi payment <id>
gohighlevel-axi payment record <id> --amount <n> --mode cash|cheque|card|custom [--notes ...] --confirm
```

See [Payments and messaging: handle with care](#payments-and-messaging-handle-with-care) above.

### Workflows

```bash
gohighlevel-axi workflows
gohighlevel-axi workflow trigger <id> --contact <id> --confirm
```

### Webhooks

```bash
gohighlevel-axi webhooks
gohighlevel-axi webhooks add <url> --events <csv>
gohighlevel-axi webhooks rm <id>
```

GoHighLevel's v2 REST API has **no endpoint to list, add, or remove webhook subscriptions at runtime** (verified against every resource spec in [GoHighLevel/highlevel-api-docs](https://github.com/GoHighLevel/highlevel-api-docs) - there is no `/webhooks` path anywhere in the documented surface). Subscriptions are declared once in the marketplace app manifest at app-creation time, in the developer portal. `gohighlevel-axi webhooks` explains this; `webhooks add`/`webhooks rm` accept the same argument shape the brief for this tool originally called for, but report the same limitation rather than silently no-op-ing or faking a call - see `src/commands/webhooks.ts`.

## Development

```bash
npm install
npm run build          # tsc -> dist/
npm test               # builds, then runs the offline vitest suite
npm run skill:gen       # regenerate skills/gohighlevel-axi/SKILL.md from src/skill/content.ts
npm run skill:check     # CI: fails if SKILL.md has drifted from source
```

The entire test suite runs offline against mocked HTTP responses - no live GoHighLevel credentials are used or required. Every gated command has an explicit test proving it makes **zero network calls** and exits `0` without `--confirm`, and a second test proving the correct method/URL/body is sent when `--confirm` is passed.

**Live smoke test (post-key, not part of CI):** once you have a real Private Integration Token and location id, a reasonable manual smoke pass is: `gohighlevel-axi` (verify the live account summary renders), `gohighlevel-axi contacts`, `gohighlevel-axi pipelines`, then one gated dry-run (e.g. `gohighlevel-axi message send --contact <a-real-test-contact> --body "test"` without `--confirm`) to confirm the payload looks right before ever adding `--confirm` against a real account.

## Known API surface notes

A few real, verified quirks of the underlying GoHighLevel API worth knowing if you're extending this tool:

- `/opportunities/search` uses **snake_case** query params (`location_id`, `pipeline_id`, `pipeline_stage_id`, `contact_id`), while `/opportunities/pipelines` uses **camelCase** (`locationId`). This is the live API, not a typo in this codebase.
- The Contacts API's delete and workflow-enroll endpoints return `{"succeded": true}` - that is GoHighLevel's own documented field name (misspelled), preserved verbatim where this CLI surfaces raw API responses.
- Payments list responses may use `_id`/`data` instead of `id`/a named array key; this CLI's payments layer handles both shapes defensively rather than assuming one.

## License

MIT - see [LICENSE](./LICENSE).
