# MOB-DISC — Settings FAIL follow-up (gaps, My account, fill page, SSO SS)

**Date:** 2026-08-17  
**APPLY:** `MOB-APPLY SETTINGS-GAP-TOGGLE-SSO-V2`  
**Scope:** `#server-setup-panel` only. CSS + tiny Settings HTML/JS. No Evidence. No Tactical. No APIs. No `.cursorrules`. Unify.css **last** for chip/BWC so global.css cannot lose.

V1 FAIL: SSO was treated as a space *before* S. That was wrong. The gap is **between 1st S and 2nd S** (font tracking on `SSO`). Padding/trim cannot fix it.

## 1) Auto-provision glued to Admin groups

`#lab-oidc-auto-provision` label sits on the input.

APPLY: `#server-setup-panel label[for="lab-oidc-auto-provision"]` — the label has no `for`; use  
`#server-setup-panel #ss-panel-lab label.ss-lab-check:has(#lab-oidc-auto-provision) { margin-top: 16px !important; }`  
in **unify.css**.

## 2) My account — empty far right

`#ss-my-account-info` uses `column-width: 260px` → on a wide screen **5 columns**, last column one field.

APPLY (Settings CSS only): `column-count: 4; column-width: auto;` on `#server-setup-panel #ss-my-account-info.ss-my-perms`. Keep dt/dd `break-inside: avoid`. Card `height: auto` (hug). No 5th empty strip.

## 3) One page — no scroll when content fits

Same idea as Route & GPS fill-then-scroll, **Settings only**.

APPLY: `#server-setup-panel #ss-panel-scroll` fills leftover workspace; `overflow-y: auto`; **no min-height** that is taller than the window. Scroll **only** when the open tab’s content is taller than the leftover. Short tabs (My account, Identity) = no scrollbar.

## 4) TYPE ON BWC still glued + empty right inside the grey card

V1 `margin-top: 24px` collapsed against the protocol field above. Grid is `200px 1fr` so short values leave the **right half of the grey card empty**. Card also `max-width: 40rem`.

APPLY in **unify.css** (last):
- Card: `margin-top: 32px; padding-top: 20px;` (padding so margin cannot collapse). Drop `max-width: 40rem`.
- `#server-setup-bwc.ss-type-on-bwc-grid`: `grid-template-columns: max-content 1fr max-content 1fr;` (two label/value pairs per row). Do not change SIP field ids.

## 5) SSO — 1st S vs 2nd S (one-time, real)

Locale is already `SSO / Identity`. Not a leading space.

APPLY in **unify.css last** (beats everything):
```css
#server-setup-panel #ss-dash-sub-lab {
  letter-spacing: -0.08em !important;
  font-kerning: none !important;
}
```
Chip text stays `SSO / Identity`. Do not invent a new label.

If i18n later rewrites the button, keep the same three letters; JS trim stays.

## Out of scope

Evidence, Tactical, user-drawer master ALL, backend, `.cursorrules`.

## Operator PASS

1. Auto-provision toggle not touching Admin groups.  
2. My account: four even columns, no empty far-right strip.  
3. Short Settings tab: **no** page scrollbar. Long tab: scrollbar only then.  
4. Gap between Alt SIP password and TYPE ON BWC; grey card fields fill left **and** right.  
5. Chip **SSO** — no hole between the two S letters.
