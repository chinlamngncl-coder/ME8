# MOB DISC — Stale clear PASS = so what? Do I click something?

**Status:** LOCKED 2026-07-17 ~00:58  
**Search:** `stale clear PASS`, `so what`, `click some button`, `what do you want`  
**Trigger:** Operator after clear PASS — wants plain next action

---

## So what? (one line)

**Junk rows gone. Picture not fixed. You do nothing.**

---

## Plain meaning

| Phrase | Means | Does **not** mean |
|--------|--------|-------------------|
| Stale clear **PASS** | Bad WVP devices with Docker `172.x` host were **deleted**. List was empty. | Wall is Plan A / `wvp-zlm primary` |
| | Cleanup so the next SIP fix can register clean | Soft Open All will look better |
| | Agent / START-WVP already did it | You must restart Fleet or poke a button |

---

## Do you click something?

**No.**

- No Evidence / wall / Settings button for “stale clear”
- No `RESTART-FLEET` (locked wrong ask)
- No BWC port change
- No “wait and Soft Open” as the fix

Operator job right now: **none** for this PASS.

---

## What the agent wants (only if you want Plan A next)

Say when ready:

`MOB-APPLY mob-wvp-sip-lan-source-ip-v1`

That is **agent work** (WVP SIP must see real LAN IP, not Docker NAT). Not a click on the dashboard.

Until that APPLY: keep using the wall as today (Plan B fail-open). Stale clear was preparation only.

---

## Honest scoreboard

| Item | State |
|------|--------|
| Stale Docker-host devices cleared | **PASS** |
| Cams REGISTER to WVP with `192.168.x` | **not PASS** |
| Wall `wvp-zlm primary` | **not PASS** |
| Operator homework for clear | **none** |
