# MOB DISC — ZLM not ready (FAIL 2026-07-06)

**Status:** **FAILED** — reverted off live video path. Do not MOB-APPLY ZLM into `liveStreamPool` or `server.js` until a separate lab proves it.

**Search:** `ZLM fail`, `STOPPED BY BWC`, `docker`, `one pack`, `operator must not`

---

## What the operator saw

Open All → video starts → within seconds wall shows **STOPPED BY BWC** or **Stopped — press ▶**. Same class of break as earlier bad agent passes.

**Dashboard was not edited** (`video-wall.js` / `index.html` untouched). Suspect: any MOB that touches **`liveStreamPool.js`** or **`server.js`** ingest — even “off by default” ZLM wiring.

---

## What we did wrong (agents — never again)

| Mistake | Why it is wrong |
|---------|------------------|
| Hooked ZLM into **`liveStreamPool.js`** | Pool is Firmware Gold live path — not a sandbox |
| Told operator **Docker** / `.env` ZLM flags | **Operator installs one pack only** — no sidecars, no extra steps |
| “Try ZLM later” in replies | User is **designer** — agent owns all tech; operator restart + pass/fail only |
| Assumed `FM_ZLM_ENABLED=0` = safe | Still changed pool `endSessionCall` / RTP bind — **reverted** |
| No checkpoint before claiming proof | Never claimed video in `test-zlm.html` on real BWC — MOB should not have shipped to running bench |

---

## Operator rules (locked)

1. **One install pack at ship** — FFmpeg/media runtime inside that pack. No second Docker install for the customer.
2. **No `.env` tuning** for operators — builder sets profile once; Settings UI for ops.
3. **ZLM is future / builder lab only** — not part of ME8 Firmware Gold restore floor.
4. If wall/pins break after any agent pass: type **`RUN RESTORE-ME8-FIRMWARE-GOLD`** → `RESTART-FLEET.bat` → hard refresh once.

---

## ZLM — when it is allowed (not now)

| Phase | Where | Who |
|-------|--------|-----|
| **Lab** | Separate tree or branch, **zero** `liveStreamPool` edits | Builder / agent |
| **Proof** | Standalone page + logs on lab bench with real BWC | Agent verifies |
| **Ship** | Bundled **inside** ME8 customer pack (Media Pack), not Docker instructions | Builder MOB genre |

**Forbidden until lab PASS:** Docker compose for operator, `FM_ZLM_*` in operator docs, pool hooks, UI integration.

---

## Files reverted (2026-07-06)

- `lib/liveStreamPool.js` — back to Firmware Gold (no ZLM hooks)
- `server.js` — no ZLM require / wire / warmup / `/api/zlm/*`

**Parked (not wired):** `lib/zlmRuntime.js`, `lib/zlmIngest.js`, `public/test-zlm.html`, `docker/zlm.compose.yml` — do not enable without new MOB + lab PASS.

---

## Restore floor (unchanged)

```powershell
cd "C:\Users\user\Desktop\Enterprise Mobility\ME8"
.\RESTORE-ME8-FIRMWARE-GOLD.ps1
.\RESTART-FLEET.bat
```

AI runs restore **only** when user types: `RUN RESTORE-ME8-FIRMWARE-GOLD`.

---

## Related

- `docs/MOB-DISC-FIRMWARE-GOLD-PIN-MIRROR.md` — pin mirror lock  
- `docs/MOB-DISC-ZLM-TEST-FIRST.md` — original Google plan (superseded by this FAIL note for pool touch)  
- `MOB-DISC-START-HERE.md` — index
