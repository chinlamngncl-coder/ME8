# MOB-DISC — kk fail while Chin PASS · hardcode audit

**Date:** 2026-07-20 ~16:30  
**Status:** DISC only — **no code**  
**Operator:** Chin wall + pin PASS. **kk does not work.** Same settings? Forbid hardcoding.

---

## Verdict

| Question | Answer |
|----------|--------|
| Did we hardcode Chin for live / pin / handoff? | **No** — path is **generic `camId`** |
| Is kk on the same code path as Chin? | **Yes** — identical pipeline |
| Why Chin PASS / kk FAIL with “same settings”? | **Not UI hardcode** — almost certainly **WVP registration / BWC SIP home / or kk never got live on wall** |

---

## Code audit (live + pin + handoff)

Searched `video-wall.js`, `live-player-factory.js`, `wvpVideoHandoff.js`, `server.js` start-video path.

| Area | Chin-only? | How it works |
|------|------------|--------------|
| `wvpVideoHandoff.ensurePlay(camId)` | **No** | Any `camId` → `wvpLab.startPlay(id, id)` |
| `shouldSkipFleetInviteForWvpSoftOpen` | **No** | When `FM_WVP_VIDEO_HANDOFF=1`, **all** cams skip Fleet INVITE |
| `attachWvpHandoffFlvForCam(camId)` | **No** | Matches slot by `dataset.camId` / channel config |
| `wallMirrorSourceForCam(camId)` | **No** | Mirror from wall canvas or `video.me8-zlm-primary` for **that** cam |
| `FM_WVP_THIN_CAMS` / thin allowlist | **Removed** | Not in current `server.js` or `lib/` — empty in `.env` history |
| `video-channels.json` | **Both listed** | Slot 0 = Chin `…008`, slot 1 = kk `…009`, same `fixed` / `sip` |
| `bwc-devices.json` | **Both listed** | Same shape |

**Not live-path hardcode (ignore for this):**

- `FM_SEED_BWC_ID` default `…008` in `server.js` — seed/demo roster only  
- `fr-alarm.js` lab preview picks first device — FR bench, not wall  
- Old **docs** mention “thin Chin” — **Jul 18 MOBs reverted**; code today has no thin gate  

**Rule respected:** no Chin-only live gate in product path.

---

## Config (Ops) — same on paper

```
Panel 1  → 34020000001329000008  Chin
Panel 2  → 34020000001329000009  kk
```

Both `sourceMode: fixed`, same protocol. **Dashboard config does not favour Chin.**

---

## Why kk fails while Chin works (ranked — not hardcode)

### 1 — kk not on WVP `:5060` (most likely)

Handoff mode (`FM_WVP_VIDEO_HANDOFF=1`):

- **Skips Fleet SIP INVITE** for every cam  
- **Requires** WVP `startPlay` for that `camId`

If **Chin** BWC SIP → WVP **:5060** and **kk** BWC still → Fleet **:5062** (or offline on WVP):

| Cam | WVP `startPlay` | Fleet INVITE | Result |
|-----|-----------------|--------------|--------|
| Chin `…008` | OK | skipped | **PASS** (your test) |
| kk `…009` | **fail / offline** | skipped | **FAIL** — black / error |

Prior disc (`MOB-DISC-CAM009-NOT-WVP-GOLD-PROOF-20260720.md`): operator said **009 intended Fleet :5062** while **008** is WVP test cam. That is **device menu**, not code — but it **explains** kk fail under global handoff.

Stale `.env` comment (lines 110–113) even says *“kk may look offline until rekeyed”* — written for classic Fleet era, still relevant as **registration** hint.

### 2 — kk live never opened on wall (pin needs wall first)

Pin mirror copies **from wall slot for that cam**. Chin PASS was panel 1 + Chin pin.

If kk panel 2 still **Idle** / never Play:

- No `video.me8-zlm-primary` for `…009`  
- Pin shows streaming overlay — **same symptom, different cause**

**Test:** open live on **panel 2 (kk)** first, then kk pin.

### 3 — WVP startPlay fail for `…009` only (log check)

Look for pair:

```
invite skipped  reason=wvp_video_handoff  camId=…009
wvp video handoff startPlay fail  camId=…009  …
```

vs Chin:

```
wvp video handoff start  camId=…008
flv-stream proxy open  camId=…008
```

If only `…009` fails → **WVP device offline / wrong platform on BWC**, not UI.

### 4 — Dual-cam / SSRC (less likely for “kk never works”)

Opening Chin then kk quickly can hit WVP busy/ssrc — usually **retry** in handoff. Would not explain kk **always** dead while Chin always OK.

---

## What “same settings” must mean on the BWC

For handoff to treat both equally, **both** need:

| BWC field | Value (lab) |
|-----------|-------------|
| GB platform / SIP server | `192.168.1.38` |
| SIP port | **5060** (WVP proxy door) |
| Device ID | `…008` / `…009` matching roster |

**Same dashboard config ≠ same BWC SIP home.** Chin may be on 5060; kk may still be on 5062 from an older session.

---

## Split brain (why this feels unfair)

```
FM_WVP_VIDEO_HANDOFF=1  →  ALL cams: WVP video only, no Fleet INVITE
kk on Fleet :5062 only  →  no WVP play, no Fleet invite  →  dead
Chin on WVP :5060       →  startPlay OK  →  PASS
```

Fix is **not** “hardcode kk.” Fix is either:

- **A)** Rekey **kk BWC** to WVP `:5060` (same as Chin), **or**  
- **B)** Named MOB: **per-cam or per-registration fallback** (WVP fail → Fleet INVITE for Fleet-homed cams only)

---

## Operator checks (no code)

1. Open **panel 2 → Play kk** — wall picture?  
2. Server log on that click — `handoff start` vs `startPlay fail` for `…009`?  
3. WVP UI / proxy — is `…009` **online** on `:5060`?  
4. kk BWC SIP port — **5060** or **5062**?

---

## Next APPLY (when you order — not now)

| Name | Intent |
|------|--------|
| **`MOB-APPLY-HANDOFF-FAILOPEN-FLEET-INVITE-V1`** | If WVP `startPlay` fails for a cam, **allow Fleet INVITE** for that cam only (no Chin hardcode) |
| **Ops** | Set kk BWC to WVP `:5060` to match Chin |

**Do not:** add `if (camId === '…008')` anywhere.

---

## One line

**No Chin hardcode** — kk uses the same handoff + mirror code; kk fails because **global WVP handoff requires WVP online per cam**, and kk is likely **not WVP-registered / not live on wall** while Chin is.
