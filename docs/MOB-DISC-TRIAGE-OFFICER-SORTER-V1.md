# MOB DISC — Triage sources vs sorter (lock)

Paper 2026-08-19. **No more sorter UI until a named APPLY that does not touch Edge chips.**

## Did auto-refresh break?

**No.** Poll is still **5 seconds** while Triage is open (`FtpInboxUi.onShow`). Refresh button and silent inbox watch were not removed.

What you saw: the fake **Face** dropdown hid BWC stills that have **no** sorter label. Table looked empty. Upload was still landing. Hard refresh with **All** showed the file. That was the last APPLY overreach, not a broken dock path.

## Three sources — do not mix

| Who sends the file | Source badge | Filter that already works |
|--------------------|--------------|---------------------------|
| Body camera / dock FTP | **BWC** | Search, date, SOS if tagged |
| Docking station | **Docking Station** | Same |
| Edge camera (on-cam Face / LPR) | **Edge Cam** | **Edge: Face** / **Edge: LPR** / **SOS** |

Edge chips stay. They mark **edge analytics metadata**, not “this BWC JPEG looks like a face.” BWC stills will **not** jump to Face when you press Edge: Face. That is correct.

## What I did wrong

`TRIAGE-OFFICER-SORTER-V1` replaced those chips with All/Car/Face. You did not ask to take them off. Restored.

BWC Car/Face from `Ubitron_Sorter.exe` is a **later** lane. Do not fake it from the thumbnail. Do not reuse Edge chips for BWC.

## Later APPLY (only if you name it)

Keep Edge chips. Add BWC sorter badges **beside** them when the sorter actually writes Car/Face. Never hide the Edge tabs.
