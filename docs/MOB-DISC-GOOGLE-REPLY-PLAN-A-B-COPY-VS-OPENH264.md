# MOB DISC — Google reply: Plan A / Plan B / TCP (mapped to ME8 · honest)

**Status:** LOCKED 2026-07-16 ~22:51  
**Search:** `google reply`, `c:v copy`, `plan b`, `未找到可用的zlm`, `tcp passive`  
**Source:** Operator paste — Architecture Update (WVP/ZLM + FFmpeg Plan B)  
**Log proof:** `docs/MOB-DISC-LOG-EXPORT-FOR-GOOGLE-20260716.txt`  
**5060:** Fleet SIP stays — `docs/MOB-DISC-NO-DICTATE-CHANGE-5060.md`

---

## Google said (3 fixes)

| # | Google | Intent |
|---|--------|--------|
| 1 | Plan B: stop `libx264` → use **`-c:v copy`** (lgpl binary has no x264) | Stop relay crash |
| 2 | Plan A: WVP “no available ZLM” → match **mediaServerId** + **secret** | WVP must see ZLM |
| 3 | Force SIP **TCP Passive** on WVP device path (logs showed UDP invites) | Stable media when Plan A works |

Order Google wants: **deploy copy first**, then WVP config, then TCP.

---

## ME8 map — agree / caution / forbid

### 1) Plan B — encoder crash (**agree on problem · caution on copy**)

| Fact | Detail |
|------|--------|
| Crash | Real: `Unknown encoder 'libx264'` with `vendor/ffmpeg-lgpl` |
| Google why | Correct — LGPL build often has **no** libx264 |
| Our failing spawn | `lib/zlmLabRelay.js` (Fleet pool WS → RTMP publish to ZLM) |
| **Caution** | That WS path is **JSMpeg MPEG-TS / mpeg1video**, not raw cam H.264. Blind **`-c:v copy` into FLV/RTMP often fails** (wrong codec for FLV). |
| Safer ME8 fix | Use encoder we already ship for live: **`libopenh264`** (same as other ME8 remux paths), **or** prove copy only if input is already H.264 |

**Named MOB (recommended first):**  
`mob-zlm-relay-openh264-v1` — replace `libx264` → `libopenh264` in `zlmLabRelay.js`.  

**Optional alternate (only if we prove H.264 input):**  
`mob-zlm-relay-stream-copy-v1` — Google’s `-c:v copy` as written.

Do **not** send whole `server.js` to rewrite pool INVITE FFmpeg — wrong file; crash is **relay** spawn.

---

### 2) Plan A — “未找到可用的zlm” (**agree · already partly checked**)

| Fact | Detail |
|------|--------|
| Error | WVP: no usable ZLM (garbled UTF-8 in our log = that Chinese) |
| Secret / mediaServerId | Live selfcheck earlier: **match** (`me8-zlm-modern` + modern secret) |
| Still fail | WVP **media-server row / online / hook** can still be “not available” even when ZLM HTTP health is OK from host |
| Agent work | Confirm in WVP UI/API: media server online; hooks from ZLM → `me8-wvp:18080`; restart WVP after ZLM; fix drift if any |

**Named MOB:**  
`mob-wvp-zlm-media-online-v1` — make WVP list ZLM as **available** (hooks/register/online), not only host getServerConfig.

Hooks/secret paper already: `docs/MOB-DISC-WVP-GOOGLE-FOUR-CHECKS-VS-FAILED-MOB.md`.

---

### 3) SIP TCP Passive (**agree for WVP play · not Fleet rewrite**)

| Fact | Detail |
|------|--------|
| Google | Force TCP Passive for GB play stability |
| Fleet ops | **5060 UDP invite stays** — do **not** tell operator to change all cams off 5060 |
| Where to apply | **WVP** device / play transport (lab 5061 path), not dictate Fleet platform change |

**Named MOB (after Plan A sees ZLM):**  
`mob-wvp-play-tcp-passive-v1` — WVP-side TCP Passive for play only.

---

## Suggested APPLY order (you say MOB-APPLY)

1. **`MOB-APPLY mob-zlm-relay-openh264-v1`** — Plan B actually publishes (Google’s “fix crash first”)  
2. **`MOB-APPLY mob-wvp-zlm-media-online-v1`** — Plan A WVP sees ZLM  
3. **`MOB-APPLY mob-wvp-play-tcp-passive-v1`** — TCP Passive on WVP play  

Keep soft-after fail-open. Never ZLM-before-Fleet-invite.

---

## Competence line

Google’s **libx264 / lgpl** diagnosis matches our log.  
Blind **copy** may be wrong for **mpeg1 JSMpeg → RTMP**; we say that up front so we don’t burn another night.  
**openh264 first** unless you explicitly APPLY stream-copy.

---

## One line

**Google Plan B crash = real. ME8 first MOB = `mob-zlm-relay-openh264-v1` (not blind copy). Then WVP media-online. TCP on WVP only. 5060 stays.**
