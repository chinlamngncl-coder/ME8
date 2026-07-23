# MOB DISC — Agent wrong: killed baseline pin open · bring baseline back

**Date:** 2026-07-20 ~23:42  
**Status:** LOCKED — agent mistake; **paper only until APPLY**  
**Operator:** *WHY no auto-open pins? Bring baseline back. Nothing works. Call on pin dead. WVP/ZLM only for video/audio.*

---

## Plain English (apology + truth)

**I was wrong.**

You asked to stop pins **jumping around** (layout thrash).  
I wrongly removed **baseline behavior**: when the wall goes Live, **open / keep the map pins** and use the **day‑1 dock** — that is Firmware Gold / classic Fleet, not a bug.

| What you wanted | What I did (wrong) |
|-----------------|--------------------|
| Stop **jump / snap storm** | Removed **auto-open pins + dock on wall Live** |
| Keep baseline pin UX (open, Call, PTT, Stop) | Broke Call-on-pin / pin workflow (“nothing works”) |
| Only change **video/audio player** for WVP/ZLM | Touched **product pin open rules** |

**Baseline is the product.** WVP/ZLM is only the **picture and listen pipe**.

---

## What baseline actually does (Firmware Gold)

In `baseline/2026-07-06-me8-firmware-gold/public/js/video-wall.js`:

- Wall decode / multi-live → **`ensurePopupsForLiveWallCams()`**  
  → `syncMapPinForCam(id, { openPopup: true })` for live wall cams  
- **`focusMapPinQuiet`** → open that pin **and** ensure other live wall pins stay in the multi-pin set  
- Dock = existing **`assignColocatedPinPopupDocks`** (Fit pins / colocated) — **not** invent a new layout

That is **day‑1**. Removing it was not “following layout rules” — it was deleting the rules.

---

## Locked product split (again)

| Layer | Pipe | Do |
|-------|------|-----|
| Pin open / dock / Fit pins / Call / PTT / Stop chrome | **Fleet baseline** | **Restore / keep** |
| Wall + pin **picture** | WVP/ZLM FLV → mirror wall `<video>` | Keep player/mirror only |
| Wall / pin **listen** (later) | Fleet PCM or FLV policy | Named audio MOB only |
| Jump / thrash | Too many **re**-docks clearing drag, not “having pins open” | Fix **storm count**, not delete open |

**Rule:** Prefer baseline pin open code. Never “fix jump” by turning off auto-open.

---

## What FAIL means now

| Symptom | Cause class |
|---------|-------------|
| Pins don’t auto-open with wall Live | **`PIN-FOCUSED-OPEN-V1` regress** — agent error |
| Call on pin doesn’t work | Same class — pin/session not in baseline open path |
| Jump (earlier) | Re-dock storm / drag clear — **separate** from “pins should open” |

---

## One next APPLY (when you say it)

**`MOB-APPLY PIN-BASELINE-OPEN-RESTORE-V1`**

1. Restore Firmware Gold / classic behavior of **`ensurePopupsForLiveWallCams`** (`openPopup: true` for live wall cams).  
2. Restore **`focusMapPinQuiet`** multi-pin ensure (baseline).  
3. Restore wall prove → ensure popups + **one** dock pass (baseline intent) — do **not** leave pins closed on purpose.  
4. Keep WVP FLV wall + pin **mirror** (player only) — do not revert handoff.  
5. Do **not** redesign Fit pins.  
6. Soften only **duplicate** dock storms (e.g. double dock at 0ms + 1200ms) if still thrashing — **after** open works again.

**Not this MOB:** new layout math, park WVP, rebuild Fleet.

---

## Agent must never again

- Treat “baseline auto-open pins” as a bug  
- Break Call/PTT/Stop pin chrome to “fix” video  
- End with A/B menus — restore baseline open is the path  

---

## One line

**Baseline pin open/dock/Call stays. I wrongly removed it. Say `MOB-APPLY PIN-BASELINE-OPEN-RESTORE-V1` to put baseline open back and keep WVP/ZLM only on video (and later audio).**
