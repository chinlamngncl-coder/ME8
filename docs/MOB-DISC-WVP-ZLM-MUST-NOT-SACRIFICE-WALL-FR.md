# MOB DISC — WVP+ZLM must not sacrifice command wall or FR stream

**Status:** LOCKED 2026-07-17 ~00:27  
**Search:** `do not sacrifice`, `command wall`, `FR stream`, `after wvp zlm stable`  
**Context:** Plan A media-online in progress; full stability check **later**  
**5060:** Fleet SIP stays

---

## Operator note (do not forget)

Once **WVP + ZLM** are running stable, we still must keep:

| Path | Must stay stable |
|------|------------------|
| **Command wall** | Open All / wall live / soft upgrade — ops picture |
| **FR using stream** | Face / FR sidecar paths that consume live stream |

**Do not sacrifice** these for Plan A. WVP/ZLM success that breaks wall or FR = **FAIL**, not ship.

---

## When to check (order)

1. **Now / first:** Get WVP↔ZLM media online + play path working (`wvp-zlm primary` when cams on 5061).  
2. **After that is stable:** Run a **named post-check** (not during media-online thrash):
   - Command wall: Open All / soft live still works (Fleet fail-open if WVP miss)  
   - FR: stream consumers still get usable feed (no black / no stuck invite from WVP work)

Do **not** invent wall/FR “fixes” mid–Plan A unless a named APPLY says so.

---

## Non-goals until post-check

- Rewriting wall player for WVP only  
- Cutting Fleet fail-open “because Plan A exists”  
- Changing FR probe / sidecar stream source without APPLY  
- Hardcoding resolution “for WVP look”

---

## Suggested later named check (you say MOB-APPLY when ready)

`mob-wvp-zlm-post-stable-wall-fr-check-v1` — after `wvp-zlm` soft path is stable:

1. Soft open wall (command wall) — pass/fail from picture  
2. FR path that uses live stream — pass/fail  
3. Confirm fail-open still protects if WVP blips  

Paper only until APPLY.

---

## One line

**WVP+ZLM first; then prove command wall + FR stream still stable — never sacrifice them.**
