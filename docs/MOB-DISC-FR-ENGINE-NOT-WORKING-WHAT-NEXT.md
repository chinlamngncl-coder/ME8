# MOB DISC — FR engine “not working”: restart? What to do

**Status:** DISC only — **no APPLY**  
**Date:** 2026-07-13  
**Trigger:** “Engine seems not working. Need to restart FR engine? What shall we do. Mob disc.”  
**Context:** Snap PASS · live **match FAIL** · cutover APPLIED · label **Known subjects** · lab `FM_FR_ENGINE=onnx`

---

## Plain answer

**Two different failures — don’t mix them.**

| What you see | Engine process? | Fix path |
|--------------|-----------------|----------|
| Platform health **FR engine: Down / Off** · enroll fails · no faces | **Sidecar dead or wrong port** | Restart FR / Fleet (below) |
| **Snaps OK** · faces on Recent · **no score / Known subjects empty** | Engine usually **alive** | **Not** a restart problem — recognition / gallery / threshold |

Your lab pattern (snaps OK, no match) is almost always **bucket 2**. Restarting FR alone rarely fixes that.

**Right now (lab check 2026-07-13):** ONNX `:8766` health = **ok / ready**. DeepFace `:8765` = down (normal when only onnx is selected).

---

## Do you need to restart the FR engine?

| Situation | Restart FR? |
|-----------|-------------|
| Health OK, snaps flowing, only match fails | **No** — skip to match checklist |
| Health Down after cutover / `.env` change | **Yes** — `RESTART-FLEET.bat` (AUTO starts sidecar) |
| Health stuck “starting” for minutes | **Yes** — Fleet restart; if still bad, kill orphan python on 8766 |
| Rolled back to `FM_FR_ENGINE=deepface` | **Yes** — must restart so client points at 8765 |
| Changed `FM_FR_*` grab/threshold env | Fleet restart for server; hard refresh for UI slider |

**Prefer:** `RESTART-FLEET.bat` (brings Node + AUTO sidecar together).  
**Optional:** only if Fleet is up but 8766 dead — start `fr-sidecar-fast` / `START-FR` equivalent for onnx (lab). Don’t leave two engines fighting unless testing rollback.

---

## Operator checklist (do in order)

### A — Is the engine up? (30 s)

1. Settings → Platform / Tech health → **FR engine**  
2. Or open `http://127.0.0.1:8766/health` → want `"ok":true,"engine":"onnx"`  
3. Analytics Face → enroll / “face matching ready” hint  

- **Down** → B  
- **OK** → C (match path)

### B — Restart path (engine down)

```text
1) RESTART-FLEET.bat
2) Wait until health OK (cold ONNX can take a while first time)
3) Hard refresh browser
4) Re-check 8766/health
```

If still down:

- Confirm `.env`: `FM_FR_ENGINE=onnx`, `FM_FR_SIDECAR_AUTO=1`, `FM_FR_FAST_PY` / venv exists  
- `cd fr-sidecar-fast` → venv + `pip install -r requirements.txt` once  
- Read `storage/fr-sidecar-stderr.log`  
- Rollback test: `FM_FR_ENGINE=deepface` + restart (needs DeepFace venv on 8765) — only to prove backup

### C — Engine up, still no match (your case)

Restart will **not** magically create scores. Walk this:

1. **Watchlist** — enrolled face is **onnx / ~512 dims** (Re-embed gallery or fresh enroll after onnx)  
2. **Same person** in front of BWC as enroll photo (front, clear, close)  
3. **Threshold** — slider 75% may be high for BWC; try **70** briefly to see *any* score  
4. Confirm cam is in **FR watch** set and live tile is streaming  
5. Recent shows faces → probe path works; Known subjects empty → **score &lt; threshold** or no gallery hit  
6. Optional: re-enroll one clean ID photo, then walk-test again  

**Not fixed by:** cutover alone, rename, Matches/Known subjects UI.

---

## What we should do next (recommended)

| Priority | Action | MOB? |
|----------|--------|------|
| **1** | Confirm health OK (if Down → Fleet restart) | No |
| **2** | One **clean re-enroll** of lab face + threshold 70 walk-test | No |
| **3** | If scores appear but &lt;75 → calibrate threshold / enroll quality DISC | Later MOB |
| **4** | If **zero** candidates forever with faces → probe/match debug MOB | Name when ready |
| **5** | UX (overflow, amber toast) | Only after match honest |

**Suggested next MOB (only if you want code):**  
`mob-fr-match-debug-score-on-rail` — show best score% on near-miss (even below threshold) so we can see 62% vs “dead engine”.  
Or stay no-MOB until one enroll walk-test PASS.

---

## Rollback reminder

```
FM_FR_ENGINE=deepface
```

Then **RESTART-FLEET**. Gallery must be DeepFace dims again (or re-embed).

---

## Bottom line

| Question | Answer |
|----------|--------|
| Restart FR? | **Only if health is Down** — use **RESTART-FLEET** |
| Snaps OK, no match? | Engine likely **fine** — fix enroll / threshold / walk-test |
| Cutover broke match? | Unlikely — lab was already onnx; match gap was already there |

Say **restart now** (you run Fleet) or **MOB-APPLY mob-fr-match-debug-score-on-rail** if you want visible near-miss scores next.
