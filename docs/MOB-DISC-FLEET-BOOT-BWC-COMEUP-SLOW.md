# MOB DISC — Fleet start: BWC come-up ~2 min is unacceptable

**Status:** Warm cache→map **REMOVED** (`mob-fleet-warm-chrome-no-stale-pin` 2026-07-10) · burst / GPS cooldown still DISC  
**Search:** restart slow, 2 minutes, fresh GPS, no stale pin  
**Related:** `MOB-DISC-FLEET-WARM-CHROME-STALE-GPS.md`

---

## Operator report (locked)

~2 min BWC come-up after fleet start is **unacceptable**.  
Boot-painting GPS **cache** on the map is **wrong** for walking BWCs — **removed**.

Grey offline pins (session drop + TTL) **kept**.

---

## Still pending (real come-up speed)

| MOB | Intent |
|-----|--------|
| `mob-fleet-first-contact-burst` | First REGISTER → force GPS/status now |
| `mob-fleet-gps-boot-cooldown-fix` | Cut 120 s GPS cooldown tax |

Empty map briefly after restart beats wrong pins. Fresh GPS on first contact is the fix.
