# MOB DISC — FR + ANPR concurrent live (NOT “only one analytics”)

**Date:** 2026-07-31  
**Status:** DISC — **no code**  
**Trigger:** Operator heard “Face shows video, ANPR Connecting = attach parity confirmed” as **“we can only run one analytics.”** That reading is **wrong**. Agent wording failed. Correct here.

---

## Straight correction

| Wrong (what it sounded like) | Right (product + code) |
|------------------------------|-------------------------|
| Only Face **or** ANPR may live-watch | **Both** may watch the **same cam** at once |
| Face PASS proves ANPR must lose | Face PASS proves **backend FLV works**; ANPR client attach is incomplete |
| One analytics module at a time | Surfaces are separate: `analytics-fr` + `analytics-anpr` (+ Ops, CW, …) |

The Face vs ANPR check was **diagnostic A/B** only: same cam, prove whether picture exists on the known-good surface.  
It is **not** a product rule. It does **not** mean shut Face to use ANPR.

---

## Method that already exists (reuse — do not invent a third pipe)

```
Same BWC (e.g. kk)
        │
        ▼
  WVP ensurePlay  ──►  one ZLM FLV URL per cam (reuse if already playing)
        │
        ├── Ops wall tile      (surface: ops)           → attachFlvPrimary
        ├── Command Wall       (surface: command-wall)  → attachFlvPrimary  PASS
        ├── Face Live          (surface: analytics-fr)  → FLV + JSMpeg fallback  PASS
        └── ANPR Live          (surface: analytics-anpr)→ FLV only today → Connecting FAIL
```

**Server (`liveViewers`):** viewer refs are **`camId + surface`**.  
Face start and ANPR start are **two refs**, not a mutex.  
`ensurePlay` **reuses** active FLV (`reused: true`) and still emits `video-stream-ready` **with `flvUrl`** to the requesting socket.

**Stop:** `stop-video` for one surface only drops that surface’s ref. Stream stays up while the other surface (or Ops) still holds the cam. `stopPlay` only when count hits **0**.

**FR client already intends concurrency:** `onHideOrLeave` does **not** stop watch when leaving Face for another Analytics panel — “Keep watch running… only stop on explicit Stop or page unload.”

So the method is: **one WVP play / one FLV URL, many UI attaches.** Same pattern Ops + CW already use. Not “pick one analytics.”

---

## Why ANPR still Connecting (alone or with Face)

Not because Face “owns” the cam.

Because **ANPR Live was shipped halfway:**

1. Emits `start-video` with `surface: analytics-anpr` (correct)  
2. On ready with `flvUrl` → attaches FLV (partial)  
3. **No JSMpeg fallback** (FR has it)  
4. Roster “live” = on a **slot**, not proven picture (UI lie)  
5. Incomplete prove / fail → eternal **Connecting…**

That is **attach parity unfinished**, same bug class FR already fixed with `FR-LIVE-WATCH-FLV-HANDOFF-V1`.  
Half work. Own it.

---

## What “concurrent” means for the operator

| Scenario | Expected after parity MOB |
|----------|---------------------------|
| ANPR Live alone on kk | Picture + plate poll |
| Face Live alone on kk | Picture + FR (already PASS) |
| Face Live **and** ANPR Live on kk (switch panels; Face watch still on) | **Both** keep stream; both tiles can show FLV; one WVP play |
| Ops wall + ANPR on kk | Same — shared FLV |
| Stop ANPR only | Face / Ops keep picture |
| Stop all surfaces | Then WVP release |

UI cannot show Face Live and ANPR Live **side-by-side in one hub panel** today (different Analytics top tabs). That is layout, not a stream exclusivity lock. Background watch + second surface is already the FR design.

---

## Optional harden (after attach works — do not bundle)

Only if operator proves a **second** fail after parity:

| Risk | Note |
|------|------|
| `notifyStreamReady` emits ready **without** `flvUrl` | Weak path when socket gone mid-ensure; primary path includes `flvUrl` |
| Two mpegts players on one HTTP-FLV | Normal multi-viewer; ZLM supports; if lab flakes, name a fanout MOB later |
| ANPR poller + FR poller both grab same cam | Separate analytics jobs; OK; tune load later if CPU hurts |

**Do not** invent “only one analytics” as a fix. That would be dumber than the attach gap.

---

## Locked next APPLY (still one MOB)

### `ANPR-LIVE-VIDEO-ATTACH-PARITY-V1`

Finish ANPR attach to **FR contract** so ANPR works **alone and alongside** Face/Ops:

1. FLV when `flvUrl` present  
2. Else JSMpeg fallback  
3. Prove fail / stream-error → **No video**, not forever Connecting  
4. Honest **live** = proven picture  
5. **No** “stop Face to run ANPR”  
6. **No** OCR / lists / port redesign in this MOB  

**PASS:**

- A) ANPR alone → kk picture  
- B) Start Face Live on kk, then open ANPR Live on kk (Face not Stopped) → ANPR gets picture too; Face still OK when you return  

Related: `MOB-DISC-LIVE-VIDEO-OPS-CW-FR-VS-ANPR-REALITY-20260731.md`, `MOB-DISC-ANPR-LIVE-CONNECTING-STUCK-KK-20260731.md`

---

## APPLY

```
MOB-APPLY ANPR-LIVE-VIDEO-ATTACH-PARITY-V1
```

No code in this disc.
