# MOB-APPLIED — MASTER-SETTINGS-GRID-AND-RULES-V4

**Date:** 2026-07-23  
**Status:** APPLIED — operator visual PASS pending  
**Apply:** `MOB-EXECUTE-MASTER-SETTINGS-GRID-AND-RULES-V4`

## Phase 1 — System memory

Appended to root `.cursorrules`:

- East-to-West multi-column forms: `repeat(auto-fit, minmax(350px, 1fr)); gap: 24px`
- Label wrappers: `flex-direction: column; gap: 6px`
- Input caps: `max-width: 420px`
- Readiness lists: `space-between` (label West / status East)
- Never modify/delete `id` / `data-*` / `onclick`

## Phase 2 — Settings UI

| Surface | Change |
|---------|--------|
| Cloud **Site identity** | `.ss-east-west-grid` + capped `.enterprise-form-control` |
| Cloud **Public access & topology** | same |
| Dashboard **Super admin / add operator** (`.ss-user-add`) | East-West grid + column labels + 420px caps |
| Protocol / LAN network grids | Same east-west + non-overlapping labels (stops “dying together”) |
| Site readiness / config status rows | `justify-content: space-between; align-items: center` |

**No** JS / API / ID / `data-*` / `onclick` changes.

## Verify

```bash
npm run verify:settings-grid-v4
```

## Operator check

1. Hard refresh (Ctrl+F5).
2. Cloud → Site identity + Public access: fields sit **side by side** on wide screens, label above each input, no overlap.
3. Dashboard Auth → add-operator / Super admin fields: same.
4. Site readiness rows: label left, Open/status right.
5. Save / Cancel still work.
