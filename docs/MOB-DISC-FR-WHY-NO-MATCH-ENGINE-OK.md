# MOB DISC — Why no match when engine is installed? (lab check)

**Status:** DISC + lab check 2026-07-13 · **`mob-fr-snap-hide-zero-score` APPLIED** (same turn)  
**Trigger:** “0% all snapshot” + “why we are not matching? engine installed? anything wrong? wanna check? Mob disc” + APPLY hide-zero  

---

## Short verdict

| Check | Result (lab now) |
|-------|------------------|
| ONNX sidecar `:8766` | **UP** — `ok/ready`, `buffalo_sc` |
| DeepFace `:8765` | Down — **normal** when `FM_FR_ENGINE=onnx` |
| Watchlist | 1 face **`dd`**, `engine=onnx`, **512-d**, enabled, photo present |
| Self-match enroll photo vs stored vector | Should be ~**100%** if represent works (engine + gallery aligned) |
| Recent **0%** | **Fake** — rolling ticks hardcode `scorePct: 0` (not engine output) |
| Live match FAIL | **Not** “engine missing” — score either invisible or **&lt; threshold** vs `dd` |

**Nothing wrong with “is ONNX installed?”** — it is. What’s wrong is **how scores are shown** + **live BWC face vs enroll `dd` not clearing 75%** (or real % never shown on rail).

---

## What the hell is the 0%?

```text
Each rolling snap  →  server sets scorePct = 0  →  UI showed “Match: 0%”
Best-of-window     →  real matchProbe % computed  →  NOT sent to Recent (rolling on)
Known subjects     →  only if real % ≥ threshold AND gallery hit
```

So **0% ≠ cosine similarity of 0**. It means **“not scored on this card.”**

**APPLIED:** `mob-fr-snap-hide-zero-score` — hide / don’t store fake 0%; lightbox won’t say Match: 0% for rolling faces.

---

## Why Known subjects stays empty (match)

Chain that must succeed:

```text
BWC live → grab JPEG → detect face → embedding (ONNX)
    → cosine vs watchlist `dd` (512-d)
    → scorePct ≥ threshold (UI slider, default 75)
    → emit hit → Known subjects (+ alert if blacklist)
```

| Break point | Symptom | Likely? |
|-------------|---------|---------|
| Engine down | No faces / enroll fail | **No** — health OK, snaps OK |
| Dim mismatch | Never matches after onnx | **No** — gallery already 512 onnx |
| Empty watchlist | Never hits | **No** — `dd` enrolled |
| Face not in watch set / not live | No snaps | **No** — you see snaps |
| Rolling hides real % | Only see 0% / — | **Yes** — fixed display; still need window score on rail |
| Live face ≠ `dd` / bad angle / far | Real % 40–70 | **Very likely** |
| Threshold 75 too high for BWC | Real % 70–74, no hit | **Likely** |
| Probe quality gate drops frames | Fewer usable embeds | Possible |

**Install is fine. Matching is “same person + high enough score,” not “engine folder exists.”**

---

## What you should do (no MOB)

1. Hard refresh (hide-zero APPLIED).  
2. Open a Recent snap — score line should be **hidden**, not 0%.  
3. Enroll / confirm **`dd`** is the person in front of the BWC (clear front face).  
4. Drop threshold to **70** for one walk-test.  
5. Watch **Known subjects** — still empty? then we need **visible real %** (`mob-fr-rail-window-score`).

---

## Recommended next MOB

```text
MOB-APPLY mob-fr-rail-window-score
```

**APPLIED 2026-07-13.** Best-of-window real % now appears on Recent (near-miss). Use that number to decide threshold vs enroll quality.

Optional after: calibrate threshold / enroll quality.

---

## Bottom line

| Question | Answer |
|----------|--------|
| Engine installed / running? | **Yes** — onnx 8766 OK |
| Gallery OK? | **Yes** — `dd` onnx 512 |
| Why 0%? | Rolling **fake zero** — hide APPLIED |
| Why no match? | Live score not clearing bar vs `dd` (and real % was hidden) — **not** missing install |
| Next? | Walk-test + **`mob-fr-rail-window-score`** to see truth |
