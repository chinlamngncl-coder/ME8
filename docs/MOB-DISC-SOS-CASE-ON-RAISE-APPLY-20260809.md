# MOB DISC — SOS-CASE-ON-RAISE-V1 APPLY (2026-08-09)

**Status:** APPLIED.  
**APPLY:** `MOB-APPLY SOS-CASE-ON-RAISE-V1`

## Behavior

| Event | Result |
|-------|--------|
| SOS / fall **raised** (new incident) | Ensure `SO-…` Ops Case · status **Open** (`openUntilAck`) |
| Same incident Ack | **Same** case → **Ack only** or **Has notes** (note seeded) |
| Merge refresh (no new incident) | No second case |

Never fails the alarm path if wire errors.

## Files

- `lib/opsCaseStore.js` — `ensureFromSosRaise` · `OPEN` status · Ack updates existing  
- `lib/deviceAlarm.js` — call raise wire after `recordAlarm`  
- `server.js` — `ensureOpsCaseOnRaise` in deviceAlarm.configure  
- `public/js/ops-cases-ui.js` — Open badge label  
- `public/css/global.css` — open badge colour  
- `public/locales/en.json` — `opsCases.statusOpen` · empty hint

## Operator check

1. Restart Fleet.  
2. Press SOS — **do not Ack yet**.  
3. Evidence → Cases · Family SOS → see `SO-…` · **Open**.  
4. Ops → Open case → same case.  
5. Ack → same case · **Ack only** (or Has notes if you typed a note).
