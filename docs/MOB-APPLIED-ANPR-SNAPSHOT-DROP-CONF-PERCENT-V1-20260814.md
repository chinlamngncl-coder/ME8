# MOB-APPLIED ANPR-SNAPSHOT-DROP-CONF-PERCENT-V1 — 2026-08-14

**APPLY:** `ANPR-SNAPSHOT-DROP-CONF-PERCENT-V1`

## Change

- Snapshot result card: hide `#ax-anpr-confidence` (no %).
- Clear low-confidence note on success card.
- List miss copy: **Not on plate list** (`en.json` + JS fallback).
- Keep plate text + list hit / miss line. Ids preserved.

## Operator

Hard-refresh → Read plate → see plate + list line only (no Confidence %).
