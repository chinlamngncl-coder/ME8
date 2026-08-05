# MOB DISC — Token-lean rules file (2026-08-02)

## Question

Are “all those rules” already in `.cursorrules`, or do we need a new file?

## Answer (simple)

| What | Where | Status |
|------|--------|--------|
| UI / form layout only | `.cursorrules` | Already there (short file) |
| APPLY / brand / ship / WVP / gold / DeviceControl / etc. | `.cursor/rules/me8-*.mdc` | Already there |
| Your 4 token-lean rules (small patches, no full rewrite, no auto-scan) | *(was chat-only)* | **Was missing** |

So: **most ME8 rules were already files.**  
**Not** everything lives in `.cursorrules` — Cursor loads many small `.mdc` rules under `.cursor/rules/`.

## Applied (this MOB)

Created:

`.cursor/rules/me8-token-lean-patches.mdc` (`alwaysApply: true`)

Holds your four token rules + reminder of zero-change-without-APPLY.

## Did NOT do

- Did not dump the whole instruction list into `.cursorrules` (that would bloat every chat).
- Did not edit baseline snapshot copies of rules.

## PASS

New Cursor chats in ME8 should see the token-lean rule in project rules / agent context.
