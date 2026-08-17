# MOB-DISC — Settings: one form logic + SSO tab space + sticky heading

**Date:** 2026-08-17  
**APPLY (when operator says go):** `MOB-APPLY SETTINGS-LABEL-TOP-GRID-SSO-STICKY-V1`  
**Scope:** Settings UI only. CSS + small HTML/JS for tab placement. No APIs. No Evidence. No tables (Users / BWC stay tables).

## The one layout rule (Pic 7)

**Words on top. Box below.** Two equal columns. Same row = same baseline. One field on a row stays in the **left** column; the right cell is empty. Never label-to-the-left-of-the-box. Never a lone card floating right.

Checkboxes stay beside their text (not stacked). Password “Show” stays inside the box.

## Why it keeps failing

Not ten different designs. One CSS fight:

`.enterprise-card label { display: block !important; }` (global.css ~6718)

That **kills** `flex-direction: column`. Then `<span>Label</span><input>` sit **side by side**. Password fields still look like Pic 7 because they wrap the input in a **block** `.ss-pass-field` (Audit export token). Text/select fields do not, so they look broken.

## What is not unified today (from your shots)

| Place | Bug |
|---|---|
| LAN network / WAN | Label left, except IP assignment |
| Device registration address | Label left |
| Operator portal | Label left; not a 2-col row |
| Protocol (SIP) | Mix: most label-left, password on top → rows stagger |
| Resiliency | Label left |
| SSO (OIDC) | Mix; heading indent |
| SMTP (Site security) | Narrow card, sits right / not full 2-col |
| Audit export token | **Correct** (Pic 7) — the template |

Also same pattern likely: Identity, HQ/SIP listen, My account fields, Cloud site identity — anywhere a `<label><span>…</span><input>` sits in Settings without `.ss-pass-field`.

**Out of this MOB:** Users table, BWC table, Map Groups table, drawers.

## 2) SSO tab — space before the first S

Locale string is already `"SSO / Identity"` (no leading space). The extra gap is **padding / sticky chrome**, not a mystery character in JSON.

APPLY: same padding as **Site security** / **My account** (`padding: 7px 14px`); no extra left pad on `#ss-dash-sub-lab`; trim textContent if a space slipped in.

## 3) Site security sticky heading vs SSO

`#ss-dash-subtabs` is **inside** `#ss-panel-dashboard`. Site security **content** is also inside that panel, so the blue chips stick while you scroll.

SSO content is `#ss-panel-lab`, a **sibling below** dashboard. Scroll the SSO form and the sticky chips scroll away with dashboard. That is why you still “see Site security” as a heading and not SSO.

APPLY: move `#ss-dash-subtabs` **out** of dashboard, up next to `#ss-fleet-subtabs` (direct child of `#ss-panel-scroll`). Keep all six chips. Sticky `top: 0` on the scroll pane. SSO / Users / Site security all keep the same heading while scrolling. Do **not** hide the chips when Lab is open.

## Exact APPLY (one pass)

1. **Win the label war** in `global.css` (higher specificity than `display: block !important`):

   `#server-setup-panel .enterprise-form-grid > label`  
   + `#server-setup-panel .ss-east-west-grid > label`  
   → `display: flex !important; flex-direction: column !important; gap: 6px; align-items: stretch;`  
   Inputs/selects in those labels: `width: 100%`.  
   Checkboxes: keep row.

2. **SMTP / Operator portal:** full-width 2-col grid; no `max-width: 44rem` that parks the card on the right.

3. **SSO chip:** equal padding; no leading space.

4. **Move `#ss-dash-subtabs`** to `#ss-panel-scroll` (same level as fleet chips). JS: chips stay visible for `lab` as well as `site`.

## Operator PASS

1. Hard refresh. Settings → Infrastructure: LAN, WAN, Device registration — label above every box; two even columns; last odd field left-aligned.
2. Fleet → Protocol: SIP port / Realm boxes line up with the password box (no stagger).
3. Users & Security → Site security: chips stay visible while scrolling SMTP / Alerts.
4. Same chips → **SSO / Identity**: no gap before **S**; chips **stay visible** while scrolling the OIDC form; Issuer / Client ID on one row, both labels on top.
5. Resiliency + Operator portal: same logic.

## Out of scope

Route & GPS, Evidence hub, backend, path masking.
