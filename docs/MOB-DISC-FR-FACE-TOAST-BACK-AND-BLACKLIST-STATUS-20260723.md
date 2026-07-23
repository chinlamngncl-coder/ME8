# MOB DISC — Colour toast PASS · Face popup back · was Blacklist fixed?

**Date:** 2026-07-23  
**Status:** PAPER — no code until `MOB-APPLY`  
**Prior:** `FR-GRADE-COLOUR-TOAST-NO-JUMP-V1` **PASS** (violet/slate/teal; no amber; soft grades no auto map)

---

## Short answers

| Question | Answer |
|----------|--------|
| Why is the **top-right popup** back on Face? | **On purpose in that APPLY** — soft grades (POI / monitoring / **suspect**) show the **colour** toast on Analytics Face so you can see slate/teal/violet. Only **Blacklist** float stays suppressed on Face (red HQ bar enough). |
| Did we “fix Blacklist” fully? | **Only part of it.** Blacklist: still **red**; **no** colour-toast change; auto **jump to map still ON** for Blacklist (by design for phase 1). Face still hides Blacklist float. **Pin takeover among 8 lives = not done** (phase 2). |
| Is HQ bar colour enough without popup? | **Yes** — bar already shows grade colour + name/%. Popup is duplicate on Face (same complaint as before). |

---

## What phase 1 actually changed

| Grade | HQ colour | Toast on Face | Auto → Ops/map |
|-------|-----------|---------------|----------------|
| POI | Slate | **Shows** (why popup returned) | No |
| Monitoring | Teal | **Shows** | No |
| Suspect | Violet | **Shows** ← your screenshot | No |
| Blacklist | Red | **Hidden** on Face | **Yes** (still) |

So: Suspect PASS on colour + no jump — popup is the trade-off we made so colour was visible. You prefer **no float on Face again**.

---

## Blacklist — what is / isn’t fixed

| Behaviour | Status |
|-----------|--------|
| Red (not violet) | OK |
| Soft grades don’t jump | OK |
| Blacklist still may jump to Ops | **Intentional** until you change it |
| Take over 1 of 8 wall pins + zoom | **Not APPLIED** — `FR-BLACKLIST-MAP-PIN-TAKEOVER-V1` |
| Zone Standby PTT polish | **Not APPLIED** — phase 3 |

---

## Recommended single next APPLY

**`MOB-APPLY FR-HIT-TOAST-SUPPRESS-ALL-ON-FACE-V1`**

On Analytics → Face: **hide floating toast for every grade** (POI / monitoring / suspect / blacklist).  
Keep **coloured HQ bar** (you already see “SUSPECT” / grade colour there).  
Toast still shows on Ops / Evidence / other tabs.  
Blacklist auto-map unchanged (phase 2 next).

**Why this first:** Matches your earlier PASS on toast suppress; colour lives on the bar; kills the right-rail cover again.

**Then:** `MOB-APPLY FR-BLACKLIST-MAP-PIN-TAKEOVER-V1` (8-slot steal + zoom).

---

## Operator check (no APPLY)

- Suspect on Face → violet **bar**, stay on Analytics → PASS (done).  
- Blacklist on Face → red **bar**, float hidden; may still switch to Ops if score gate met → expected today.

**Phrase when ready:** `MOB-APPLY FR-HIT-TOAST-SUPPRESS-ALL-ON-FACE-V1`
