# MOB APPLIED — mob-wvp-zlm-media-online-v1

**Date:** 2026-07-17 ~00:26  
**Source:** Google keepalive / `media_server/list`  
**Disc:** `docs/MOB-DISC-GOOGLE-REPLY-KEEPALIVE-AND-PLAN-B-0x0.md`

---

## Root cause (proved)

| Item | Before |
|------|--------|
| Hook URL in ini | Already `http://me8-wvp:18080/index/hook/on_server_keepalive` |
| ZLM Docker network | **`wvp_default`** (orphan `-p wvp`) |
| WVP / redis / db network | **`me8-wvp_default`** |
| Result | DNS `me8-wvp` failed from ZLM → keepalive `network err` → `status: false` → 未找到可用的zlm |

Not a missing ini string. **Split Docker networks.**

---

## What we did

1. Live: `docker network connect me8-wvp_default me8-wvp-zlm` → disconnect orphan `wvp_default` → restart ZLM  
2. Persist: `docker/wvp/docker-compose.wvp.yml` — `name: me8-wvp` + `networks.default.name: me8-wvp_default`  
3. Persist: `scripts/START-WVP-LAB.ps1` — ensure ZLM on project network after `up -d`  
4. Agent check: `lib/wvpLabClient.js` `stackSelfcheck` includes `mediaServer.status`

---

## Proof after

WVP log:
```
[ZLM HOOK] zlm 启动 me8-zlm-modern
[ZLM-连接成功] ID：me8-zlm-modern
[媒体节点] 上线 ID：me8-zlm-modern
[媒体服务节点] 设置成功
```

API: `GET /api/server/media_server/list` → **`status: true`** for `me8-zlm-modern`.

---

## Operator

- Docker fix already applied live — **no need** to change Fleet 5060  
- Soft open again; log hope: **`live broker wvp-zlm primary`** if cams answer **WVP SIP 5061**  
- If still `wvp_startplay_failure` with ZLM online: next gate is **`devicesOnline: 0`** (cams on 5061), not keepalive  
- Next named (Google): `mob-wvp-play-tcp-passive-v1` after play path works  

---

## One line

**ZLM was on wrong Docker network; joined me8-wvp_default → keepalive → media status true.**
