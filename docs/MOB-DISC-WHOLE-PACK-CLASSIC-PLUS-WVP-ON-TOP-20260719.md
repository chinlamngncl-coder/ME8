# MOB DISC — Whole pack broken · classic best + WVP on top (NO APPLY)

**Status:** DISC only — 2026-07-19 · **no code · no one-by-one APPLY spam**  
**Subject:** `MOB-DISC-WHOLE-PACK-CLASSIC-PLUS-WVP-ON-TOP`  
**Operator:** “Not one problem. Whole pack. No point solving one by one. We reverted the best thing already, then put WVP on top.”

---

## Verdict (agree with you)

**Correct.** What you are feeling is **not** “Call bug → then PTT bug → then SOS bug.”

It is one **pack / architecture** failure:

> **Classic ME8 (best working voice/SOS/PTT/Fleet marriage) was reverted/restored as the base, then WVP-ZLM was stacked on top without a single coherent “who owns the cam” contract.**

So the desk can show **live picture** (WVP layer) while **cold SOS / SOS / Call / PTT / cold PTT** (Fleet layer) stay dead. Patching ZLM-watch or panel CSS one MOB at a time **cannot** put the pack back together. That approach burns days and feels like sabotage even when each MOB is “locally logical.”

---

## What “the pack” is

| Layer | Job | When healthy |
|-------|-----|----------------|
| **A — Classic Fleet pack** | SIP contact, INVITE live, cold SOS, PTT channel, Call-via-PTT, GPS/telemetry marriage | One brain: cam ↔ Fleet |
| **B — WVP-ZLM pack** | GB REGISTER, startPlay, FLV, wall `<video>` | One brain: cam ↔ WVP |
| **C — Ops UI pack** | Wall/pin/Call/PTT buttons, SOS banner | Assumes A and/or B tell the truth about “live” |

**Best era you remember:** mostly **A** (classic) with UI that believed Fleet.

**Now:** **A partly still in code**, **B added on top**, UI and server gates **mixed**. Result = **picture from B, voice/SOS still expecting A.**

That is a **pack conflict**, not five unrelated bugs.

---

## Why one-by-one is the wrong strategy here

| One-by-one MOB | What it touches | Why it fails as strategy |
|----------------|-----------------|--------------------------|
| Panel 5+3 / aspect | UI layout | Irrelevant to dead SOS/PTT |
| ZLM-watch-register | Fake “live” for Call without INVITE | Cannot invent Fleet contact / PTT online / cold SOS |
| No-unregister-on-remount | Keeps that fake live from clearing | Still not the Fleet pack |
| Cover/contain | Pixels | Noise |

Each may be “true” in isolation. Together they **do not restore the pack**. Operator experience: “nothing works except live” — accurate.

**Stop stacking micro-APPLYs until a pack decision is locked.**

---

## What you already said (locked reading)

1. You **reverted to the best classic** (or intended to).  
2. Then **WVP was put on top**.  
3. Dual homes (**5060 WVP / 5062 Fleet**) + presence paint + ZLM-primary skip INVITE = **split brain**.  
4. You refuse endless “change this BWC to 5060” homework as the substitute for a real architecture.

Agree: **fix the pack**, don’t nag one cam.

---

## Pack options (choose later — still NO APPLY)

Only **one** of these should be the next genre — not a salad.

### Pack 1 — Classic first (Fleet owns marriage)

- Cams speak **Fleet** for SOS/PTT/Call.  
- WVP/ZLM = optional picture overlay **only if** it does not steal the marriage or skip Fleet live state.  
- Or: picture stays classic JSMpeg until WVP is proven without killing A.

### Pack 2 — WVP first (WVP owns marriage)

- Cams speak **WVP :5060** for video.  
- SOS/PTT/Call redesigned to **not** require Fleet SIP contact (or a real bridge is built once).  
- Huge genre — not a watch-register MOB.

### Pack 3 — Honest dual-home lab (two cams, two jobs)

- Cam A = WVP picture lab.  
- Cam B = Fleet SOS/PTT lab.  
- **No** claim that both get full pack on one device.  
- UI/docs say so so you stop expecting magic.

### Pack 4 — Freeze + restore known-good baseline

- Named restore only (e.g. classic-pass / Firmware Gold / your chosen phrase).  
- Then **one** pack genre from 1–3.  
- No drive-by ZLM microfixes in between.

---

## What agents must stop doing

- Selling “next small MOB will unlock everything.”  
- Mixing layout MOBs with voice/SOS pack.  
- Dictating BWC port changes as a substitute for pack choice.  
- Saying Call is “fixed” when only ZLM viewers flipped.

---

## What agents may do without APPLY

- Read logs, disc, baselines.  
- Answer “which pack is this symptom?”  
- Wait for your **pack letter** + named APPLY / RESTORE phrase.

---

## Suggested next operator line (when ready)

Pick **one**:

- `MOB-DISC` already done — next: **`MOB-APPLY pack-classic-first-…`** or  
- **`MOB-APPLY pack-wvp-first-…`** or  
- **`RUN RESTORE-…`** (your chosen baseline) then pack  
- or **`pack-honest-dual-home`** (document + stop cross-expecting)

Until then: **no more one-by-one voice patches.**

---

## Status

**DISC only.**  

**You are right:** whole pack issue = classic best + WVP on top without one owner.  
**One-by-one is the wrong tool.** Waiting for pack choice — not another micro-APPLY.
