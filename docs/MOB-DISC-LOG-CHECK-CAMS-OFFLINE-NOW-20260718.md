# MOB DISC — Log check now: dashboard up, cams offline

**Date:** 2026-07-18 ~01:09  
**Status:** DISC — log proof — **no code**  
**Ask:** Nothing coming online — check log.

---

## Verdict

| Piece | Status |
|-------|--------|
| **Dashboard / Fleet** | **UP** — `:3988` returns 200 · service `UbitronC2` Running · login `global` at **01:07:42** |
| **Chin / kk on Fleet map** | **OFFLINE** — no Fleet SIP after restart |

Not a localhost problem. Server is up. **Cams are not registering to Fleet `:5062`.**

---

## Log proof

| Time | Fact |
|------|------|
| 01:00:13 | Chin `…0008` → `device offline` · `register_expired` |
| 01:01:02 | kk `…0009` → `device offline` · `register_expired` |
| 01:07:24 | Fleet restart · `sip listening` **5062** · dashboard listening |
| After 01:07:24 | **No** `register ok` · **No** Keepalive to Fleet |
| Still now | WVP proxy still patches hosts (cams talking **WVP :5060** path, not Fleet online) |

---

## What you do (now)

1. Chrome → **`http://localhost:3988`** → login (page should open).  
2. Cams stay grey/offline until they re-register.  
3. **On each BWC:** power off → wait 10s → power on.  
4. Wait **1–2 minutes**. Refresh Ops.  
5. If still offline: on BWC, confirm server IP **`192.168.1.38`**, SIP port **`5062`** (classic Fleet), save, reboot cam again.  
6. Tell me: **Chin green / kk green / still both dead**.

Do **not** restart WVP for this. Do **not** change Soft Open flags.

---

**One line:** Fleet/dashboard is online; Chin+kk expired and have not re-registered to :5062 — power-cycle cams (then check 5062 on BWC).
