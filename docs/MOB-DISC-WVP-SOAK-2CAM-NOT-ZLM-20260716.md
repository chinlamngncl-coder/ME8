# MOB DISC — Soak 2-cam ~7 min: mid-stop check + WVP-ZLM honesty (2026-07-16)

**Status:** DISC only (log verdict). No code change.  
**Operator ask:** Finished another soak (~7–8 min, 2 BWC open live). Server restarted → auto stop. Check mid-stop. Confirm whether path was **WVP-ZLM**. No cheating.

---

## Window matched in `storage/fleet.log`

| Item | Value |
|------|--------|
| Cams | `…00008` + `…00009` |
| Start live | **13:46:03** / **13:46:05** (+08) — Fleet pool `invite requested` → accepted → RTP → `pool ws first chunk` |
| End | **13:52:13** — Fleet `dashboard listening` after prefer-service / kill restart |
| Duration | **~6.2 min** (matches “around 7–8” within clock/restart cut) |
| Earlier same day | 13:00 + 13:24 soaks also 2-cam Fleet invite (already reported FFmpeg) |

---

## Mid-stop / mid-offline

**None in the live window.**

- Between last healthy start lines (~13:46:07) and restart (~13:52:12): **no** `bye` / `BYE` / `unregister` / `pool stream stopped` / `session ended` / `ffmpeg exit` / `rtp timeout` for these pool cams.
- End was **process kill + restart**, not operator Close All and not device mid-BYE while pool was live.
- After restart: `pool ws client queued` for both cams (browser still open, reconnect noise). Later **13:55:35 / 13:55:38** `remote_bye` with `"poolCam":null` = SIP leftovers after pool already gone — **not** a mid-soak stop proof.

---

## Were we on WVP-ZLM? **NO**

Honest proof rules used:

| Proof | Result |
|-------|--------|
| `live broker wvp-zlm primary` in entire `fleet.log` | **Count = 0** |
| Any `2026-07-16` `live broker wvp…` | **Count = 0** |
| This soak’s start lines | `invite requested` / `pool invite` / `pool rtp` / `pool ws` = **Fleet FFmpeg / JSMpeg path** |
| Soft wall ZLM overlay for 2-cam | **Blocked by design** — `wallZlmSoftUpgradeAllowed()` returns false when `wallActiveCamIds().length > 1` or Open All reserved (`video-wall.js`) |

So: **2 BWC open live stayed Fleet FFmpeg.** WVP lab routes being “enabled” at boot is **not** the same as wall live using WVP-ZLM.

Do **not** treat “WVP container up” or “wvp lab routes enabled” as soak path = ZLM.

---

## Why ZLM primary MOB did not show up here

1. Wall Open All / multi-live **never soft-upgrades** to ZLM (one-cam only).
2. Underneath always starts JSMpeg → Fleet invite/pool — what the log shows.
3. Broker line `live broker wvp-zlm primary` only fires when `/api/live/playback` successfully takes WVP `startPlay` and returns `engine:"zlm"`. That line **never** appeared today (or ever in this log file).

---

## Verdict (operator-facing)

| Question | Answer |
|----------|--------|
| Mid stop during the ~7 min? | **No** |
| Stop reason at end? | **Server restart** (lab prefer-service / kill) |
| Path used? | **Fleet FFmpeg pool + JSMpeg** |
| WVP-ZLM? | **No — not this soak** |

---

## Next (paper only — needs MOB-APPLY to change product)

To actually soak **WVP-ZLM** on wall with honesty:

- Either: **one cam** soft-ZLM try (current wall gate), and require log `live broker wvp-zlm primary`, **or**
- New MOB: allow multi-cam / Open All to consume WVP-ZLM descriptors (explicit scope — do not invent).

Until then, multi-cam wall soaks = **Fleet FFmpeg** by current code.
