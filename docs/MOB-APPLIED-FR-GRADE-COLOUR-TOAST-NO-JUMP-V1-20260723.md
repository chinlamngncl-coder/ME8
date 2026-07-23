# MOB APPLIED — FR-GRADE-COLOUR-TOAST-NO-JUMP-V1

**Date:** 2026-07-23  
**Phrase:** `FR-GRADE-COLOUR-TOAST-NO-JUMP-V1` (APPLY)  
**Disc:** `MOB-DISC-FR-GRADE-COLOUR-TOAST-MAP-TAKEOVER-ZONE-PTT-20260723.md`  
**Operator constraint:** **No amber** — amber already used for other lab functions.

## Colours (locked this MOB)

| Grade | Toast / HQ | Auto → map |
|-------|------------|------------|
| POI | **Slate** | No |
| Monitoring | **Teal** | No |
| Suspect | **Violet** (not amber) | No |
| Blacklist | **Red** | Yes (if score ≥ gate) |

## What changed

| Area | Change |
|------|--------|
| `public/js/fr-alarm.js` | Grade chrome on toast + HQ; auto go-ops **blacklist only**; soft beep for suspect; no chime for POI/monitoring; Face still suppresses **blacklist** float only |
| `public/index.html` | CSS grade classes; Watchlist badges teal/violet aligned |
| `lib/frAlertTier.js` | `shouldNotifyOperators` |
| `lib/frLivePoller.js` | All grades emit `fr-blacklist-hit` for colour toast (rail still for soft) |

**Cache:** `fr-alarm.js?v=20260723-fr-grade-colour-toast-no-jump-v1`

**Operator:** **PASS** 2026-07-23 — violet/slate/teal; soft grades no auto map.  
**Follow-up:** Face popup returned for soft grades — see `MOB-DISC-FR-FACE-TOAST-BACK-AND-BLACKLIST-STATUS-20260723.md`.
