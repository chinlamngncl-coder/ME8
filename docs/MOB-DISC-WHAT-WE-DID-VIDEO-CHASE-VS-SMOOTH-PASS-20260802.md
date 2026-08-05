# MOB DISC — What we did to video, what already PASSed, how to get smooth back

**Date:** 2026-08-02  
**Status:** DISCUSSION ONLY — no code until you say MOB-APPLY  
**Audience:** Operator (plain English)

---

## What you asked

Explain clearly:

1. What we changed that made video jerk.  
2. Yes, ZLM/lab also had “chase” before — what was that?  
3. What is the **exact PASS setup** you were using smoothly until recently?  
4. Give the **names / dates** so we can go back to that.

---

## Short answer first

The smooth Ops / pin / Command Wall / FR path you were living on was **not** the aggressive chase we added tonight.

It was:

**WVP handoff → ZLM FLV link → plain `attachFlvPrimary` player (mpegts) → pin mirrors the wall picture.**

Hard player chase stayed **off**. Soft catch-up existed mainly on the **lab test tiles** (gentle settings), and later a softer wall overlay chase — **not** the brutal 0.5-second / 2-second chase we put under every panel tonight.

Tonight’s **Axiom stream manager** put that aggressive chase under **every** panel that uses the shared FLV attach. That is why everything jerks.

---

## Timeline in plain English (what is written down)

### A. Firmware Gold (6 July 2026) — pin rule (still locked)

- Tag / name: **`me8-firmware-gold-20260706`**
- Meaning: **wall owns the live picture**; **map pin only copies** that picture (`startMapMirrorFromWall`). No second live player on the pin.
- At that time the wall was still classic Fleet JSMpeg. The **pin rule** stayed when we moved to WVP.

Restore phrase (you only): `RUN RESTORE-ME8-FIRMWARE-GOLD`

---

### B. Lab ZLM tiles — “chase” experiments (mid July)

These were for the **hidden lab two-tile tester**, not the whole dashboard rewrite.

| Name | Date | What it did |
|------|------|-------------|
| **`mob-wvp-lab-mpegts-live-chase`** | 15 July 2026 | Soft catch-up on **lab tiles only**: speed up a bit if lag &gt; **1.5 seconds**; emergency jump only if lag &gt; **10 seconds**. Hard mpegts chase stayed **off**. |
| Lab PASS feel | written in that APPLIED note | About **2–5 seconds** lag typical; no “minutes behind” from chase |

So yes — ZLM **did** have chase — but **lab tiles**, gentler numbers, and it was allowed to be reverted if it hitching or caused minutes of lag.

Hard mpegts “live buffer latency chasing” / stash tricks were tried in Gate B history and **caused minutes of lag**. Those stay **forbidden**. That is written in the latency park / PASS notes.

---

### C. Old wall “soft ZLM overlay” chase (16 July 2026)

| Name | Date | What it did |
|------|------|-------------|
| **`mob-wall-soft-zlm-live-chase-v1`** | 16 July 2026 | Copied the **gentle** lab catch-up onto the old wall **soft overlay** path only (`softAttachZlmOverlay`). Soft at **1.5 s**, hard jump at **10 s**. Hard mpegts chase still **off**. |

This was for the older “soft upgrade to ZLM” wall path — **before** the main handoff FLV-on-ready path took over Ops.

---

### D. The stack you used smoothly for Ops / multi-panel (from ~20 July 2026) — THIS IS THE ONE

When WVP handoff is on (`FM_WVP_VIDEO_HANDOFF`):

1. Camera play → WVP → browser gets an **FLV link** from ZLM.  
2. Dashboard mounts that with **`attachFlvPrimary`** (file: `live-player-factory.js`).  
3. That player is plain mpegts: live FLV, **audio off** (G.711 breaks the browser), **hard chase off**.  
4. Pin still **mirrors** the wall video (Firmware Gold rule + later pin-FLV-mirror harden).  
5. Command Wall / FR / popouts were taught the **same attach** pattern.

