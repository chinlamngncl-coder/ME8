# MOB DISC — FR lab preview buttons · not on customer ship

**Status:** **APPLIED** 2026-07-11 (`mob-fr-lab-preview-gate` in `860945e` lab-fr-alert-ui-1b) — MOB-APPLY confirmed 2026-07-13  
**Trigger:** Operator — “Preview alert (lab)” / “Preview toast (lab)” look like a university project; must not ship to customers  
**Search:** lab preview, ax-fr-preview-drawer, ship hide, dev tools, FM_LAB  
**Related:** `MOB-DISC-FR-NOT-MIXED-LIVE-SOS-PTT.md`, `MOB-DISC-CUSTOMER-FACING-NAMING.md`

---

## Verdict — you are right

These two buttons in the Analytics FR toolbar are **developer scaffolding** for Act 1 UI shells. They are **not** part of the operator product.

| Button | ID | What it does |
|--------|-----|----------------|
| **Preview alert (lab)** | `#ax-fr-preview-drawer` | Fake hit → opens alert drawer (no GPS, no map, no real PTT/field) |
| **Preview toast (lab)** | `#ax-fr-preview-toast` | Fake hit → red toast only |

They exist so we could **layout** drawer/toast without a live watchlist match. For customers, real hits are the only entry — showing “lab” in the label is unprofessional.

**Ship rule (locked):** Customer / trial-gold packs **must not** show these controls.

---

## What stays in production

| Surface | How operator sees it |
|---------|----------------------|
| Real watchlist match | Red toast + HQ bar + optional drawer |
| Toast **Detail** | Opens drawer on real hit |
| HQ bar **Open** | Opens detail (rename to **Details** — separate DISC) |
| No fake preview | — |

Lab preview logic in `fr-alarm.js` (`buildLabPreviewHit`, `_labPreview`) can remain **dead code behind flag** for ME8 dev — not reachable from UI on ship.

---

## Hide strategy (pick one — locked: A + C)

### A. Runtime gate (recommended first MOB)

**Flag:** `FM_FR_LAB_UI=1` (ME8 `.env` only; **unset / 0** in ship profile)

On `FrAlarm.init` or `analytics-hub.js` boot:

```javascript
if (process.env.FM_FR_LAB_UI !== '1') {
  // hide #ax-fr-preview-drawer, #ax-fr-preview-toast
}
```

Client: inject `window.FM_FR_LAB_UI` from server boot snippet (same pattern as other FM_ flags) **or** CSS `body:not(.fm-fr-lab-ui) #ax-fr-preview-drawer { display: none }` with class set server-side.

**Pros:** One MOB, no pack script change for daily lab.  
**Cons:** Buttons still in HTML source (harmless if hidden).

### B. Ship pack strip

Add to `pack/me8-fresh/SHIP-CONFIDENTIAL-DENYLIST.json` / ship script:

- Strip lines containing `ax-fr-preview-drawer` and `ax-fr-preview-toast` from shipped `index.html`
- Or remove `previewDrawerLab` / `previewToastLab` i18n keys from customer locales

**Pros:** Clean customer HTML.  
**Cons:** Pack pipeline change; keep ME8 dev tree with buttons.

### C. Tech-only role (optional later)

Only `tech` / `admin` role sees lab tools. Heavier than needed for two buttons — **park** unless you want one “Lab tools” pattern for ZLM bench etc.

**Locked:** **A for ME8 daily** + **B at customer pack** before ship.

---

## MOB plan

| # | MOB | Delivers |
|---|-----|----------|
| **1** | **`mob-fr-lab-preview-gate`** | Hide preview buttons unless `FM_FR_LAB_UI=1`; document in ME8 `.env.example` |
| **2** | **`mob-ship-strip-fr-lab-ui`** | Ship denylist / pack script removes preview buttons from customer `index.html` |
| **3** | **`mob-fr-lab-preview-dev-menu`** (optional) | Move previews under Settings → Developer (tech gate) instead of main FR toolbar |

**Not in ship genre:** Do not wait for #3 — #1 + #2 are enough.

---

## PASS checkpoint — `mob-fr-lab-preview-gate`

1. ME8 with `FM_FR_LAB_UI=1` → buttons visible; preview drawer/toast still work.
2. Unset flag + restart → buttons **gone** from FR toolbar.
3. Real FR hit still shows toast + drawer — unchanged.
4. Customer ship profile `.env` has no `FM_FR_LAB_UI` — operators never see lab chrome.

---

## Apply command

```
MOB-APPLY mob-fr-lab-preview-gate
```

Before customer pack:

```
MOB-APPLY mob-ship-strip-fr-lab-ui
```

---

## Copy cleanup (when gating)

| Today | Ship |
|-------|------|
| `Preview alert (lab)` | Hidden |
| `Preview toast (lab)` | Hidden |
| `Layout preview only — not a real match` | Dev toast only — never customer-facing |

---

## FAQ

| Question | Answer |
|----------|--------|
| Will we lose layout testing? | ME8 lab keeps `FM_FR_LAB_UI=1`; or use real hit in lab |
| Does lab preview test map? | **No** — fake hit has no GPS; map MOB uses real hits (`MOB-DISC-FR-MAP-BUTTON-GO-OPS-PIN.md`) |
| University project feel? | Lab labels on a production toolbar — **remove at ship**, not rebrand |
