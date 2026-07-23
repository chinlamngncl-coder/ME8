# MOB DISC — Same FAIL after successful restart (01:06)

**Date:** 2026-07-21 ~01:07  
**Status:** DISC only — **no APPLY**  
**Operator:** Screenshot again — pin top-left, no video. “Same fucked up.”

---

## Verdict

| Item | Fact |
|------|------|
| Did restart work? | **Yes.** Log `01:05:50` — `dashboard listening` from **this ME8 folder**. Service is up. |
| Did pin click start live? | **No.** From restart through ~01:07: **zero** `start-video` / **zero** `wvp video handoff start`. Only DeviceStatus. |
| Same as before? | **Yes — same product FAIL.** Restart fixed the bat path; **it did not fix pin-first live.** |
| Top-left jump? | Still **dock storm** / dock plan — separate from paint, still broken. |

**Translation:** Server is the right ME8. Pin opens **chrome only**. Live never starts → no BWC light → no picture. Dock still throws the tab to the corner.

---

## What the new screenshot proves

- Popup = Live video / Voice / PTT + DEVICE STATUS (time ~01:06:54).  
- **No** live picture.  
- Parked at **map top-left** (zoom controls), not by Chin/kk pins.  
- That matches: **open UI + bad dock**, **no** `start-video` in log.

---

## What is NOT true

- “Restart never happened” — it did (`01:05:50`).  
- “Old random folder” — listening path is ME8.  
- “No fix possible” — next MOB must make **pin click → start-video** visible in `fleet.log`, then mirror; then dock.

---

## One next APPLY (when you order)

**`MOB-APPLY PIN-CLICK-FORCE-START-VIDEO-AND-NO-TOPLEFT-DOCK-V1`**

Must do (dynamic `camId` only):

1. On marker pin click / popup ready: **always** call wall start + `start-video` for that camId under handoff (prove in log).  
2. Keep wait overlay until FLV prove → mirror.  
3. For a **single** open pin: **do not** run full colocated dock replan that snaps to top-left (or skip dock assign when cluster size 1 / first open).  
4. Cache bust. Fix `LAB-CONSOLE-START.bat` only if bundled — or keep using `RESTART-FLEET.bat` Run as admin.

**PASS:** pin-only click → log shows `wvp video handoff start` for that cam → wall Live → pin picture → popup near pin (not corner).

---

## You (until APPLY)

Nothing else to double-click for this FAIL. Restart already proved. Say the MOB-APPLY name above when ready.
