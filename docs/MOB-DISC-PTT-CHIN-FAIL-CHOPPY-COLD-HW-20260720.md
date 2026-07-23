# MOB-DISC — Chin PTT fail, choppy ear, cold hardware button

**Date:** 2026-07-20  
**Status:** DISC only — **no code** until you name APPLY  
**Operator report:** kk soft PTT **works** (ear). **Chin soft PTT dead.** **Hardware cold PTT button** on BWC dead (both cams). Audio **very choppy** — not the smooth classic Fleet PTT tuned over months.

**Env (lab):** `FM_WVP_VIDEO_HANDOFF=1`, native **29201**, gtid **49**, WVP on `:5060`, handoff FLV `:18088`.

---

## Direct answer (one screen)

| Symptom | Log root cause | Classic baseline had this? |
|---------|----------------|----------------------------|
| **Chin soft PTT dead** | Chin TCP login on `:29201` maps to **`UB-6A5G`**, not `…008`. Desk talks to `…008`; session lives under ghost id. | **No** — Jun–Jul logs always showed `login ok` → `camId:34020000001329000008` from Chin IP. |
| **kk works but choppy** | Talk path **does** run (`operator talk start` on `…009`). Same live-open window fires **6× `group config sent` per cam in ~25 ms** → PTT TCP churn / re-login storm. | **No** — classic had one group push per wake/register, not 6 stacked handoffs. |
| **Cold hardware PTT dead** | **Zero** `rx from field started` on **2026-07-20** (last was Jul 17). Inbound `:29201` from BWC button never reached desk RX. | Classic **did** log `rx from field` when button pressed. |
| **Not classic audio stack change** | `amplifyAlaw(buf, 1.5)`, `pttServer.js`, `ptt-rx.js` **JITTER_SEC 0.08** — same as Jul 18 classic-pass / months of lab. | Unchanged locked cores. |

**This is not “redo PTT from scratch.”** It is **WVP-handoff topology + new group relay + broken IP→camId map for Chin** sitting on top of the classic `:29201` stack you already PASS’d.

---

## Log proof — 16:53–16:54 (`storage/fleet.log`)

### Chin — wrong camId on 29201 login

```
login ok | peer:192.168.1.139:50338  user:UB-6A5G  camId:UB-6A5G
downlink cmd seed | camId:UB-6A5G  cmd:4  legacy:true
```

Desk soft PTT to Chin (`…008`): **`operator fleet ptt wake` for …008** — **no** `operator talk start` for `…008`.

### kk — correct camId, talk works

```
login ok | peer:192.168.1.90:56650  user:UB-6A5G  camId:34020000001329000009
downlink cmd seed | camId:34020000001329000009  cmd:130  legacy:false
operator talk start | camIds:["34020000001329000009"]
```

### Group config storm (both cams) — new vs classic

On one live-open burst (~16:53:52):

- **6×** `group config sent` for `…008` in **25 ms**
- **6×** for `…009` in **30 ms**
- Each paired with `group refresh scheduled` reason **`wvp-video-handoff`**
- Upstream: **duplicate** `invite skipped | wvp_video_handoff` / `start-video` for same cam (UI/handoff fan-out)

Classic Jul 18 PASS did **not** have `wvpPttGroupRelay` or handoff-driven refresh stacking.

### Cold hardware PTT — no wire today

```
grep "2026-07-20.*rx from field" fleet.log  →  (empty)
```

Last successful cold RX: **2026-07-17** Chin `…008`. Jul 15 kk only before that.

Hardware button = **cam → desk** inbound on `:29201` (`handleInboundPttAudio` → `ptt-rx-audio`). Separate from soft desk→cam TX. **Not fixed** by contact relay alone.

---

## Why Chin broke (mechanism)

### 1. `resolvePttCamId` only knows stale `camIdByIp`

```7555:7562:server.js
function resolvePttCamId(peerIp, pttUser) {
    const ip = String(peerIp || '').replace(/^::ffff:/, '');
    if (ip && camIdByIp[ip] && isBwcCameraId(camIdByIp[ip])) return camIdByIp[ip];
    // … GB id / fleet id checks …
    return isBwcCameraId(user) ? user : null;
}
```

