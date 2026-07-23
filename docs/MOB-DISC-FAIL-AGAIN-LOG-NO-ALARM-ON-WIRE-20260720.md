# MOB DISC — Fail again log (superseded for Google)

**Type:** DISC only — no APPLY  
**Paste Google this instead:** `docs/LOG-PACK-COLD-SOS-PASS-VOICE-FAIL-20260720.md`

## CORRECTION (operator ~01:06)

- Cam **009** is **:5060** (same as Chin 008) — **not** Fleet :5062.
- **Cold SOS = PASS.**
- Still **FAIL:** cold cam PTT · software Call · software PTT.

## Extra wire hint for Google (from code, not APPLY)

Dashboard soft PTT in the fail window logged only:
`operator fleet ptt wake` → socket `ptt-wake-device` (group config / status wake).

Phase-4 talk path is socket **`ptt-start`** → `fanOutPttStartViaWvp` / `/api/play/broadcast`, which would log `operator talk start` or `talk blocked`.

Those **`operator talk start` / `talk blocked` lines are absent** next to the wakes → UI may not be escalating wake → start, or talk is failing elsewhere without that tag. Call used `voice broadcast sent` (separate Call path), not the ptt-start fan-out.

**No code. No park.**
