# MOB DISC — Classic Fleet soak PASS (Soft Open / lab WVP off)

**Date:** 2026-07-18  
**Status:** DISC — paper lock — **no code**  
**Operator:** Classic passed.

**Search:** `classic PASS`, `Soft Open off`, `WVP later`, `5062 Chin`

---

## Verdict

| Mode | Result |
|------|--------|
| Classic Fleet (Soft Open / lab WVP **off**) | **PASS** (operator 2026-07-18) |

Env at PASS (lab `.env`):

| Flag | Value |
|------|--------|
| `FM_LAB_WVP` | `0` |
| `FM_SOFTOPEN_WVP_ONLY` | `0` |
| `FM_WVP_FLEET_PRESENCE` | `0` |

Topology: Chin on Fleet SIP **:5062** (not WVP :5060 for live). Dashboard LAN e.g. `http://192.168.1.38:3988`.

---

## What this PASS covers

Operator confirmed classic after genre keep on git (`81c8929` / `4952284`):

- Soft Open storm off / classic live path  
- Call always-on (Jul-10 lock)  
- BWC stop no auto call-back  
- Pin Stop → panel revive / one-click Live  
- Pin dock no top-jam  

Exact sub-checks are operator sight; this disc locks **classic mode PASS** as the gate before WVP/ZLM return.

---

## What this does **not** unlock

| Item | Status |
|------|--------|
| Soft Open UI band-aids | Still **frozen** — do not resume freestyle |
| Lab WVP / Soft Open flags on | **Not** turned on by this PASS |
| Clean WVP→ZLM back | **Later** — needs **named MOB-APPLY** when you say so |
| Live mute sticky (panel unmute) | Separate DISC — not claimed fixed by classic PASS |
| kk on :5062 | May still need rekey — not assumed PASS |

---

## Next (only when you ask)

Locked plan (`MOB-DISC-PLAIN-PLAN-KEEP-THEN-WVP-AFTER-30MIN-20260717.md` step 6):

1. Classic PASS ← **done**  
2. Named APPLY: clean WVP/ZLM lab back (proxy + LAN + ZLM) — **not** Soft Open patch pile  
3. Soak both cams → re-check SOS / PTT / stop / Call  

Until you paste that APPLY name: keep `FM_LAB_WVP=0` etc.

---

## Lock

**Classic Soft-Open-off Fleet = PASS 2026-07-18.**  
Do not put WVP/ZLM back without a new named APPLY.  
Do not reopen Soft Open UI genre without explicit operator order.

**One line:** Classic passed; Soft Open stays off; WVP/ZLM waits for a named APPLY.