When IP lookup fails, `pttServer.resolveCamId` **falls back to login user** `UB-6A5G`:

```218:224:lib/pttServer.js
function resolveCamId(peer, pttUser) {
    // …
    return normalizeCamId(pttUser);  // → UB-6A5G ghost
}
```

### 2. Chin’s current IP is not in the map

| Source | Chin `…008` | kk `…009` |
|--------|-------------|-----------|
| `storage/wvp-sip-lan-map.json` (correct WVP peer) | **192.168.1.139:33004** | 192.168.1.90:47935 |
| `storage/last-sip-contact.json` (stale Fleet cache) | sip `@192.168.1.90` ← **wrong** | sip `@192.168.1.90` |
| Boot `loadContactCache` → `camIdByIp[.90]` | overwritten by …009 last | **…009 wins** |

Chin moved to **.139** (WVP REGISTER peer). WVP proxy writes `wvp-sip-lan-map.json`, but **`rememberRegisterPeer` never calls `recordCamIp`**. Fleet `:5062` register path (which used to seed IP map) is not the home for WVP-homed cams.

### 3. Group MESSAGE path is OK for Chin

`group config sent` uses correct peer **`192.168.1.139:33004`** via `fleet-ptt-contact-wvp-homed-v1`. Cam **does** open TCP (`client connected` from `.139`). Failure is **after** connect — **wrong session key**.

---

## Why kk ear is choppy (not a gain / jitter change)

**Checked — unchanged from classic:**

| Piece | Today | Jul 18 classic-pass / months |
|-------|-------|------------------------------|
| TX gain | `amplifyAlaw(buf, 1.5)` on `ptt-audio` / `call-audio` | Same |
| `lib/pttServer.js` | Locked Firmware Gold core | Same file in baseline |
| `public/js/ptt-rx.js` | `JITTER_SEC = 0.08` | Same |
| WVP VoiceAdapter / broadcast uplink | **Removed** (ARCH cancel) | N/A |

**New behavior that can chop smooth audio:**

1. **Group config flood** on live open (6× per cam) → BWC re-reads group / may **drop and reopen** `:29201` mid-session.
2. **`schedulePttGroupRefreshForCam`** fires at **2 s + 8 s** per handoff — stacked when multiple handoffs for same cam.
3. UI **`ptt-wake-device` + `ptt-restore-always-on`** on wall open (video-wall.js) adds more pushes on top of handoff refresh.
4. Duplicate **`start-video` / handoff** events in log (same cam, same second) — not classic single-invite discipline.

So choppiness is **PTT session stability**, not a different codec or player.

---

## Baseline arc — day 1 → pre-MVP → today

| When | Topology | Chin PTT | kk PTT | Cold BWC button | Audio quality |
|------|----------|----------|--------|-----------------|---------------|
| **Jun–Jul classic lab** (day-1 → Jul 17) | Fleet SIP **:5062**, cam registers Fleet, group MESSAGE direct | `login ok` → **…008** from Chin IP | Same pattern **…009** | **`rx from field`** in logs | Operator PASS — months of tuning |
| **Jul 18 classic-pass snapshot** | `FM_LAB_WVP=0`, no handoff, no `wvpPttGroupRelay` | Native stack in `baseline/2026-07-18-classic-pass/lib/pttServer.js` | Same | Same | **Known PASS floor** |
| **Jul 19–20 MVP (WVP on Fleet)** | Live via WVP/ZLM handoff; SOS via `:5060` proxy; PTT group via **new** UDP relay | Contact relay OK; **IP map not WVP-aware** → Chin ghost | Relay + IP map lucky (.90 → …009) | No Jul 20 `rx from field` | kk works but **storm-choppy** |

