# MOB DISC — Plain English: what is going on (Soft Open)

**Date:** 2026-07-17  
**Status:** DISC only — calm, simple  
**For:** Operator who asked to stop jargon

---

## What you have (two modes)

### Mode A — Normal Fleet live (old / gold)

- Press Play → camera talks to **Fleet**  
- Picture on wall + pin works the way you already know  
- Baselines / commits protect this  

### Mode B — Soft Open (new lab mode)

- Press Soft Open → camera talks to **WVP** (not Fleet invite)  
- Picture comes from **WVP → ZLM**  
- Pin tries to **copy** the wall picture  

Soft Open is **new**. It is not the same as Mode A. That is why new bugs showed up.

---

## What broke (in plain words)

1. **Stop on pin** was also killing Soft Open wall picture → we fixed that (pin stop should only shrink pin).  
2. After you **Stop pin**, then **Stop panel**, then **Play panel** — pin stayed dead → we just fixed that (panel Play should wake pin again).  
3. Video **dies / signal lost** while Soft Open runs → that is mostly **WVP/ZLM / network**, not “pin button” logic.  
4. **SOS while video is on the camera** → different problem (button path). Not Soft Open picture.

---

## What I said wrong for you

I used too many names (zombie, generation, fan storm, keepalive).  

You only need to know:

| You see | Meaning |
|---------|---------|
| Soft Open | New WVP picture mode |
| Normal Play / Open All | Old Fleet mode (gold) |
| Pin Stop | Should only close pin video |
| Panel Play | Should show wall **and** pin again |
| Signal lost / unstable | Soft Open media path still weak — next work is WVP/ZLM, not more pin buttons |

---

## What we should do next (one sentence)

**Stop changing Soft Open pin/UI. Test Soft Open picture. If picture fails, fix WVP/ZLM only.**

---

## What you do now (test the last fix only)

1. Hard refresh once.  
2. Soft Open one cam.  
3. Pin **Stop live** → wall should still show picture.  
4. Panel **Stop** → Panel **Play**.  
5. Pin should show picture again.

Pass or Fail — that is enough. Say PASS or FAIL.

---

## One line

**Soft Open = new WVP picture; pin should follow wall; stop patching pin chrome — next is WVP/ZLM if picture still dies.**
