# MOB DISC — Google reply: keepalive unlocks Plan A + Plan B discardcorrupt (no hardcode)

**Status:** LOCKED 2026-07-17 ~00:18  
**Search:** `google keepalive`, `media_server list`, `未找到可用的zlm`, `discardcorrupt`, `mob-wvp-zlm-media-online-v1`  
**Source:** Operator paste — Google answers to `MOB-DISC-GOOGLE-ASK-RES-AND-WVP-NOW.md`  
**5060:** Fleet SIP stays — no change

---

## Google said (accept)

| # | Google | ME8 action |
|---|--------|------------|
| 1 | Plan A blocked until ZLM heartbeats WVP via **`on_server_keepalive`** | Named MOB: **`mob-wvp-zlm-media-online-v1`** |
| 1b | Prove: `GET /api/server/media_server/list` → not empty, **status true** | Agent check before claiming PASS |
| 2 | Plan A FLV = device GB H.264 native res; ZLM no transcode → **drop Plan B for panel quality** when A works | After `wvp-zlm primary` PASS |
| 3 | Plan B 0x0 = missing MPEG sequence headers on WS; filter junk, **no hardcode scale** | Later MOB: Plan B ffmpeg args (below) |
| 4 | No `-c:v copy` on mpeg pool; keep **libopenh264** | Already APPLIED |

**Order Google wants:** media-online first → then TCP Passive. Plan B patch only as fallback harden.

---

## Plan A — agent-checkable fact (Google)

WVP does **not** poll ZLM HTTP “alive.”  
Availability = Redis/logical online fed by ZLM webhook **`on_server_keepalive`**.  
No keepalive → `未找到可用的zlm` → `startPlay` dead.

**Verify (with JWT after login):**  
`GET http://127.0.0.1:18080/api/server/media_server/list`  
Header: `access-token: <jwt>` (WVP 2.7 — not Bearer)  
- empty or `status: false` → hook failing  
- online/status true → media server unblocked for Plan A  

**Second blocker (ME8 lab, not in Google paste):** even with ZLM online, `stackSelfcheck` may show **`devicesOnline: 0`** — cams must answer **WVP SIP 5061** for GB play. Fleet **5060** stays for daily ops. Keepalive alone may not make wall green if WVP still has zero online devices.

---

## ME8 caution — do **not** blindly paste Google’s `127.0.0.1` hook

Google example: `http://127.0.0.1:18080/index/hook/on_server_keepalive`

| Stack | Correct keepalive target from **ZLM container** |
|-------|--------------------------------------------------|
| **Modern split** (`me8-wvp-zlm` → `me8-wvp`) | `http://me8-wvp:18080/index/hook/on_server_keepalive` (Docker DNS) |
| Host-only / same network namespace | `127.0.0.1:18080` can work |

**Why:** Inside `me8-wvp-zlm`, `127.0.0.1` is **ZLM itself**, not WVP.  
Repo already has modern hook → `me8-wvp` in `docker/wvp/zlm-modern/config.ini`.  
If list still offline: hook URL wrong **or** keepalive not arriving **or** secret/id mismatch **or** Redis/WVP not accepting hook — prove with `media_server/list` + ZLM/WVP logs, don’t “more startPlay.”

**Bundled fossil** `docker/wvp/zlm-bundled/config.ini` has **`on_server_keepalive=` empty** — only relevant if that stack is the one WVP uses (lab modern uses split).

---

## Live proof NOW (2026-07-17 ~00:19) — Google was right

`GET /api/server/media_server/list` (JWT `access-token`):

| Field | Value |
|-------|--------|
| id | `me8-zlm-modern` |
| ip / hookIp | `me8-wvp-zlm` / `me8-wvp` |
| secret / id | match selfcheck |
| **status** | **`false`** |
| **lastKeepaliveTime** | **`null`** |

So: row exists, secret/id match, but **no keepalive ever landed**.  
File already has `on_server_keepalive=http://me8-wvp:18080/index/hook/on_server_keepalive` — config string alone ≠ hook working. APPLY must prove packets hit WVP (restart ZLM, fix hook path/port/auth, check ZLM hook logs).

Also: `devicesOnline: 0` (selfcheck) — second gate after status true.

---

## Named MOB — `mob-wvp-zlm-media-online-v1` (waiting APPLY)

**Goal:** `media_server/list` → `status: true` + non-null `lastKeepaliveTime`; then soft open → log **`live broker wvp-zlm primary`** (needs cams on WVP 5061 too).

**Likely agent steps (after you say MOB-APPLY):**
1. Dump `media_server/list` (before) — already: status false, lastKeepalive null  
2. Prove ZLM can HTTP POST keepalive to WVP from inside `me8-wvp-zlm`  
3. Fix whatever blocks hook (URL/path/enable/alive_interval/WVP accept) — not more app geometry  
4. Restart **me8-wvp-zlm** (WVP if needed)  
5. Dump list (after) — status true + lastKeepalive set  
6. Soft open → prove `wvp-zlm primary` (and note device online count)

**Do not:** change Fleet **5060**; do not hardcode wall res; do not more geometry scale MOBs.

---

## Plan B harden (later — not first)

Google ffmpeg (fail-open only):

**Before `-i`:**  
`-fflags +genpts+discardcorrupt`  
`-analyzeduration 10000000` `-probesize 10000000`

**Output side:**  
`-ignore_unknown`

**Remove:** `-vf scale=…` (including probe-locked 640×480) — follow native after valid header.

**Keep:** `-c:v libopenh264`  
**Named later:** e.g. `mob-zlm-relay-discardcorrupt-v1` — only after Plan A path decided / or as parallel fail-open.

---

## Next after Plan A online

`mob-wvp-play-tcp-passive-v1` — WVP play TCP Passive only (not Fleet 5060).

---

## One line

**Google: keepalive webhook = Plan A unlock; prove with media_server/list. Plan B = discardcorrupt + no scale hardcode. ME8: use me8-wvp DNS not 127.0.0.1 inside Docker ZLM.**
