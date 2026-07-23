# MOB DISC — Restart first (agent was dumb) · why res changes · why ~20s lag

**Status:** LOCKED 2026-07-16 ~23:49  
**Search:** `tell me restart`, `resolution change`, `20sec latency`, `slow zlm relay`  
**Log now:** `zlm-relay primary` × **2** (after restart 23:46)

---

## Agent fault (locked)

When a **server** file changes, the **first** line to you must be:

> **You must restart:** double-click `RESTART-FLEET.bat` → Yes if asked → then play.

Not buried under “verdict / Fleet / check log.”  
That omission was **dumb**. Own it.

---

## What you are running **now** (honest)

| Proof | Fact |
|-------|------|
| Server boot | **23:46** (restart happened) |
| `wvp-zlm primary` | **0** — still **not** WVP Plan A |
| `zlm-relay primary` | **2** (chin + kk) — soft **Plan B** after WVP miss |
| Picture path | Fleet invite first, then soft overlay from **Fleet→ZLM re-encode** |

So: not fake WVP. It is **zlm-side-relay** on top of Fleet.

---

## Why the panel **resolution / look** changes

Soft overlay switches the tile from **JSMpeg (Fleet pool)** to **mpegts/FLV (ZLM relay)**.

Relay does: pool WS (mpeg1/mpeg2-ish) → **re-encode libopenh264** → RTMP → ZLM → FLV player.

That can:

- Change apparent size / sharpness / stretch  
- Glitch briefly (`Invalid frame dimensions 0x0` in log while decoder warms)  
- Look “different video” even if same cam  

**Not** you changing cam settings. **Pipeline change.**

---

## Why **~20s latency** (expected with this Plan B)

This path is **heavy**:

1. Cam → Fleet already (some delay)  
2. Extra: JSMpeg WS → ffmpeg re-encode → ZLM → FLV → soft player  

Google’s Plan B “copy” was meant to avoid re-encode; our pool is **not** clean H.264 copy-friendly, so openh264 re-encode = **CPU + buffer + lag**.  
**~20s is a FAIL for ops live** even if log shows `zlm-relay primary`.

So: openh264 MOB = crash fixed / relay **up**.  
**Latency / ops quality = not PASS.**

---

## What you do

- If picture OK enough for a look: say **pass look / fail lag** (honest).  
- Do **not** treat this as WVP-ZLM done.  
- Next work (when you APPLY): cut lag or turn soft-relay off until Plan A works — e.g. named MOB later: disable soft relay on wall, or faster path — **not** inventing tonight without APPLY.

---

## One line

**Must say RESTART first next time. Now = zlm-relay (not WVP). Res change + ~20s lag = re-encode overlay — ops FAIL on delay even if relay log is up.**
