# MOB DISC — Call / PTT / SOS / missed-PTT “all dead” (NO APPLY)

**Status:** DISC only — 2026-07-19 · **no code until named MOB-APPLY**  
**Subject:** `MOB-DISC-CALL-PTT-SOS-DEAD-AFTER-ZLM`  
**Evidence:** Operator screenshot — browser alert **`Start live video before calling`** after Play + Call  
**Related:** `MOB-APPLY-FRONTEND-ZLM-PRIMARY-V2`, `MOB-DISC-FLEET-INVITE-WHILE-ZLM-ACTIVE-20260719.md`, bank 5+3 pages (layout only)

---

## Short verdict

**Not the bank tabs that print that Call alert.**  

Your screenshot is the **server** refusing Call because it thinks **Fleet live is not up** for that cam — even when the wall/pin **looks** live on **WVP-ZLM** (`<video>` / mpegts).

That is the same **ZLM picture without Fleet live registration** gap we already documented. It can make **Call, PTT TX, and parts of SOS live** feel “all dead” while a ZLM image still shows.

**Bank A/B size MOBs** = CSS layout only. They do **not** emit `Start live video before calling`.

---

## Proof chain (Call)

### What you see
1. Click **Play** (panel or pin may show picture).  
2. Click **Call**.  
3. Alert: **`Start live video before calling`**.

### Where that string is created

`server.js` → `startBwcVoiceCall`:

```text
if (!dashboardVideo.isStreamingForCam(camId)) {
    emitBwcCallState(camId, false, 'Start live video before calling');
    return;
}
```

So Call requires **`liveStreamPool` / dashboard Fleet streaming** for that cam — **not** “mpegts `<video>` is painting on the Ops page.”

### Why Play can still show video

Wall path after ZLM-primary APPLYs:

```text
assignCamToSlot
  → mountWallZlmPrimary  (broker → softAttachZlmOverlay)
      SUCCESS → players/zlm overlay set, UI “Live”
      **NO** ensureInvite / **NO** socket `start-video`
  → only on ZLM fail → fallbackFleetJsmpeg → ensureInvite → Fleet INVITE
```

Client `isLiveCamId()` can be **true** from `wallHasPlayerForCam` / ZLM overlay → Call **button** appears.  
Server `isStreamingForCam()` stays **false** → Call **click** dies with that alert.

**UI and server disagree.** That matches your screenshot exactly.

---

## Why PTT / pin PTT feel dead (same family)

| Piece | Depends on |
|-------|------------|
| Call | Server `isStreamingForCam` (Fleet pool) |
| PTT TX ready | Often BWC on PTT channel after live/wake path; UI uses `pttOnlineDevices` from server `ptt-device-state` |
| Classic live | `start-video` → INVITE → pool streaming → PTT channel come-up |

If ZLM succeeds **without** Fleet `start-video`, BWC may **never** join the PTT path the dashboard expects → hold-PTT on wall/pin feels dead even with a picture.

**Missed PTT / linger alerts** are a **separate RX path** (`ptt-rx.js` + server PTT RX events). Possible causes:

1. Same lab: PTT TCP / always-on not healthy.  
2. Live suppress: when dashboard thinks cam has **active live**, full missed-PTT banner is suppressed (by design) — only compact toast. If ZLM marks “live” wrongly for RX policy, cold missed alerts look “gone.”  
3. Socket / `PttRx.init` not running (less likely if other socket features work).

Need one cold test: **no live open**, field presses PTT → do you get banner? If **no** even then → PTT RX/server, not only ZLM-Call gap.

---

## Cold SOS

SOS UI (`onSosAlarm`) still runs in `video-wall.js`. Cold SOS that needs **new** live usually wants `startVideo` / invite.  

If ZLM-primary + skip invite leaves SOS on a path that never registers Fleet (or ZLM fail + Fleet 408), SOS feels broken: banner maybe, **no usable live / no Call / no PTT**.

Bank auto-flip (`ensureBankVisibleForSlot`) can **jump tabs** when SOS assigns a bank-B slot — annoying, **not** the Call alert string.

---

## What is NOT the first suspect

| Item | Role |
|------|------|
| `MOB-APPLY-PANEL-BANK-B-MATCH-A-SIZE` | CSS height only |
| `MOB-APPLY-PANEL-WALL-5-PLUS-3-PAGES` | 8 slots + tabs; keep-live hide |
| Cover / contain | Picture crop only |

Do **not** “fix Call” by more panel CSS.

---

## Options (DISC — pick one APPLY later)

### Option A — Prefer (product-correct for WVP-ZLM primary)

**Register ZLM watch with the server without Fleet INVITE**, and/or **widen Call gate**:

- On successful `mountWallZlmPrimary`, tell server “Ops is watching this cam” (liveViewers / dashboard-watching / small socket), **without** SIP INVITE.  
- Call check: allow `isStreamingForCam` **OR** dashboard-watching **OR** explicit WVP/ZLM session for cam.  
- PTT: ensure wake/online policy still runs for ZLM-only watch (may need a thin “ptt arm” without full FFmpeg).

Suggested name: **`MOB-APPLY-ZLM-WATCH-REGISTER-CALL-PTT`**

### Option B — Classic restore of invite-on-play

On Play / SOS, **always** `ensureInvite` even if ZLM mounts (or drop ZLM-primary skip). Restores Call/PTT the old way; brings back Fleet INVITE / 408 noise when cams are WVP-only.

Suggested name: **`MOB-APPLY-LIVE-ALWAYS-FLEET-INVITE-WITH-ZLM`** (or named revert of ZLM-skip-invite only).

### Option C — Do not do

Blind `RUN RESTORE` / wipe bank tabs / shotgun delete ZLM without naming the Call/PTT contract.

---

## Operator checks (before APPLY)

1. After Play: do you **see** picture on panel/pin? (Yes/No)  
2. Call → same alert as screenshot? (Yes = this disc)  
3. Cold, **no** live: field PTT → missed banner? (separates RX from Call gate)  
4. Cold SOS: banner only vs banner+live?

---

## Proposed order

1. Keep bank size as you locked (Match-A).  
2. Next named APPLY = **Call/PTT/SOS live contract** (A or B above) — **one MOB**, no layout freestyle.  
3. Only then re-test cold SOS + pin PTT + missed PTT.

---

## Status

**DISC only.**  

Root of your Call screenshot: **ZLM UI live ≠ server Fleet streaming.**  
Waiting for **`MOB-APPLY-ZLM-WATCH-REGISTER-CALL-PTT`** or **`MOB-APPLY-LIVE-ALWAYS-FLEET-INVITE-WITH-ZLM`** (or your exact name) — not another panel CSS MOB.
