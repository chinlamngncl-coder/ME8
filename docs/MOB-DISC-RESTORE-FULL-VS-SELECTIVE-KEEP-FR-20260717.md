# MOB DISC — Full restore (lose FR/redact?) vs only bring back live / wall / PTT / call

**Date:** 2026-07-17  
**Status:** DISC — plain choice  
**Ask:** Restore everything and lose redaction / FR / all work? Or only bring back live, wall, PTT, call?

---

## Short answer

| Option | Lose FR / redaction / later work? | Bring back live / wall / PTT / call / SOS? |
|--------|-----------------------------------|--------------------------------------------|
| **A — Full Firmware Gold restore** (2026-07-06) | **YES — almost everything after 6 Jul is gone** | YES — gold live/pin |
| **B — Full Pre-Gate-C restore** (2026-07-14) | **Much later work kept; Soft Open mess after 14 Jul gone** | YES — closer to mid-July |
| **C — Selective (recommended)** | **NO — keep FR / redaction / other files** | YES — only put back live/wall/PTT cores |

**You do not have to choose A.**  
You can choose **C**: only fix the broken live stack; keep FR and redaction.

---

## What “full restore” really does

It copies the **whole snapshot** over ME8.

- **Firmware Gold** = frozen **6 July** → wipes Soft Open **and** anything built after that (likely FR / redaction if they came later).  
- **Pre-Gate-C** = frozen **14 July** → keeps more of July; still drops Soft Open work from **15–17 July**.

Full restore = big hammer. Use only if the whole tree is trash.

---

## Option C — only bring back functions (recommended)

**Idea:** Put back **only** Soft Open–hurt files from a good baseline. Leave FR / redaction / evidence alone.

Typical Soft Open–hurt area (live / wall / Soft Open):

- `public/js/video-wall.js`  
- `public/js/live-player-factory.js` (if present in baseline)  
- maybe pieces of `public/index.html` / `server.js` / broker — **only if Soft Open changed them**

**Not touch** (unless you say so): FR engine, redact UI, evidence, settings, SOS ledger files that Soft Open never owned.

Also: turn Soft Open / lab WVP flags **OFF** so normal Fleet live runs.

This needs a **named APPLY** when you are ready, e.g.  
`MOB-APPLY restore-live-cores-from-pre-gate-c-keep-fr`  
(not freestyle).

---

## What I recommend

1. **Do not** full Firmware Gold unless you accept losing post–6 Jul work.  
2. Prefer **C** — selective live/wall/PTT restore + Soft Open OFF.  
3. Or **B** Pre-Gate-C full if you trust 14 Jul as “whole desk good” and Soft Open after that is the only poison.

---

## You pick one word

| Say | Meaning |
|-----|---------|
| **SELECTIVE** | Keep FR/redact; only restore live/wall/PTT cores (named APPLY next) |
| **PRE-GATE-C** | Full restore to 14 Jul (`RUN RESTORE-ME8-PRE-GATE-C`) |
| **FIRMWARE-GOLD** | Full restore to 6 Jul (`RUN RESTORE-ME8-FIRMWARE-GOLD`) — biggest loss |

---

## One line

**No — you need not lose FR/redaction; full restore loses a lot; selective restore of live/wall/PTT only is the safer YES.**
