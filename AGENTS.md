# Project agent memory

This file is the project's committed home for project-intrinsic agent knowledge: build, test, release, architecture, and sharp-edge notes that should travel with the code.

- **No live GoHighLevel credentials exist in dev.** The entire test suite runs offline against mocked `fetch` (`vi.stubGlobal("fetch", ...)`); never assume a live smoke test has been run. See README's "Live smoke test" section for the manual post-key checklist.
- **The GoHighLevel `Version` header is not one constant.** It's a per-resource-group dated string, centralized in `src/ghl/client.ts`'s `GHL_API_VERSIONS` map. Verify against live docs (marketplace.gohighlevel.com/docs, github.com/GoHighLevel/highlevel-api-docs) before bumping any entry - don't assume all groups move together.
- **`/opportunities/search` uses snake_case query params** (`location_id`, `pipeline_id`, ...) while `/opportunities/pipelines` uses camelCase (`locationId`). This is the real API, not a bug - `src/ghl/opportunities.ts` has tests pinning both.
- **No webhook management REST API exists.** `gohighlevel-axi webhooks`/`webhooks add`/`webhooks rm` report that limitation (`src/commands/webhooks.ts`) rather than faking a call. Don't "fix" this without re-verifying the full GoHighLevel API surface first.
- **Safety gating is the core design constraint**, not incidental: every send/trigger/payment/destructive command must dry-run by default and require `--confirm` with zero network calls until then. `src/ghl/gate.ts` (`renderDryRun`/`isConfirmed`) is the one place this logic lives - route all future gated commands through it, and add a test proving the zero-network-call no-op for each.
- Commands and their GHL API mappings, including deliberately ungated `contact update` (non-destructive field edits) and the highest-stakes `payment record` (the only money-moving write endpoint GoHighLevel exposes to a Private Integration Token), are documented in README.md - keep that in sync with `src/index.ts`'s registry when adding commands.
- `npm run skill:check` (wired into CI) fails if `skills/gohighlevel-axi/SKILL.md` drifts from `src/skill/content.ts` - always run `npm run skill:gen` after changing command summaries there.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
