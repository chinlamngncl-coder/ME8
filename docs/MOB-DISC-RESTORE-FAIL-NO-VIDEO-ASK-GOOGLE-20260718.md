# MOB DISC — Restore FAIL · BWC lit · no video · Google again?

**Date:** 2026-07-18 ~12:41  
**Status:** DISC — **stop agent thrash** · Google pack ready  
**Ask:** Failed. Light up, no video. Going step-1 again? Need Google?

---

## Short answers

| Ask | Answer |
|-----|--------|
| Are we replaying yesterday’s fault ladder? | **Yes — that was wrong process.** Stop. |
| Need Google? | **Yes.** Same class as Soft Open black after pack. |
| Agent freestyle more MOBs now? | **No** until Google names one APPLY |

---

## What log already proves (not “step 1 register”)

| Time | Fact |
|------|------|
| 12:39 | Chin/kk `device online from wvp presence` |
| 12:39:59 | Chin `invite skipped` (WVP picture path — expected) |
| **12:40:04** | **`live broker wvp-zlm primary`** · `restoreYesterday:true` · `uiFlvHost: 192.168.1.38` |
| 12:40:18 | Again `wvp-zlm primary` |
| You | **No video** on Ops |

So: **not** “cam offline / startPlay never ran.”  
Server already chose WVP→ZLM. Fail is **picture to screen** (player / FLV URL / overlay / Soft Open UI frozen vs wall attach) — same family Google fixed before when agent spun.

Suspicious: `uiFlvHost` shows `192.168.1.38` **without** `:18088` (yesterday’s good soaks used `192.168.1.38:18088`).

---

## Why agent “one fault at a time” wasted you

Classic → thin v1 → undo → v2 failopen → restore → black.  
Each MOB fixed the **previous** hole and opened the next. That is not a recovery plan.  
**Stop.** One Google diagnosis → one named MOB.

---

## What you do now

1. **Optional safety:** if you need working Ops today →  
   `MOB-APPLY undo-thin-wvp-back-to-classic-live`  
   (classic FFmpeg again — not giving up on WVP forever)

2. **Or stay on current flags** and paste the Google block below.

3. When Google names a MOB → you paste **`MOB-APPLY …`** only that.

---

## Copy to Google

```
ME8 restore-yesterday Chin WVP picture FAIL 2026-07-18 ~12:40 +08.

Operator: BWC online (lit). Ops localhost:3988 open Chin live → NO VIDEO.

Server log (not offline / not startPlay miss):
- device online from wvp presence (Chin …0008, kk …0009)
- invite skipped reason wvp_softopen_only (Chin thin allowlist — intentional)
- live broker wvp-zlm primary restoreYesterday=true uiFlvHost=192.168.1.38 preferDirect=true
- (twice) then operator stopped; still no picture

Stack: Windows. Dashboard :3988. Host SIP proxy :5060 → WVP Docker :15061. ZLM :18088.
Env: FM_LAB_WVP=1 FM_SOFTOPEN_WVP_ONLY=0 FM_WVP_THIN_CAMS=34020000001329000008 FM_WVP_FLEET_PRESENCE=1
Soft Open UI storm frozen — using normal Ops live open, not Soft Open chrome.
Wall soft ZLM overlay (mpegts) after video-stream-ready wvpSoftOpenOnly.

Yesterday PASS had wvp-zlm primary with uiFlvHost 192.168.1.38:18088.
Today uiFlvHost logged as 192.168.1.38 (port missing in log field — may be rewrite/player bug).

Need ONE next named MOB (not a ladder):
1) Why primary returns but Ops shows black (FLV URL / mpegts overlay / Soft Open UI missing)?
2) Exact APPLY name + files. Do not ask operator to thrash BWC ports again unless proof requires it.
```

---

## Agent until APPLY

- Log / paper = OK  
- **No** more WVP picture freestyle  

---

**One line:** Yes Google — broker already `wvp-zlm primary` but screen black; stop step-by-step thrash; paste Google block; optional classic undo if you need Ops now.
