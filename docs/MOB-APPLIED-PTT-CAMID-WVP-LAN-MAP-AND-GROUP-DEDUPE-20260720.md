# MOB-APPLIED — PTT camId WVP lan map + group config dedupe

**Date:** 2026-07-20  
**MOBs:** `MOB-APPLY-PTT-CAMID-WVP-LAN-MAP-V1`, `MOB-APPLY-PTT-GROUP-CONFIG-DEDUPE-V1`  
**DISC:** `docs/MOB-DISC-PTT-CHIN-FAIL-CHOPPY-COLD-HW-20260720.md`

---

## Problem

1. **Chin soft PTT dead** — `:29201` login from `192.168.1.139` resolved to ghost **`UB-6A5G`** instead of `34020000001329000008` (stale Fleet contact cache; WVP register peer not in `camIdByIp`).
2. **kk choppy** — live open fired **6× `group config sent` per cam in ~25 ms** (handoff fan-out), destabilizing `:29201` mid-talk.

---

## Change

### MOB #1 — camId from WVP register peer

| File | Change |
|------|--------|
| `lib/wvpSipLanMap.js` | `resolveGbIdByPeerIp`, `eachRegisterPeerIp`, `setOnRegisterPeer` hook on `rememberRegisterPeer` |
| `server.js` | `resolvePttCamId` checks WVP map **before** stale `camIdByIp`; `seedCamIdByIpFromWvpMap()` after contact cache load; live hook updates map on new REGISTER peer |

**Not touched:** `pttServer.js`, `ptt-rx.js`, `video-wall.js`.

### MOB #2 — group config dedupe

| File | Change |
|------|--------|
| `server.js` | `pushPttGroupForCamera` throttled to **1 per cam per 2 s** (`group config coalesced` log); `schedulePttGroupRefreshForCam` coalesces duplicate 2 s/8 s timer pairs per cam (`group refresh coalesced`) |

---

## Log markers

```
login ok | camId:34020000001329000008 | peer:192.168.1.139:...
group config coalesced | path:ptt-group-config-dedupe-v1
group refresh coalesced | path:ptt-group-config-dedupe-v1
```

Expect **1** `group config sent` per cam per live open burst (not 6+).

---

## Operator test

1. **Restart ME8** (server.js + wvpSipLanMap.js changed).
2. Hard refresh dashboard once.
3. Open live **Chin** → hold soft PTT → ear + log `operator talk start` for `…008`.
4. Open **kk** → hold soft PTT → compare choppiness (should be smoother).
5. Press **hardware PTT** on BWC → watch for `rx from field started` (APPLY #3 if still dead).

| Pass | Fail |
|------|------|
| Chin `login ok` → `…008` | Still `UB-6A5G` |
| Chin soft talk start + ear | wake only |
| kk ear smoother; ≤2 group config per open | still 6+ storm or choppy |
| Cold button `rx from field` | no wire → name APPLY #3 |

---

## One line

WVP REGISTER peer IP now maps to the correct GB camId on `:29201` login; group MESSAGE pushes are throttled so live handoff cannot flood PTT config.
