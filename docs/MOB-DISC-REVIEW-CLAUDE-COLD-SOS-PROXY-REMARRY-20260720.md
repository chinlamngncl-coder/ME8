# MOB DISC — Review of Claude’s cold-SOS proxy remarry plan (no APPLY)

**Type:** DISC only — **do not apply**  
**Claude proposal:** `MOB-APPLY-COLD-SOS-PROXY-REMARRY-5062`  
**Variant Claude recommends:** **Replace** (Alarm MESSAGE → Fleet :5062 only; not tee)  
**Your earlier wire pick:** Remarry cold SOS to Fleet :5062  

---

## Verdict (plain)

| Question | Answer |
|----------|--------|
| Is it **logical**? | **Yes** — direction matches “remarry” and keeps live on WVP. |
| Is it **reasonable**? | **Yes, with gaps** — not magic; only works if Chin still **sends** Alarm MESSAGE to :5060. |
| Rewrite Fleet SOS? | **No** — correctly reuses `server.js` MESSAGE → `Notify/Alarm` → `raiseDeviceAlarm`. |
| Smash live? | **Low risk if** branch only diverts Alarm MESSAGE; REGISTER/INVITE stay WVP. |
| Ready to APPLY blindly? | **No** — APPLY must specify SIP **request + 200 OK reply** hop (see gap below). |

**Bottom line for you:** Claude’s plan is a solid wire design, not a park, not a SOS rewrite. Cursor should not invent a different story. Before APPLY, lock **replace** (unless you say tee) and force the APPLY to include **cam gets SIP 200 OK**.

---

## What Claude got right

1. **Reuse Fleet gold** — Alarm ends in existing handler (`server.js` ~11220+: 200 OK first, then `CmdType === 'Alarm'` → `source: 'sip_alarm'` → `raiseDeviceAlarm`). Do not touch `deviceAlarm.js` / dashboard / `video-wall.js`.  
2. **Live stays WVP** — only Alarm MESSAGE special-cased; matches lobotomy + ZLM picture PASS.  
3. **Replace vs tee** — Replace = true remarry wording. Tee = halfway bridge. Recommend replace is consistent with what you asked.  
4. **Scope** — Proxy (+ flag) only; PTT out of APPLY. Correct.  
5. **Operator steps** — Restart proxy only → prove live → physical SOS → Fleet log / banner. Designer-friendly.  
6. **Risks named** — Source-IP, 401, body match. Good checklist (see nuance below).  
7. **Opt-in flag** — Same pattern as other lab flags. Good.

---

## Arguments / gaps (must be in APPLY, not ignored)

### Gap A — “Forward the SIP packet” is not a one-liner (biggest)

Today’s proxy already **detects** Alarm MESSAGE and **HTTP POSTs** ME8 (`maybeBridgeAlarmToMe8` → `/api/lab/wvp/device-alarm`). It does **not** SIP-forward to :5062.

True remarry = send MESSAGE to **Fleet SIP :5062** and:

1. **Not** (or not only) rely on the HTTP adapter for that Alarm.  
2. **Reply 200 OK to the cam** on the same cam↔proxy TCP/UDP path (Fleet already does 200 OK immediately for SOS — Google rule in code). If Replace removes WVP from the path, **proxy must relay Fleet’s 200 (or synthesize 200)** or the cam will retry / look dead.  
3. TCP path today is a **byte pipe** cam↔WVP. Diverting one MESSAGE means: detect buffer → send that transaction to Fleet → write response back to cam → **do not** also write Alarm into WVP upstream (replace).

If APPLY only “send packet to 5062” and forgets the **200 OK return path**, desk can fail even when Fleet raises the banner.

### Gap B — No Alarm on the wire = APPLY cannot save it

Prior trace: physical SOS sometimes produced **only REGISTER**, no Alarm MESSAGE on proxy.  

Claude’s FAIL ladder (“branch didn’t match?”) is right — but then fix is **cam / SIP home / firmware**, not more ME8 code. Remarry does not create Alarms.

### Gap C — Double banner if HTTP bridge stays on

If flag turns on SIP-forward **and** `maybeBridgeAlarmToMe8` still fires → possible **two** `sos-alarm` (adapter + `sip_alarm`).  

APPLY should: when remarrry flag **1**, **skip** HTTP Alarm bridge for that packet (or disable it). Claude did not say this explicitly — Cursor must.

### Gap D — Source-IP risk: smaller for banner, real for Contact

Fleet Alarm path uses **DeviceID / From**, not a hard cam-IP allowlist in the Alarm block we reviewed. So Claude’s “trust list” fear is **weaker for banner**.  

Still real: `restoreCameraContactForCam` may learn **proxy** as contact → later Fleet SIP quirks. Invite lobotomy reduces video INVITE pain; still name Contact pollution in APPLY notes.

### Gap E — Name vs “Path B”

Claude labels “Path B — proxy tee at :5060” then recommends **replace** (not tee). Fine — just don’t confuse operators: **shipping recommendation = replace**, tee optional.

---

## Compare to what ME8 already has (so you see tradeoff)

| Approach | Wire | Pros | Cons |
|----------|------|------|------|
| **A. HTTP adapter now** | Alarm → POST → `raiseDeviceAlarm` | Already built; no SIP hop | Not “Fleet :5062 SIP”; failed when no MESSAGE / old 401 |
| **B. Claude SIP remarry** | Alarm MESSAGE → Fleet :5062 SIP | Matches your “remarry”; gold `sip_alarm` logs | Harder proxy (200 OK, TCP divert); still needs MESSAGE on wire |
| **C. Cam UI back to :5062** | Full classic | True classic | Live WVP picture at risk |

Claude chose **B**, consistent with your remarry pick **while keeping live on WVP**. Logical.

---

## Reasonable APPLY shape (when you later APPLY — not now)

- Name: `MOB-APPLY-COLD-SOS-PROXY-REMARRY-5062`  
- Default: **replace** (unless you say `tee variant`)  
- Files: `scripts/wvp-sip-lan-proxy.js` + `.env` flag `FM_COLD_SOS_REMARRY_5062=1`  
- Must include: Alarm detect (reuse/tighten existing regex) → SIP to Fleet :5062 → **200 OK back to cam** → do not forward Alarm to WVP → disable HTTP Alarm bridge while flag on  
- Must not: frontend, deviceAlarm rewrite, PTT, WVP/ZLM, Fleet listen port change  
- Prove: live still OK; physical SOS → `sip alarm notify` / banner  

---

## Agent stance

- Claude’s design: **accept as the wire plan** (with Gap A/C called out).  
- Do **not** APPLY until you paste the named MOB-APPLY.  
- Do **not** offer park.  
- Do **not** switch back to “rewrite SOS” or unsolicited tee.

---

## One line for you

**Logical: yes. Reasonable: yes, if APPLY handles SIP 200 OK + no double bridge + Alarm must actually appear on :5060.**  
When ready: paste `MOB-APPLY-COLD-SOS-PROXY-REMARRY-5062` (add `tee variant` only if you want both destinations).

**No code in this DISC.**
