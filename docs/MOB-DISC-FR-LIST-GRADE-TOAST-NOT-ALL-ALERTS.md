# MOB DISC — Watchlist grades: toast colours / popups, not all “alerts”

**Status:** DISC only — **no APPLY** until you name a MOB  
**Date:** 2026-07-13  
**Trigger:** CHECKPOINT FAIL no match + “did we differentiate list? not all hits = alerts — maybe coloured toast/popup only”  
**Related:** `MOB-DISC-FR-GRADE-TIERED-ALERT-URGENCY.md` (parent design), `lib/frAlertTier.js`, `lib/frLivePoller.js` `emitHit`

---

## Short answers

### 1) CHECKPOINT FAIL — no match

**Not a list-grade bug.** Lab gallery entry `sss` is already:

| Field | Value |
|-------|--------|
| `engine` | `onnx` |
| `model` | `buffalo_sc` |
| dims | **512** |
| `listStatus` | **blacklist** |
| photo | present |

Self-check: ONNX `/represent` on that enroll photo returns the **same** vector family as stored (dims aligned). So **migrate/re-enroll dim mismatch is not the blocker**.

Live “no match” means probe score stays **&lt; threshold** (default `FM_FR_MATCH_MIN=75`, UI slider can be higher). Typical causes:

- BWC face ≠ enroll photo (angle / distance / blur / partial face)
- Probe quality gate drops frames before match
- Wrong person vs enroll “sss”
- Watching cam not actually on FR watch slots

**Next debug (no MOB yet):** while FR watch is on, check Snapshot rail for crops + any score%; or lower threshold temporarily to see if scores appear at all (e.g. 60s). If rail never shows a face crop → grab/probe path. If crops appear with score &lt;75 → recognition gap, not alert UX.

### 2) Did we differentiate the list?

**Partially — server gate yes; coloured toast / soft popup no.**

| Grade | Urgency (code) | Today (APPLIED) | Still missing (DISC) |
|-------|----------------|-----------------|----------------------|
| `poi` | silent | **No** red toast / HQ / voice — rail + ledger only | Subtle rail badge polish |
| `monitoring` | low | Same as poi (no interrupt emit) | Gold rail border |
| `suspect` | medium | **Still full interrupt** → same **red** toast path as blacklist | **Amber** toast + soft beep; no siren |
| `blacklist` | high | Red toast + HQ + chime + auto go-ops | Keep as “real alert” |

Code already in tree:

- `lib/frAlertTier.js` — grade → tier  
- `mob-fr-alert-tier-server` — `poi` / `monitoring` **skip** `fr-blacklist-hit` (rail only)  
- `mob-fr-go-ops-by-tier` (client) — auto Ops only medium/high  

**Your enroll is `blacklist`**, so even with perfect match you would get the **full red alert** path. Grade differentiation does **not** soften blacklist.

---

## Locked product direction (confirm)

Matches your ask: **not every list row is an “alert”.**

| Grade | Operator experience (target) |
|-------|------------------------------|
| POI | Quiet — rail / ledger only |
| Monitoring | Quiet+ — rail highlight, optional small badge, **no** toast |
| Suspect | **Investigate** — coloured (amber) toast + optional soft popup / HQ strip — **not** SOS-class alert |
| Blacklist | **Alert** — red toast + chime + HQ bar + field actions |

**Rule:** Grade changes **response**, never match math. Same `matchProbe` for all.

---

## Gap vs your “toast colours and popup, not alerts”

Parent DISC already named the remaining MOBs. Closest to your wording:

| # | MOB-APPLY | What you get |
|---|-----------|--------------|
| *(done)* | `mob-fr-alert-tier-server` | POI/monitoring never interrupt |
| **A** | `mob-fr-amber-toast-suspect` | Suspect = amber toast/popup shell; blacklist stays red |
| **B** | `mob-fr-chime-by-tier` | Chime only blacklist; soft beep suspect; mute poi/monitoring |
| *(done-ish)* | `mob-fr-go-ops-by-tier` | Auto map only suspect+blacklist |

**Do not** APPLY until match PASS (or you explicitly skip match and want UX-only).

Optional later: soft “popup” = non-blocking toast only (no auto drawer) for suspect — already in parent DISC (“no auto-open drawer” for medium).

---

## Apply order (after match works)

```text
MOB-APPLY mob-fr-amber-toast-suspect
MOB-APPLY mob-fr-chime-by-tier
```

If you want POI/monitoring to show a **tiny coloured chip toast** (not silent): say so — that would be a **new** MOB (`mob-fr-soft-toast-monitoring`) and **contradicts** current silent rule; DISC would need a re-lock.

**Where quiet grades live (eviction):** see `MOB-DISC-FR-HITS-STRIP-VS-ROLLING.md` — Hits strip vs rolling Recent; without it, poll wash buries poi/monitoring/suspect cards.

---

## Bottom line

| Question | Answer |
|----------|--------|
| Re-embed broken? | **No** — gallery is ONNX 512 |
| Why no match? | Live score &lt; threshold / probe domain — not grade UX |
| List differentiation done? | **Half** — silent for poi/monitoring; suspect still looks like blacklist red |
| Your ask (colours / popup ≠ alert)? | **DISC locked** — next UX MOBs = amber suspect + chime-by-tier |

**One next step for FAIL:** prove a score number on a live crop (rail or logs). Then either lower threshold / re-photo enroll, or APPLY amber toast only after match PASS.
