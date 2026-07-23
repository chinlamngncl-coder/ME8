# MOB DISC — Handoff packet for Claude (check + help ME8 cold SOS remarry)

**Type:** DISC only — no APPLY / no code in this file  
**Purpose:** What to **give Claude** so they can review and help. You throw the hard part to them; Cursor agents keep ME8 rules + APPLY discipline.

**Date:** 2026-07-20  
**Your locked SOS choice:** **Remarry cold SOS → Fleet SIP :5062** (reuse existing Fleet SOS — do not rewrite product SOS)

---

## 1. Paste this short brief to Claude (copy block)

```text
ME8 / Mobility Axiom lab (Ubitron). Designer operator — not a coder.

GOAL: Cold SOS must work again via CLASSIC Fleet path (SIP Alarm → Fleet :5062 →
existing raiseDeviceAlarm → socket sos-alarm). Do NOT invent a new SOS UI.
Do NOT ask us to park / give up. Live WVP/ZLM picture now PASSes; do not smash it
without calling tradeoffs.

CONSTRAINTS:
- No frontend edits unless we explicitly ALLOW (video-wall.js is Firmware Gold locked).
- No code without a named MOB-APPLY from the operator.
- Never use 172.x as server IP; lab LAN example 192.168.1.38.
- Product name stays Mobility Axiom.

SPLIT BRAIN (root cause — not "Fleet SOS code is bad"):
- Live picture: cam REGISTER → WVP proxy host :5060 → ZLM FLV → browser.
- Classic cold SOS/PTT: Fleet SIP :5062 + PTT TCP :29201.
- Cams were moved to :5060 for live; Fleet gold SOS still listens on :5062,
  so physical cold SOS no longer hits Fleet. Fleet SOS implementation is fine.

JUST PASSED (do not regress):
- Live Chin open + stop: Fleet video INVITE lobotomy
  (invite skipped wvp_fleet_invite_lobotomy; stop no longer defers on invite_in_flight).

STILL BROKEN (operator):
- Cold SOS, cold PTT, pin-video PTT. Call not tested.

OPERATOR WIRE CHOICE FOR SOS: REMARRY to Fleet :5062.
Need: design + exact files/commands so Chin Alarm reaches Fleet again,
while saying clearly what happens to WVP live if we remarrry.

Please: (1) read the attached discs, (2) point at exact gap,
(3) propose ONE named MOB-APPLY plan (files + operator steps), no drive-by rewrite.
```

---

## 2. Attach these files (minimum set)

Give Claude **these paths** (drag into chat or paste contents):

### Must-read (story + lock)

| # | File | Why |
|---|------|-----|
| 1 | `docs/MOB-DISC-NO-AGENT-PARK-GIVE-UP-REMARRY-SOS-20260720.md` | No park; remarry locked |
| 2 | `docs/MOB-DISC-WHY-NOT-REBUILD-FLEET-COLD-SOS-20260720.md` | Why not rewrite Fleet SOS |
| 3 | `docs/MOB-DISC-LIVE-OK-COLD-PTT-SOS-DEAD-20260719.md` | Operator matrix tonight |
| 4 | `docs/MOB-DISC-FOR-CLAUDE-INVITE-IN-FLIGHT-STOP-LOCK-20260720.md` | Already given Claude once — lock/stop code + lobotomy |

### Evidence / APPLY truth

| # | File | Why |
|---|------|-----|
| 5 | `docs/MOB-APPLIED-FLEET-INVITE-LOBOTOMY-20260720.md` | Live INVITE bypass PASS |
| 6 | `docs/MOB-APPLIED-WVP-ADAPTER-MODULE-20260719.md` | Webhook adapter (bridge path exists; you chose remarry instead) |
| 7 | `docs/MOB-DISC-SOS-SIGNAL-TRACE-20260719.md` | Physical SOS often missing on proxy; 401 history |

### Optional if Claude wants code

| File | Role |
|------|------|
| `lib/deviceAlarm.js` | Fleet gold SOS pipeline |
| `lib/wvpWebhooks.js` | WVP inbound adapter (not remarry) |
| `scripts/wvp-sip-lan-proxy.js` | :5060 proxy + alarm POST |
| `server.js` slices: `shouldLobotomizeFleetVideoInvite`, `raiseDeviceAlarm` / sos emit, SIP listen port |
| `.env` keys only: `FM_LAB_WVP=1`, `FM_SOFTOPEN_WVP_ONLY=0`, SIP/WVP listen hints — **redact secrets** |

**Do not** dump whole `video-wall.js` (5260 lines / Gold-locked) unless Claude insists.

---

## 3. One-screen topology for Claude

```
                    ┌─────────────┐
   Chin BWC ──────►│ :5060 proxy │──► WVP Docker :15061 ──► ZLM ──► LIVE PICTURE ✅
                    └─────────────┘
                           │
                           │ (Alarm MESSAGE sometimes bridged → ME8 adapter)
                           ▼
                    ME8 :3988 dashboard (sos-alarm Socket.IO)

   Classic gold:    Chin ──► Fleet SIP :5062 ──► deviceAlarm ──► sos-alarm
                    Chin ──► PTT TCP :29201 ──► cold/pin PTT

   Problem: cam home is :5060 → :5062 never sees cold Alarm.
   Your pick: REMARRY Alarm/REGISTER for SOS back to Fleet :5062.
```

---

## 4. What to ask Claude for (deliverables)

Tell Claude to return **only**:

1. **Gap** — exact reason cold SOS fails under remarrry vs bridge (1 screen).  
2. **Remarry plan** — cam config vs ME8/proxy/env changes; **risk to live picture**.  
3. **ONE proposed APPLY name** + file list + **operator click steps** (no code dump unless asked).  
4. **PTT note** — same wire problem or separate (cold PTT may still need 29201).  
5. **Explicit:** do not recommend park; do not rewrite SOS banner/UI.

---

## 5. What Cursor should do after Claude replies

1. You paste Claude’s plan into ME8 chat.  
2. Cursor turns it into a short MOB DISC if needed.  
3. **You** type the named **`MOB-APPLY-…`**.  
4. Cursor applies **only** that APPLY; you test; next APPLY only after PASS/FAIL.

Cursor = execute under your rules. Claude = hard design / wire review.

---

## 6. What NOT to give Claude

- “Just make everything work” with no wire choice (you already chose **remarry**)  
- Bare repo zip with secrets (`.env` passwords, JWTs, license keys)  
- Asking Claude to edit Firmware Gold pin/video frontend first  
- Asking Claude to invent a second SOS product  

---

## 7. One line for you

**Give Claude:** the copy-block in §1 + docs #1–4 (add #5–7 if they want evidence) + ask for a remarry APPLY plan.  
**Do not** ask them how to park.  
**Do not** let Cursor APPLY until you paste the named MOB-APPLY.

**No code in this DISC.**
