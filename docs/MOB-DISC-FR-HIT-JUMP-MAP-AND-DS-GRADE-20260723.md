# MOB DISC — FR hit jumps to map + is “ds” really Blacklist?

**Date:** 2026-07-23  
**Status:** PAPER — no code until `MOB-APPLY`  
**Prior PASS:** `FR-LIVE-SNAP-FASTER-V1` (snaps feel faster) · toast suppress on Analytics Face  
**Operator:** (1) hit jumps straight to map — unexpected while watching Face; (2) grades were split suspect vs blacklist — is **ds** actually Blacklist?  
**Genre:** FR alert UX / watchlist grade (not snap speed, not redact)

---

## Short answers

| Question | Answer |
|----------|--------|
| Why jump to map? | **By design today** — `mob-fr-hit-go-ops`: on interrupt hit, if you are **not** on Ops / Command Wall / VC, auto switch to **Operations** and pan map (when GPS / score gate allows). |
| Did toast suppress stop the jump? | **No** — we only hid the floating toast on Analytics Face. **Auto go-ops still runs** from `showHit` → `goOpsOnHit`. |
| Are grades split? | **Yes in data + server** — `poi` / `monitoring` / `suspect` / `blacklist`. UI enroll has all four. |
| Is **ds** Blacklist? | **Very likely yes** if that row’s Watch grade is Blacklist **or** the row is **legacy** (no grade stored → code treats as **blacklist**). Confirm in Analytics → Watchlist (grade badge on **ds**). |
| Does “suspect” look different from blacklist today? | **Mostly no on toast** — amber-suspect toast MOB **not applied**; both still use the **red** HQ / interrupt path. Server already skips interrupt for **poi/monitoring** only. |

---

## 1) Why it jumps to the map

Locked earlier (`MOB-DISC-FR-ALERT-GO-OPS-MAP.md`): critical FR hit should not leave you trapped on Analytics without map context.

| Surface when hit fires | Auto jump to Ops + map? |
|------------------------|-------------------------|
| Operations / Command Wall / Conference | **No** (already “operational”) |
| Analytics Face / Verify / Watchlist / Evidence / Settings | **Yes** (for tiers that interrupt) |

**Who auto-jumps (client):**

| Watch grade | Urgency | Auto go-ops? |
|-------------|---------|--------------|
| `poi` | silent | **No** (no interrupt emit) |
| `monitoring` | low | **No** |
| `suspect` | medium | **Yes** (unless `FM_FR_AUTO_GO_OPS_SUSPECT=0`) |
| `blacklist` | high | **Yes** |

**Also gated by score:** auto map/tab only if score ≥ `FM_FR_MAP_AUTO_SCORE_MIN` (default **80**). Lower scores: HQ bar / rail still, but **should not** auto-tab (explicit **Go to map** still works).

So after snap-faster, if **ds** matches at **≥80%** and grade is suspect/blacklist while you are on Face watch → **tab steals you to Ops**. That feels worse now that Face watch works again.

**Not caused by** snap-faster FLV knobs — same `goOpsOnHit` path as before; you notice it more because hits fire again.

---

## 2) Grades: suspect vs blacklist (and “ds”)

### What exists today

| Grade | Meaning (product) | Interrupt (HQ / chime)? | Auto go-ops? |
|-------|-------------------|-------------------------|--------------|
| Person of interest (`poi`) | Soft watch | No | No |
| On monitoring (`monitoring`) | Soft watch | No | No |
| Suspect (`suspect`) | Medium | Yes (still **red** UI until amber MOB) | Yes |
| Blacklist (`blacklist`) | High / real alert | Yes red | Yes |

**Enroll UI default** for **new** entries = **Suspect** (dropdown).  
**Legacy rows** with missing `listStatus` → normalized to **`blacklist`** (do not silently soften) — `lib/frBlacklist.js`.

### How to know what **ds** is (operator, no APPLY)

1. Analytics → **Watchlist**.  
2. Find **ds**.  
3. Read **Watch grade** badge: Blacklist vs Suspect vs …  

| If badge says | Then auto jump + red HQ is |
|---------------|----------------------------|
| **Blacklist** | **Correct** for current rules |
| **Suspect** | Interrupt + jump also **correct today**; only colour/urgency polish still missing |
| **POI / Monitoring** | Should **not** jump or red HQ — if it does, that is a bug (report) |

Matching **does not** invent grade — it uses the enrolled row’s `listStatus`. Score % is separate from grade.

---

## What we will **not** do

- Turn off all FR alerts  
- Delete grade system  
- Bundle with redact / security  
- Assume **ds** is wrong without Watchlist check  

---

## Recommended single next APPLY (risk pick)

**`MOB-APPLY FR-HIT-STAY-ON-ANALYTICS-V1`**

When operator is already on **Analytics → Face** (live watch surface):

- **Do not** auto-switch to Operations / map on hit  
- Keep **HQ bar** + Known / Recent (and toast still suppressed on Face)  
- **Go to map** / **Open detail** / Standby PTT on HQ bar stay explicit  
- On Ops / other pages: keep today’s auto go-ops for suspect+blacklist  

**Why this first:** Matches toast-suppress intent — Face watch stays for recognition; map on demand. Low risk.

**Optional later (separate APPLYs):**

| MOB | When |
|-----|------|
| `mob-fr-amber-toast-suspect` | Suspect must **look** different from Blacklist |
| Edit **ds** grade in Watchlist | If **ds** should be Suspect not Blacklist — **data**, not code |
| `FM_FR_AUTO_GO_OPS=0` | Lab-only kill switch (no MOB) — turns off auto jump everywhere |

---

## Operator verify (after stay-on-analytics APPLY)

1. Ctrl+F5 → Face → Start watch → get hit on **ds**.  
2. **PASS:** stay on Analytics Face; top FR HIT bar still shows; no forced Ops tab.  
3. Click **Go to map** once → Ops + pin as before.  
4. From Ops, another hit may still auto-pan (expected).

---

## Related

| Doc | Role |
|-----|------|
| `MOB-DISC-FR-ALERT-GO-OPS-MAP.md` | Why auto Ops was added |
| `MOB-DISC-FR-GRADE-TIERED-ALERT-URGENCY.md` | Grade → urgency table |
| `MOB-DISC-FR-LIST-GRADE-TOAST-NOT-ALL-ALERTS.md` | Amber still missing |
| `MOB-APPLIED-FR-HIT-TOAST-SUPPRESS-ON-ANALYTICS-V1-20260723.md` | Toast only; not tab |

**Phrase when ready:** `MOB-APPLY FR-HIT-STAY-ON-ANALYTICS-V1`
