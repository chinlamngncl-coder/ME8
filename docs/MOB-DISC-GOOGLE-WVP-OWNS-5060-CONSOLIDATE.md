# MOB DISC — Google: WVP owns SIP 5060 (architecture override)

**Date:** 2026-07-17  
**Status:** Paper only — **discuss** · no APPLY yet  
**Source:** Operator paste — “ARCHITECTURE OVERRIDE: Consolidating SIP — WVP Takes Port 5060”  
**Related prove:** `MOB-APPLIED-WVP-INVITE-RTP-ANSWER-V1.md` (INVITE reaches cam · cam does not answer WVP while Fleet still owns 5060)  
**Old lock this would replace:** `MOB-DISC-NO-DICTATE-CHANGE-5060.md` — **only if you APPLY this genre**

---

## Does Google make sense?

**Yes — for Plan A picture.** Tonight proved the split is the trap:

| Split world (what we did) | What happened |
|---------------------------|---------------|
| Fleet = real SIP home on **5060** | Cam answers Fleet · GPS / battery / PTT live here |
| WVP = second home on **5061** + fake mirror register | WVP thinks cam is online · INVITE times out · Soft Open falls to ugly Plan B |

We own the software and the LAN. Keeping two SIP brains was not “safety” — it was **split brain**. Cameras only truly marry **one** SIP server. Mirror tricks cannot fake that marriage.

So Google’s core idea is right: **one SIP owner = WVP on 5060**, Fleet Node stops being the SIP listener, wall play = WVP startPlay → ZLM → native FLV.

The old “never touch 5060” rule was to stop the agent nagging you to re-point BWCs while we tried code-only fixes. **You** are now lifting that for a real architecture change. That is not the agent dictating — that is you ordering a genre.

---

## What Google wants (plain English)

1. **WVP holds 5060** — cameras register only there.  
2. **Fleet Node stops listening SIP** — no more second INVITE home.  
3. **Wall Play** = call WVP play API → take FLV URL → show picture (native size). Retire Plan B for normal wall.  
4. **GPS / SOS / alarms** = WVP pushes events into Fleet by webhook (HTTP in).  
5. **PTT / text / PTZ out** = Fleet calls WVP APIs (HTTP out), WVP talks SIP to the cam.

That is one clean road. It matches why Plan A failed tonight.

---

## What I want to do (one road — not a menu)

**Genre name (when you APPLY):** `mob-wvp-sip-home-5060-v1` (split into smaller APPLYs below).

### Order (one APPLY at a time)

| Step | Named MOB (suggested) | Job |
|------|----------------------|-----|
| A | `mob-wvp-sip-bind-5060-v1` | WVP bind host **5060** UDP/TCP; Fleet SIP listen **off** (or move aside); START scripts / compose; **you** re-point lab BWCs to this PC:5060 as WVP |
| B | `mob-wall-play-wvp-only-v1` | Soft Open / wall = WVP startPlay → FLV only; Plan B off for normal play |
| C | `mob-wvp-webhook-telemetry-v1` | WVP → Fleet HTTP for position / alarm / MESSAGE XML → existing GPS + alarm paths |
| D | `mob-wvp-outbound-ptt-msg-v1` | PTT / text / PTZ via WVP REST, not raw SIP from Node |

No bundling. Prove A (cams online on WVP, startPlay OK) before B.

---

## Google’s battery question (honest)

**Today in ME8:** battery (and some status) is parsed from **SIP MESSAGE / Notify XML** in Fleet (`telemetryFromXml` — MANSCDP-style / vendor Notify fields), **not** only from standard MobilePosition GPS blocks.

So if we cut raw SIP and only take “standard GPS webhooks,” **battery can go dark** unless we also forward **raw MESSAGE / Notify XML** (or a WVP hook that includes that body) into the same parser.

**Answer to paste back to Google:**  
Lab BWCs send battery in **Notify / status XML over SIP MESSAGE** (manufacturer-flavoured MANSCDP), not only MobilePosition. Consolidation must keep MESSAGE→Fleet webhook with XML body, or we lose battery UI.

GPS MobilePosition can ride WVP’s normal position hooks; battery needs the XML path too.

---

## What is hard (not excuses — work list)

| Area | Why it matters |
|------|----------------|
| PTT | Today is Fleet SIP/media path — must be redesigned onto WVP APIs + prove talk still works |
| SOS / ledger | Must still fire from webhook alarms — no silent loss |
| Companion / VC paths | Some telemetry already HTTP — keep; don’t break |
| Plan B | Retire for **normal wall** only after Plan A prove; keep emergency escape behind a flag if you want |
| Ship / pack | Big genre — not a one-hour MOB |

---

## What I will not do until you APPLY

- Disable Fleet 5060  
- Rebind WVP to 5060  
- Tell you BWC setup steps as a lecture before you say APPLY  
- Pretend invite-rtp-answer already won picture  

---

## Sense check (one paragraph)

Google is not wrong. We were wrong to believe mirror + 5061 could give native wall video while Fleet kept the real SIP marriage on 5060. Your override matches the failure we logged. The shift is large (play + GPS + battery XML + PTT), but it is the coherent way to stop rotting on Plan B.

Revert if a step burns: still `RUN RESTORE-ME8-PRE-GATE-C` until this genre has its own baseline.

---

## One line

**Yes — WVP as sole SIP on 5060 makes sense; split 5060/5061 was why INVITE never answered. Say MOB-APPLY for step A when you want code. Battery needs MESSAGE XML webhooks, not GPS-only.**
