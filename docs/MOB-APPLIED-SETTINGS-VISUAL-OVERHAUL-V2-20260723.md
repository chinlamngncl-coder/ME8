# MOB-APPLIED — SETTINGS-VISUAL-OVERHAUL-V2

**Date:** 2026-07-23  
**Status:** APPLIED — operator visual PASS pending  
**Apply:** `MOB-EXECUTE-SETTINGS-VISUAL-OVERHAUL-V2`

## Scope (visual only)

| Section | Change |
|---------|--------|
| Type on BWC | Wrapped in `.enterprise-card.ss-type-on-bwc-card` (`--bg-surface`). `#server-setup-bwc` uses CSS grid `200px 1fr` on existing `dt`/`dd` (no JS edit). |
| Outbound email (SMTP) | `.enterprise-card` + `.enterprise-form-control` on inputs; `max-width: 400px`; `#ss-smtp-save` → `.btn-primary`, `#ss-smtp-test` → `.btn-secondary` (IDs unchanged). |
| Inbound services checklist | Card wrapper; `.cd-firewall-table` th/td use elevated header + border-bottom + `--space-md` padding. |
| Site readiness / Site configuration status | `#ss-site-readiness`, `#lab-readiness`, `#cd-readiness` → `.enterprise-card.ss-readiness-card`; list rows get padding, dividers, hover. |

## Safety

- **No** JS logic / API / form-submit changes (`server-setup.js`, `platform-smtp.js` untouched).
- **No** rename/remove of Save/Cancel/SMTP/Test IDs or `data-*`.
- **No** `100vh` / forced full-bleed wrappers on Settings main containers.
- Reverse-proxy polish copy kept.

## Verify

```bash
npm run verify:settings-overhaul-v2
npm run verify:settings-theme
```

## Operator check

1. Hard refresh (Ctrl+F5).
2. Server Config → Protocol → **Type on BWC** = neat 2-column card (not raw stacked text).
3. Dashboard Auth → **Outbound email** = card, short inputs, Save/Test buttons look correct and still work.
4. Cloud → **Inbound services checklist** = proper table headers/borders.
5. Site readiness rows = card with dividers; clickable rows still open the setting.
6. Main **Save server settings** / **Back to Settings** still work.
