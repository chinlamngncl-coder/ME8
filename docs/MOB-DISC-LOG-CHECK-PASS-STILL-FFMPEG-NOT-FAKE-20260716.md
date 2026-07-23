# MOB DISC — Log check after your PASS (~22:38): **Fleet, not ZLM** (not fake)

**Status:** LOCKED 2026-07-16 ~22:39  
**Search:** `pass check log`, `fake again`, `might be ffmpeg`, `honest proof`  
**Proof rules (unchanged):**

| Log line | Meaning |
|----------|---------|
| `live broker wvp-zlm primary` | Real **WVP→ZLM** |
| `live broker zlm-relay primary` | Fleet→ZLM relay soft path |
| Fleet `invite accepted` + no lines above | **Fleet / FFmpeg / JSMpeg** picture |

---

## Verdict (honest — you were right to doubt)

| Check | Count / fact |
|-------|----------------|
| Your picture | **PASS** (you said) |
| `wvp-zlm primary` | **0** → **not WVP-ZLM** |
| `zlm-relay primary` | **0** → **not ZLM soft either** |
| Soft try | WVP fail → relay **tried** → relay **died** |
| Relay fail reason | `Unknown encoder 'libx264'` (bundled ffmpeg can’t encode for RTMP) |
| What you actually watched | **Fleet path** (invite + JSMpeg under soft fail-open) |

**Not faking. Not selling FFmpeg as ZLM.**  
Picture PASS = Fleet working. ZLM / WVP-ZLM = still **FAIL**.

---

## What the log did (plain)

1. Soft asked WVP → `wvp_startplay_failure`  
2. Soft tried Fleet→ZLM relay → got first WS bytes → ffmpeg for RTMP **crashed** (no libx264)  
3. Soft gave up → **kept Fleet picture** (fail-open)  

So google-stack **attempted** ZLM; it did **not** succeed. Your eyes saw Fleet.

---

## You

Nothing. Keep using the desk.  
Do **not** believe “ZLM” until I show **`wvp-zlm primary`** or **`zlm-relay primary`** with a matching pass from you.

Next agent fix (when you APPLY): relay must use an encoder this pack has (e.g. **libopenh264**), not libx264 — named MOB e.g. `mob-zlm-relay-openh264-v1`.

---

## One line

**PASS picture = Fleet. Log: 0× wvp-zlm, 0× zlm-relay primary. Not fake. ZLM still FAIL.**
