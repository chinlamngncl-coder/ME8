# MOB DISC — Google handoff · what agent did · what broke

**Date:** 2026-07-19 ~00:41 +08  
**Status:** HANDOFF — operator taking this to Google  
**Operator order:** Do not push “go back classic” again. Document mess. Google helps next.

---

## Copy this block to Google

```
ME8 / Mobility Axiom lab — WVP→ZLM picture restore FAILED. Agent thrashed. Need ONE next named MOB from Google.

GOAL (operator): Put back yesterday’s working WVP→ZLM picture (live broker wvp-zlm primary + FLV paint). Soft Open UI storm stays FROZEN. Do not surrender to classic-only forever.

STACK
- Windows PC LAN IP 192.168.1.38 (never 172.x)
- Dashboard :3988 (operator uses localhost:3988 for mic/PTT)
- Fleet Node SIP :5062 (YDT / classic)
- Host SIP proxy :5060 → WVP Docker :15061
- WVP UI :18080 admin/admin
- ZLM HTTP FLV should be :18088 (Docker me8-wvp-zlm maps 18088→80 and 80→80)
- Cams: Chin …0008, kk …0009

WHAT WORKED YESTERDAY (~2026-07-17 evening)
- ~30 min dual Soft Open soak: live broker wvp-zlm primary, FLV host 192.168.1.38:18088, clean stopPlay
- Then Soft Open UI freestyle hurt Ops → frozen Soft Open UI; classic Fleet PASS with FM_LAB_WVP=0

AGENT SEQUENCE (2026-07-18 → 07-19) — PROBLEMS
1) mob-wvp-zlm-infra-up-classic-floor — Docker already up; Ops video unchanged (flags still classic). Felt like fake “bring WVP back.”
2) mob-wvp-zlm-thin-picture-chin-v1 — FM_LAB_WVP=1 + skip Fleet INVITE for Chin. WVP startPlay failed → NO live (black hole).
3) undo-thin → classic-live-ok (FFmpeg) — operator confirmed.
4) wvp-thin-picture-v2-failopen-fleet — Fleet INVITE always on; WVP try soft-after. Log: wvp_startplay_failure failopen ffmpeg. Looks like no change (correct fail-open).
5) restore-yesterday-wvp-zlm-picture-chin — skip Fleet INVITE Chin again + presence=1. Log DID show live broker wvp-zlm primary restoreYesterday=true but uiFlvHost=192.168.1.38 WITHOUT :18088. Operator: BWC lit, NO VIDEO.
6) mob-softopen-ui-flv-port-fix-v1 — Fixed rewriteStreamHost in lib/wvpLabClient.js to force FM_WVP_ZLM_HTTP_PORT=18088 (was stripping :80 → bare host).
7) Operator: Chin not on platform; kk cam-UI connected; BOTH offline on Ops. Presence paint FM_WVP_FLEET_PRESENCE=1 caused fake greens earlier; then offline. Proxy log still shows REGISTER to :5060 from cams. Agent then flipped env back to classic (FM_LAB_WVP=0, presence=0) — operator REJECTED “go back again.”

CURRENT ENV (after agent last-chance classic flip — operator angry, may still be this on disk)
FM_LAB_WVP=0
FM_SOFTOPEN_WVP_ONLY=0
FM_WVP_THIN_CAMS=
FM_WVP_FLEET_PRESENCE=0
FM_WVP_ZLM_HTTP_PORT=18088
FM_WVP_STREAM_HOST=192.168.1.38
WVP_SIP_PROXY_LISTEN=5060 → 127.0.0.1:15061
Fleet SIP FM_GB28181_SIP_PORT=5062

CODE STILL IN TREE (inert when FM_LAB_WVP=0)
- lib/livePlaybackBroker.js — tryWvpZlmPrimary / thin allowlist
- server.js — thin skip Fleet INVITE when thin cam + lab WVP on
- lib/wvpLabClient.js — rewriteStreamHost forces :18088

KEY LOG LINES
- 2026-07-18 12:40:04 live broker wvp-zlm primary restoreYesterday uiFlvHost=192.168.1.38 (port missing before FLV fix)
- invite skipped wvp_softopen_only Chin (thin path)
- device online from wvp presence (fake Ops green when presence=1)
- wvp fleet presence poll failed / online:0
- proxy REGISTER Chin/kk to :5060 (cams talking WVP door)

OPERATOR NEED FROM GOOGLE
1) ONE named MOB to get Chin (then kk) WVP→ZLM picture on Ops WITHOUT Soft Open UI storm.
2) Honest online (no presence paint lie) OR clear rule when presence is required.
3) Exact BWC one-row keys + exact env. No ladder of undo/redo.
4) If FLV port fix was correct, say what else makes primary+black (mpegts overlay / Soft Open UI missing / ops wall attach).

Do NOT: Soft Open pin chrome freestyle; Firmware Gold restore; 172.x IPs.
```

---

## What agent did (timeline)

| When | APPLY / action | Result for operator |
|------|----------------|---------------------|
| Infra up | Docker/proxy map; flags stayed classic | No Ops picture change — felt fake |
| Thin v1 | Skip Fleet INVITE + WVP try | **No live** |
| Undo thin | `FM_LAB_WVP=0` | **classic-live-ok** |
| Thin v2 failopen | Fleet always + WVP soft try | Live OK · **still FFmpeg** (`startPlay` fail) |
| Restore yesterday | Skip Fleet again + presence=1 | Log **primary** · **no video** · bad `uiFlvHost` port |
| FLV port fix | `rewriteStreamHost` → `:18088` | Surgical; may not have been retested |
| Last-chance classic | Agent set classic env again | Operator: **fuck off · do not go back** |

---

## Root mess (one paragraph)

Split brain: Fleet `:5062` vs WVP `:5060`, Soft Open UI frozen but Soft Open **invite-skip** re-enabled for Chin, Ops dots painted by `FM_WVP_FLEET_PRESENCE` then dropped, FLV URL missing `:18088` until late fix, agent responded to each symptom with another MOB instead of one Google-grade path. Operator lost trust.

---

## Files touched (WVP genre)

- `lib/livePlaybackBroker.js`
- `lib/wvpLabClient.js` (`rewriteStreamHost` / `:18088`)
- `server.js` (thin skip Fleet INVITE)
- `.env` (flags flipped multiple times)

---

## Agent now

- No more freestyle APPLY until operator pastes Google’s named MOB.  
- Read / log / paper only unless operator says `MOB-APPLY …`.

**One line:** Handoff ready — paste Google block above; agent stops classic-undo nag; wait for Google’s one named MOB.
