# MOB DISC — FAIL screenshot: pin top-left · no video · BWC dark · “old server?” · can agent start?

**Date:** 2026-07-21 ~01:00  
**Status:** DISC only — **no APPLY**  
**Operator:** Screenshot FAIL — pin tab jumps top-left, no video, BWC not lit. Asks: start everything for me; is there no fix; are we on old server?

---

## Short answers

| Question | Answer |
|----------|--------|
| Is there **no fix**? | **No.** This FAIL is real. Fix is not done. Do not pretend PASS. |
| Are we on an **old other server folder**? | **No.** Windows service **UbitronC2** runs `node server.js` from **this ME8 folder** (`…\Enterprise Mobility\ME8`). Not a mystery baseline zip. |
| Why does it *feel* like old / broken? | Pin-first start **did not fire** on this click (log proof). Plus **dock jump** still open. Two scars, one screenshot. |
| Can the agent “start everything” for you? | Agent can **try** to restart **UbitronC2**. If Windows blocks Admin, **you** must double-click **`LAB-CONSOLE-START.bat`** and click Yes. Agent cannot click UAC for you. |
| Close all first? | Close the **browser tab** only. Then restart service / bat. Then hard refresh. |

---

## What your screenshot shows (three fails in one frame)

| # | What you see | Meaning |
|---|--------------|---------|
| 1 | Pin chrome at **top-left** (over zoom +/−) | **Dock / layout jump** — `assignColocatedPinPopupDocks` still snapping popups. Not fixed by pin-mirror MOBs. |
| 2 | Empty video area (no picture) | **Live never painted** — no wall FLV to mirror. |
| 3 | BWC not lit | **Stream never started** on the device (or died instantly). Light follows real play, not popup chrome. |

Roster still shows Chin + kk **online** (green). Online ≠ Live video.

---

## Log proof (not vibes) — ~00:57 test window

Around your screenshot time (`Device time` ~00:57), `storage/fleet.log` shows **only** SIP DeviceStatus / keepalive for Chin + kk.

**Missing in that window:**

- `reason":"start-video"`
- `wvp video handoff start`
- `invite skipped` / handoff play

So: **pin click opened the UI shell, but did not successfully drive `start-video` / WVP play.**  
That is why BWC stays dark and pin stays empty — not because “mirror math forgot Chin.”

Earlier tonight (~00:30–00:40) the **same** ME8 service **did** log `wvp video handoff start` for Chin — so WVP handoff **can** start from this tree. Your latest pin-first click **did not reach that path**.

---

## “Old server” — exact lab fact

| Fact | Detail |
|------|--------|
| Service name | **UbitronC2** (Running) |
| App directory | `C:\Users\user\Desktop\Enterprise Mobility\ME8` |
| Entry | `node.exe server.js` via NSSM |
| Dashboard port | **3988** owned by that service process |
| Env in ME8 `.env` | `FM_WVP_VIDEO_HANDOFF=1` (handoff ON) |

So you are **not** accidentally in `baseline\2026-07-18-classic-pass`.  
You **are** on ME8 + WVP handoff. The product path is still broken for **pin-first start + dock**.

### Bat confusion (why restarts feel weird)

`LAB-CONSOLE-START.bat` → stops service → calls `RESTART-FLEET.bat` → **`restart-fleet-prefer-service.ps1` prefers restarting UbitronC2 again** (not a long-lived black “node server.js” window).  

That is **correct for this PC** (service = ME8 folder). It is **not** “old ship elsewhere.” It just does not look like a console you leave open.

---

## Why pin-first MOB can still FAIL like this

Last APPLY intended: pin click → `startWallLiveForPinCam(camId)` → wait → mirror on FLV prove.

Your desk + log say: **that start never hit the server** on the failing click. Likely causes (ordered):

1. **Browser still on old JS** (hard refresh missed / wrong host) — Network must show `video-wall.js?v=20260721-pin-click-starts-wall-mirror-v1`  
2. **`wvpVideoHandoff` capability false** until service actually reloaded `server.js` after that APPLY — then code may not take the handoff wait path; other guards may no-op play  
3. **UI guard** — `shouldLazyPinLive` / user-stop / missing `.map-pin-video` host after dock threw layout — popup chrome without play path  
4. **Dock storm** moved popup to top-left and broke the video host attachment timing  

This is **not** “give up.” It is **prove start-video on pin click**, then fix dock separately.

---

## What is NOT the answer

- Park WVP / turn handoff off  
- “Just click panel first” as the product  
- Blame baseline folder / random old zip  
- Bundle kk SIP + dock + pin-start into one blind rewrite without log proof  

---

## What you do now (operator — one path)

1. Close the dashboard **browser tab**.  
2. Double-click **`LAB-CONSOLE-START.bat`** → Yes on Admin if asked → wait until up.  
3. Open `http://192.168.1.38:3988` (your lab IP — **not** 172.x).  
4. **Ctrl+Shift+R**.  
5. DevTools Network: confirm `video-wall.js?v=20260721-pin-click-starts-wall-mirror-v1`.  
6. Wall Idle → click **Chin pin only**.  
7. Tell agent:  
   - Did Network show that `?v=`?  
   - Console: any `[me8-pin-mirror]` or `[me8-flv]`?  
   - PASS/FAIL picture + did BWC light?

Agent will then read `fleet.log` for `start-video` / `wvp video handoff start` in that minute.

---

## Next APPLYs (when you order — after prove)

| Order | MOB | Why |
|-------|-----|-----|
| 1 | Prove / fix **pin click → start-video** (log must show handoff start for clicked camId) | BWC light + wall + pin paint |
| 2 | `HANDOFF-SUPPRESS-AUTO-PIN-DOCK-STORM` / dock jump | Top-left snap |

Do **not** mix until (1) logs `wvp video handoff start` on pin-only click.

---

## Bottom line

**There is a fix path. You are on ME8 service, not a mystery old folder. This screenshot = pin UI opened without starting live + dock jump. Log shows no start-video at fail time. Restart bat → hard refresh → pin-only click → we prove whether start-video fires. Agent cannot finish UAC restart without you.**
