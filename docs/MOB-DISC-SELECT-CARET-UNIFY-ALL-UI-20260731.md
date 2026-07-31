# MOB DISC — Unify visible dropdown caret across all Axiom UI

**Date:** 2026-07-31  
**Status:** DISC only — **no code until** `MOB-APPLY` named below  
**Operator:** Plate lists caret **PASS**. Now: **same look for every dropdown in the product.**  
**Done (do not redo):** `SELECT-CARET-VISIBLE-OVERLAY-V1` — Analytics Watchlist + Plate lists only  
**Related:** `MOB-DISC-SELECT-CARET-VISIBLE-OVERLAY-V1-APPLIED-20260731.md` · dark form unify · compact controls (no full-width tab bars)

---

## Got it (lock)

- Visible light ▼ on the right = **product rule** for every single-choice `<select>` operators use.  
- Dark field, no white OS arrow patch.  
- Compact where toolbar/filter (not east–west stretch). Form fields stay capped (`max-width` ~400–420), not infinite bars.  
- Agent must not ship a new panel with bare selects that look like tabs again.

---

## Inventory (checked)

Already wrapped (PASS surface):

- Watchlist grade / reason / grade filter  
- Plate lists List grade / Reason / grade filter  

**Still bare** (static `index.html` + other shells + JS-built HTML):

| Area | Examples |
|------|----------|
| Ops / map sidebar | fleet filter, circle, PTT/Call group, SOS radius, map BWC target, geofence filters, header lang |
| Settings / Server | deployment, LAN IP mode, SIP/ONVIF transport, timezone, role, SMTP secure, OTA, Cloud deployment |
| Audit | report type, category, action filters |
| Tactical | blueprint, POI fixed, AR cam/preset |
| Evidence / case | period, status, holds, dock, device, redact/detail selects (JS) |
| Conference / VC | BWC / fixed camera / settings selects (JS) |
| Fixed cameras / WVP lab | form selects in modals |
| FR live | roster filter (JS) |
| BWC devices table | protocol / PTT mode cells (JS) |
| Login / setup-boot | language, tier |
| Map GIS | country select (JS) |

Lab-only `test-*.html` = optional / last; not customer face.

Hand-wrapping every tag + every JS template = miss forever. Dynamic HTML will regress.

---

## What we will do (one recommendation)

### Named APPLY

**`SELECT-CARET-UNIFY-ALL-UI-V1`**

### Method

1. **Keep** existing `.ax-select-wrap` + `::after` light caret (`#e2e8f0`) in `global.css` (already PASS on Analytics).  
2. Add a small **boot helper** (e.g. `public/js/ax-select-wrap.js`) that:
   - Finds `select:not([multiple])` that are visible / not `hidden` / not `aria-hidden="true"`
   - Skips if already inside `.ax-select-wrap`
   - Wraps in `<span class="ax-select-wrap">`
   - Re-runs on **MutationObserver** (or after known hub renders) so JS-injected selects get the same caret  
3. Wire the script on **main shell** (`index.html`) and customer-facing shells that have selects (`login.html`, `setup-boot.html`, `command-centre.html` if needed).  
4. CSS polish so wrap does **not** break layout:
   - Toolbar / sidebar selects → compact wrap (content / existing max-widths)  
   - `.form-control` / `.enterprise-form-control` → wrap `width: 100%` with same max-width cap as today (no full-page stretch)  
5. Do **not** invent a custom JS dropdown component. Native `<select>` stays. IDs / `data-*` unchanged.  
6. Cache-bust `global.css` + new JS.

### Out of this MOB

- Redesign forms / new features  
- Changing option lists or i18n  
- Merging ANPR into FR  
- Lab `test-wvp-tile.html` unless trivial (same helper if linked)

### Operator PASS (spot-check, not every ID)

1. Hard refresh.  
2. **Ops:** Fleet filter / PTT group / map BWC — clear ▼.  
3. **Settings:** any Server Config select — clear ▼, dark, not a white arrow.  
4. **Evidence:** period / status filter — clear ▼.  
5. **Analytics:** Plate lists still PASS (no regression).  
6. Open a select — list still works.

---

## Why auto-wrap (not 80 hand edits)

| Hand-wrap only static HTML | Auto-wrap + observer |
|----------------------------|----------------------|
| Misses Evidence/VC/BWC table JS | Catches them |
| Next MOB forgets again | Default forever |
| Huge diff, easy to break IDs | IDs stay on `<select>` |

Disc is useless if the next panel ships without caret. Helper = the unify.

---

## APPLY line

```
MOB-APPLY SELECT-CARET-UNIFY-ALL-UI-V1
```

After PASS: any new select in product UI must either use the helper path or explicit `.ax-select-wrap` — bare tab-like selects are a hard fail.
