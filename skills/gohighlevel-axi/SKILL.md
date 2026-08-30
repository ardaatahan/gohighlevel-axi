---
name: gohighlevel-axi
description: "Agent CLI for GoHighLevel (LeadConnector): contacts, conversations, calendars, opportunities, payments, and workflows - every send, trigger, charge, or delete defaults to a dry-run and requires --confirm"
---

# gohighlevel-axi

Agent CLI for GoHighLevel (LeadConnector): contacts, conversations, calendars, opportunities, payments, and workflows - every send, trigger, charge, or delete defaults to a dry-run and requires --confirm (built against AXI spec axi/1.0-2026-07). Run the commands below with npx - no install needed.

## Setup

Set `GHL_API_KEY` to a GoHighLevel Private Integration Token (Settings -> Private Integrations in the target sub-account) and `GHL_LOCATION_ID` to that sub-account's location id. Both may instead be written to `~/.config/gohighlevel-axi/credentials` as `token = ...` / `location_id = ...`.

## Safety model

Every command that sends a message, triggers a workflow, records a payment, books/cancels an appointment, moves an opportunity's stage, or creates/deletes a contact defaults to a **dry-run**: it prints the exact method, endpoint, and payload it would send, and makes **no network call**. Re-run the identical command with `--confirm` appended to actually execute it. There is no bare/no-flag way to trigger any of these effects. Read-only commands (list/get) are never gated.

## Commands

```
commands[28]{command,summary}:
  contacts,List/search contacts
  conversations,List conversation threads
  calendars,List calendars
  appointments,List appointments
  pipelines,List pipelines and stages
  opportunities,List opportunities
  payments,List payment orders (read-only)
  subscriptions,List subscriptions (read-only)
  workflows,List workflows
  contact <id>,Show contact detail
  contact add,"Create a contact (gated, --confirm)"
  contact rm <id>,"Delete a contact (gated, --confirm)"
  contact update <id>,Update contact fields
  conversation <id>,Conversation detail + recent messages
  message send,"Send SMS/Email to a contact (gated, --confirm)"
  calendar <id>,Show calendar detail
  appointment <id>,Show appointment detail
  appointment book,"Book an appointment (gated, --confirm)"
  appointment cancel <id>,"Cancel an appointment (gated, --confirm)"
  pipeline <id>,Show one pipeline's stages
  opportunity <id>,Show opportunity detail
  opportunity move <id>,"Move an opportunity to a new stage (gated, --confirm)"
  payment <id>,Show payment order detail
  payment record <id>,"Record a payment against an order (gated, --confirm - highest stakes)"
  workflow trigger <id>,"Enroll a contact in a workflow (gated, --confirm)"
  webhooks,Explain webhook subscription limitations
  webhooks add <url>,Not supported (no runtime webhook API exists)
  webhooks rm <id>,Not supported (no runtime webhook API exists)
```

Every command supports `--help`. Exit codes: 0 success/no-op, 1 error, 2 usage error. All output is TOON on stdout.
