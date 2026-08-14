# MOB DISC — ANPR Engine Not available after Start watch (1h42) — 2026-08-11

**Status:** PAPER. Fact from lab right now. **No code this turn.**  
**Read:** `.cursorrules`

---

## Short answer

**Start watch does NOT turn the ANPR engine ON.**  
It only starts **video** (Fleet live). Plate reading needs the **Python sidecar** on port **8768**, healthy.

Right now on this PC:

| Check | Result |
|-------|--------|
| Port **8768** | **LISTEN** (process up) |
| `http://127.0.0.1:8768/health` | **HTTP 500** Internal Server Error |
| UI badge | **Not available** (correct — health not `ok`) |
| Recent plates | AWAITING CAPTURE (no healthy engine → no OCR) |

So you waited ~1h42 with Live video, but the **engine API is broken**, not “waiting to warm up.”

---

## Why clicking Start watch can’t “ON” the engine

| Action | What it does |
|--------|----------------|
| Start watch | Live FLV tiles only |
| Badge poll | `GET /api/analytics/anpr/health` → sidecar `/health` |
| Plate path | Needs sidecar **`ok: true`** |

Auto-start of sidecar only if env **`FM_ANPR_SIDECAR_AUTO=1`**. Default lab = you run **`START-ANPR.bat`** and leave it open. Even with bat open, **health 500** = still Not available.

Stage-2 / ph_id / seatbelt code can make `/health` throw (e.g. status path touching bad imports) while uvicorn still listens — matches this lab.

---

## What you do now (operator)

1. Open browser: `http://127.0.0.1:8768/docs` — if page loads, process is up.  
2. Open: `http://127.0.0.1:8768/health` — if **500**, engine is **sick** (this is your bug).  
3. Look at ANPR bat window / `storage/anpr-sidecar-stderr.log` for the Python traceback.

---

## One next APPLY (fix health)

```text
MOB-APPLY ANPR-HEALTH-500-FIX-V1
```

Agent: make `/health` never 500 (catch Stage-2/status errors); keep Stage 1 + ph_id + CCPD seatbelt; prove health `ok` then live captures.

**Not** another “wait longer.” **Not** Start watch = engine on.
