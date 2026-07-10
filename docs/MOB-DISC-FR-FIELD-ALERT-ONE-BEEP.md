# MOB DISC — Field alert “10 beeps” but operator hears **1 beep**

**Status:** Root cause locked · fix **APPLIED** `mob-fr-field-alert-pace-20ms` 2026-07-10  
**Search:** one beep, repeat 10, field alert, pace, 20 ms  
**Related:** `MOB-DISC-FR-ALERT-REPEAT-HQ-GLOBAL.md`

---

## Root cause

Whole ~8.5 s alaw dumped in one tight `sendPttAudioToDevice` loop. BWC needs realtime **20 ms** frames → ear heard **1 beep**.

---

## Fix — **APPLIED**

`lib/frFieldAlert.js`: one 160 B frame every 20 ms; stop if Call starts. No `pttServer.js` edit.

Restart fleet → Alert field → ~10 dual-beeps over ~8–9 s.
