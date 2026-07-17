# MOB-APPLIED: mob-evidence-custody-redact-words-v1

**Date:** 2026-07-17  
**Status:** APPLIED  
**File:** `lib/auditActionLabels.js`

## Change

Custody trail for `evidence.redact_*` (including autoface) uses **plain words only** — no JSON dump fallback.

Example instead of `{"regions":6,"sampled":135,...}`:

`Auto face tracking · 6 areas · 135 samples · tight preview`

Also labeled: `evidence.redact_autoface` → **Auto face redaction scanned**.

## Operator

Restart Fleet (server labels) · hard refresh · open evidence with redact history → custody lines readable.

**Note:** Old rows already stored as JSON in the DB still **display** through the new formatter (detail is re-parsed each read) — words appear without re-saving.