| Name (the important one) | Date | Role |
|--------------------------|------|------|
| **`MOB-APPLY-BACKEND-VIDEO-UI-FLV-ON-READY-V1`** | **20 July 2026** | Ops wall: on handoff, mount FLV **immediately** with `attachFlvPrimary`. Skip JSMpeg underlay. Cache note: `?v=20260720-flv-on-ready-v1` |
| **`MOB-APPLY MPEGTS-AUDIO-DROP-AND-MUTED`** | 20 July 2026 | Keep picture alive (drop G.711 audio in FLV) |
| **`COMMAND-WALL-FLV-HANDOFF-V1`** | 20 July 2026 | Command Wall same attach |
| **`FR-LIVE-WATCH-FLV-HANDOFF-V1`** | 20 July 2026 | Face Recognition live tiles same attach |
| **`PIN-FLV-MIRROR-HARDEN-V1`** (and parent pin mirror from video) | 20 July 2026 | Pin copies wall FLV video — still **one** stream |

**Latency closed as PASS for that WVP/ZLM path:**  
**`MOB-DISC-ZLM-WVP-LATENCY-PASS-20260729.md`** — **29 July 2026** — you said latency was gone / passed. Rule: do **not** reopen hard mpegts chase / stash experiments.

That combination — **handoff FLV + plain `attachFlvPrimary` + pin mirror + hard chase off** — is what you were running **smoothly** for daily Ops. That is the “number” / names to check out.

---

### E. What we did wrong tonight (2 August 2026)

| Name | What we did |
|------|-------------|
| **Unified Axiom Stream Engine** (`shared-flv-player.js` / `AxiomFlvManager`) | Put **aggressive** soft-chase under **all** `attachFlvPrimary` users |
| Chase numbers tonight | Speed up at only **0.5 seconds** lag; jump at **2 seconds** — much harsher than lab’s 1.5 / 10 |
| Who got hit | Operations wall, Command Wall, Face Recognition, ANPR, Tactical — anything using the shared factory |
| Why pin jerks too | Pin does not have its own chase — it **copies** the wall. Wall jerks → pin jerks |

So: we did **not** invent a better WVP method. We put a **new chase layer** on top of the method that already PASSed.

---

## Side-by-side (so it is obvious)

| | Lab chase (July 15) | Wall overlay chase (July 16) | Smooth Ops handoff (July 20 → July 29 PASS) | Tonight Axiom |
|--|---------------------|------------------------------|-----------------------------------------------|---------------|
| Where | Lab test tiles | Old soft wall overlay | **Ops / CW / FR attachFlvPrimary** | **All those + more** |
| Soft speed-up | after **1.5 s** | after **1.5 s** | **none** (plain play) | after **0.5 s** |
| Jump | after **10 s** | after **10 s** | **none** | after **2 s** |
| Hard mpegts chase | off | off | **off** | off (but soft chase does the damage) |
| Feel | lab OK | optional | **smooth daily use / latency PASS** | **jerking** |

---

## What “go back to smooth” means (recommendation)

Put the player back to the **July 20 handoff attach** behavior:

- Still WVP + ZLM FLV (do **not** turn handoff off).  
- Still `attachFlvPrimary`.  
- **No** aggressive soft-chase under it.  
- Pin stays Firmware Gold mirror.  
- Do **not** turn hard mpegts chase back on.

Suggested APPLY name:

### `RESTORE-WVP-FLV-ATTACH-SMOOTH-V1`

(Only after you say MOB-APPLY — this disc does not change code.)

---

## How you can check the papers yourself

| What | File |
|------|------|
| Firmware Gold pin rule | `BASELINE-ME8-FIRMWARE-GOLD.md`, `docs/ME8-FIRMWARE-GOLD-LOCKED.md` |
| Lab chase MOB | `docs/MOB-APPLIED-WVP-LAB-MPEGTS-LIVE-CHASE.md` |
| Wall overlay chase MOB | `docs/MOB-APPLIED-WALL-SOFT-ZLM-LIVE-CHASE-V1.md` |
| **Smooth Ops FLV attach (main)** | `docs/MOB-APPLIED-BACKEND-VIDEO-UI-FLV-ON-READY-V1-20260720.md` |
| Latency PASS closed | `docs/MOB-DISC-ZLM-WVP-LATENCY-PASS-20260729.md` |
| WVP stays / fix Fleet surfaces | `docs/MOB-DISC-WVP-HARM-100-CONSOLIDATION-FIX-PLAN-20260720.md` |

---

## One sentence

**Smooth = July 20 WVP FLV-on-ready attach (plain player). Lab had gentle chase. Tonight’s Axiom aggressive chase is what broke smoothness — that is not the PASS method.**