**Pre-MVP voice product:** Fleet UI sockets (`ptt-start` / `ptt-audio` / `ptt-rx`), `:29201` TCP, G.711 — **unchanged**.  
**What MVP added:** WVP video handoff, `:5060` group MESSAGE relay, handoff-triggered PTT refresh — **without** updating IP→camId for WVP register peers.

See also: `docs/MOB-DISC-BASELINE-LINK-NOT-REDO-PTT-20260720.md` — baseline link is the right direction; this DISC names **which gap** link must close (camId map + dedupe, not VoiceAdapter).

---

## Three problems → three fixes (ranked)

### 1 — Chin camId resolve (do first)

**MOB:** `MOB-APPLY-PTT-CAMID-WVP-LAN-MAP-V1` (name flexible)

- In `resolvePttCamId`: reverse lookup **peer IP → GB id** from `wvp-sip-lan-map.json` (and/or PTT TCP peer, not stale `last-sip-contact`).
- On WVP `rememberRegisterPeer`: also **`recordCamIp(camId, peerIp)`** so map stays warm.
- On boot: seed `camIdByIp` from WVP map for online devices — **no hardcoded Chin/kk IDs**.
- **Pass check:** `login ok` from `.139` shows **`camId:34020000001329000008`**, then `operator talk start` for …008.

### 2 — Group config dedupe (choppy kk)

**MOB:** `MOB-APPLY-PTT-GROUP-CONFIG-DEDUPE-V1`

- Coalesce `pushPttGroupForCamera(camId)` — e.g. one emit per cam per **2 s** window; drop duplicates.
- Coalesce `schedulePttGroupRefreshForCam` — one pending 2 s / 8 s pair per cam.
- Optional: dedupe duplicate `start-video` handoff on UI (separate MOB if needed).

**Pass check:** one live open → **1–2** `group config sent` per cam, not 6+; hold PTT 5 s → smooth ear like classic.

### 3 — Cold hardware PTT proof (after 1+2)

**MOB:** `MOB-APPLY-COLD-PTT-RX-PROOF-V1`

- Press BWC button 3 s; expect **`rx from field started`** with correct **GB camId** in log + desk `ptt-rx` banner/audio.
- If still dead with correct login: then trace BWC firmware group / gtid / cmd — **not** before camId fix.

---

## What we do NOT do (unless you order it)

| Action | Why not default |
|--------|-----------------|
| Re-enable WVP VoiceAdapter / broadcast uplink | ARCH cancel — native `:29201` is the product path |
| Full `RUN RESTORE-ME8-CLASSIC-PASS-20260718` | Wipes today’s WVP live/SOS/handoff PASS |
| Hardcode Chin IP `.139` or cam id | Rules — use map lookup only |
| Touch `pttServer.js` / `ptt-rx.js` / `video-wall.js` PTT hold cores | Firmware Gold lock unless you name file + APPLY |
| Another A/B/C architecture menu | Baseline link + two targeted APPLYs above |

---

## Operator retest after APPLY 1+2

1. **Restart** ME8.
2. Hard refresh dashboard once.
3. Open live Chin only → log: **one** cluster of group config, `login ok` **…008**.
4. Hold soft PTT Chin → ear + `operator talk start` …008.
5. Open kk → hold soft PTT → compare choppiness to before.
6. Press **hardware PTT** on each BWC 3 s → watch for `rx from field` + desk RX.

| Step | Pass | Fail |
|------|------|------|
| Chin login | `camId:…008` from `.139` | Still `UB-6A5G` |
| Chin soft | talk start + ear | wake only |
| kk soft | smooth ear | still choppy → need dedupe tuning / live-open dedupe |
| Cold button | `rx from field` | no wire → APPLY 3 |

---

## Your call

1. **`MOB-APPLY-PTT-CAMID-WVP-LAN-MAP-V1`** — Chin identity fix (first).  
2. **`MOB-APPLY-PTT-GROUP-CONFIG-DEDUPE-V1`** — choppy storm fix (second).  
3. **`MOB-APPLY-COLD-PTT-RX-PROOF-V1`** — after 1+2 if button still dead.

**No code in this MOB.**
