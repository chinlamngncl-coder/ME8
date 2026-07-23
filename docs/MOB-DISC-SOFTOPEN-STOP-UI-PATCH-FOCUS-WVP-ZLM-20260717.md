# MOB DISC — Stop Soft Open UI patch storm · focus WVP/ZLM

**Date:** 2026-07-17  
**Status:** DISC — strategy lock  
**Trigger:** Operator: baselines/commits already stable — why keep patching Soft Open UI to death? Bring logic back; focus WVP and ZLM.

---

## Honest answer

| Layer | What “stable” means |
|-------|---------------------|
| **Firmware Gold / classic Fleet** | Pin mirror from **JSMpeg wall canvas**, Open All, PTT, SOS chrome — **do not keep reinventing** |
| **Soft Open (WVP-only picture)** | **New path** — no Fleet INVITE under Soft Open; mpegts `<video>` + pin mirror from video. Gold never had this stack |

So we are **not** endlessly re-breaking gold pin logic for fun. Soft Open **reused** pin Stop / user-stop / fan / ghost helpers that assume Fleet JSMpeg. Each Soft Open MOB was fixing **coupling** Soft Open introduced (pin Stop killed wall ZLM, reopen rebuilt fan, sticky user-stop after pin Stop, etc.).

**You are right that this genre must stop.** UI band-aids do not fix **Busy Here 486**, FLV stall, or dual Soft Open media health.

---

## What to freeze vs what to do next

### Freeze Soft Open UI genre (after tonight’s pin-revive APPLY)

Treat as **done enough** unless a clear PASS/FAIL regression:

- pin-stop spare wall  
- reopen no fan storm  
- kill broker reopen storm (same-URL recover)  
- click lock  
- zombie destroy + attach generation  
- panel play clears pin user-stop  

**Do not** stack more Soft Open chrome MOBs (OSD copy polish, fan micro-tweaks, etc.) without an explicit new disc.

### Focus next (real product)

| Priority | Work |
|----------|------|
| 1 | WVP **Busy Here / session** — one startPlay, no herd, clean stopPlay |
| 2 | ZLM media health — publisher pause / `continue_push_ms`, FLV stay alive |
| 3 | Optional GB-only Soft Open soak (picture only) |
| 4 | SOS-while-live = **separate genre** (YDT / companion) — not Soft Open UI |

### “Bring the logic back”

- **Classic Fleet live:** already in baselines — Soft Open off → gold pin+wall behavior.  
- **Soft Open:** cannot “restore gold pin player” without abandoning Soft Open picture (pin must mirror wall **video**, not second JSMpeg).  
- Restore = **stop inventing Soft Open UI**; keep Soft Open attach thin; put energy in WVP/ZLM.

---

## One line

**Soft Open UI patching should stop; stable baselines own Fleet gold — next work is WVP/ZLM media, not more pin chrome band-aids.**
