# MOB DISC — What broke wake / RESTART-FLEET? Honest account (2026-08-07)

**Status:** disc only. **No code in this turn.**  
**Operator:** Software cannot wake / restart fleet. Angry. Wants to know what the agent did.

---

## Apology (plain)

You are right to be angry if Fleet will not wake after our Weapon work.  
This disc names **exact files we touched** and what can / cannot block `RESTART-FLEET.bat` or device wake. No spin.

---

## What I did (this Weapon / warm / ai_engine arc)

### A) Product code still **uncommitted** vs last push `ae70193`

| File | MOB / why | Can it stop RESTART-FLEET.bat? | Can it block live **wake** after server is up? |
|------|-----------|--------------------------------|-----------------------------------------------|
| `lib/liveViewers.js` | Weapon surface `analytics-weapon` | **No** | **Maybe** — extra viewer surface counting |
| `server.js` | `register-viewer-only` + **`holdOnly` / `noWake`** for Weapon | **No** | **Yes — highest risk** — if holdOnly path is used when stream is dead, **no SIP/WVP wake** |
| `lib/weaponSidecarClient.js` | Warm ≠ ready; longer wait if `FM_WEAPON_SIDECAR_AUTO=1` | **No** (not in bat) | **Low for Ops wake**; can slow/fail Weapon detect or hang **health** if AUTO spawn waits for full model load (~tens of seconds) |
| `public/js/analytics-hub.js` | Poll Weapon health until OK | **No** | **No** for Fleet wake (Weapon panel UI only) |
| `public/index.html` | Cache bust `analytics-hub.js?v=…` | **No** | **No** |
| `public/js/weapon-live-watch.js` | Emits `holdOnly: true` on register-viewer-only | **No** | **Yes with server.js** — intentional “don’t INVITE from Weapon,” but can leave **ref without stream** if mis-ordered |

### B) New folder — **not** on Fleet boot path

```
ai_engine\train.py
ai_engine\main.py
ai_engine\weights\
```

**Not** required by `RESTART-FLEET.bat` / `node server.js`.  
Manual uvicorn 8770 is lab-only. **Cannot** by itself stop Fleet restart.

### C) Paper only

`docs/MOB-DISC-*.md` — no runtime effect.

### D) What I did **not** touch

- `RESTART-FLEET.bat`  
- `restart-fleet-prefer-service.ps1`  
- `kill-fleet-ports.ps1`  
- SIP / PTT cores (`lib/sipServer.js`, `lib/pttServer.js`)  
- Firmware Gold pin / video-wall locked files  

---

## Most likely product harm (risk pick — one)

**`holdOnly` + `analytics-weapon` viewer refs** from  
`WEAPON-LIVE-KEEP-AND-FAST-OPEN-V1` (+ warm-auto later).

Intent: Weapon watches already-live FLV **without** silent INVITE, and keeps a ref so Ops idle-release does not kill the stream.

Failure mode you may be seeing:

1. Weapon (or leftover socket) registers **`holdOnly: true`** while stream is **dead**.  
2. Server **skips wake** (`wakeMedia: false`).  
3. Cam stays dark / “won’t wake.”  
4. After `RESTART-FLEET`, memory clears — but if UI re-opens Weapon watch set and re-emits holdOnly before a real Start, **same stuck dark**.

That is **not** “black = gun.” That is **wake path**.

Secondary: if `FM_WEAPON_SIDECAR_AUTO=1`, `ensureReady` → `startProcess` now waits until model **fully** ready (not just HTTP). Health/detect can stall a long time while CPU loads a huge `.pth`. That hurts **Weapon engine**, not the bat itself — unless something at boot awaits it (today boot only `weaponLivePoller.start()` timer; health await is on API).

---

## What “can’t wake / restart fleet” might mean (operator check — one pass)

Tell which (no tech jargon needed):

1. **`RESTART-FLEET.bat` window** — error / UAC cancel / BLOCKED ports / never reaches dashboard URL  
2. **Dashboard opens** but **login / blank**  
3. **Devices offline** on map after restart  
4. **Open live / pin** — Connecting forever / no picture (wake fail)

(1)–(2) are usually service/ports/Node — **not** the Weapon holdOnly MOB.  
(4) is where **holdOnly / liveViewers** is the first suspect.

---

## Recommendation (one path — restore wake first)

**Do not** invent new wake logic in the same breath as ai_engine.

**Next APPLY (when you say it):**

`MOB-APPLY WEAPON-HOLONLY-WAKE-REGRESS-REVERT-V1`

Exact scope:

1. Revert **`server.js`** holdOnly / noWake gate on `register-viewer-only` (always wake when streamWasDead, as before).  
2. Revert or neutralize **`weapon-live-watch.js`** `holdOnly: true` (stop emitting it).  
3. Keep or drop `analytics-weapon` surface counting only if still needed after (3) — prefer **minimal revert** that restores pre-keep-live wake.  
4. **Leave `ai_engine\` alone** (unused).  
5. **Leave warm-auto hub poll** unless you also want it reverted in the same APPLY (say so).

Alternate nuclear (only if you order):  
`git checkout HEAD -- lib/liveViewers.js server.js lib/weaponSidecarClient.js public/js/analytics-hub.js public/index.html`  
plus restore `weapon-live-watch.js` from last good if it was modified for holdOnly — **only after you MOB-APPLY a named revert**.

I will **not** revert until you APPLY. Mob disc ≠ edit.

---

## Standing rule reminder

Zero change without your **MOB-APPLY**. This paper does not touch product files.
