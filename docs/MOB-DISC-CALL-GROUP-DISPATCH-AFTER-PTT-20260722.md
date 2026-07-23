# MOB DISC — Call / Broadcast group (same concept as PTT Groups)

**Status:** DISC locked — ready for APPLY when you say the phrase  
**Date:** 2026-07-22 (updated after group PTT PASS)  
**Trigger:** Operator — after PTT Groups: same concept for **Calls** under PTT Groups; SIP engine already exists; group discussion.  
**Keep:** WVP handoff ON. Do **not** invent a new voice stack.  
**Depends:** `PTT-GROUP-NET-MESH-AND-TALK-V1` — **PASS** (operator 2026-07-22).

---

## Plain English — what you want

| Today | Want |
|-------|------|
| **PTT Groups** (PASS) | Pick 2+ → **Join** → **Hold Group PTT** → mesh field |
| **Call** | 1:1 only (wall/pin Call) |
| **SOS group call** | Alarm team only (`sipGroupCall.js`) — not daily dispatch |

**Product:** A **Call Groups** box **right under PTT Groups** — same pick → Join — then HQ + joined BWCs on **one discussion Call**.

Not a new SIP engine. Not LiveKit VC. Reuse Fleet **SIP Call** + **SOS group-call** patterns.

---

## Where it lives (UI)

```
LEFT PANEL
  [ PTT Groups ]     ← PASS (Join / Hold Group PTT / Ungroup)
  [ Call Groups ]    ← NEW box immediately below (same pick language)
       map group / fleet ticks (2+)
       [ Join call group ]  [ End ]
       status: Call group active · N units
```

**Wall / pin Call** stays **1:1** unless Call Group is Joined (then member icon = same net — pick at APPLY).

---

## Mode (agent pick — locked)

| Mode | Meaning | When |
|------|---------|------|
| **B — Discussion** | HQ + joined BWCs talk (full duplex / multi-leg) | **Ship first** — reuse `sipGroupCall.js` |
| **A — Broadcast** | HQ → all; field mics down | Optional later MOB if still needed |

Operator asked for **discussion** → **B first**. No A/B menu at APPLY time.

---

## What we already have (don’t reinvent)

| Asset | Role |
|-------|------|
| `start-bwc-call` / `toggleVoiceCall` | 1:1 Call |
| `lib/sipGroupCall.js` | Multi-BWC SIP (SOS path) |
| SOS end → restore PTT | Teardown lessons |
| PTT Groups UI (2+ pick, Join, Ungroup) | Mirror pick helpers |
| `PTT-GROUP-NET-MESH-AND-TALK-V1` | Group net PASS — do not regress |

---

## Order

| Step | Item | Status |
|------|------|--------|
| 1 | `PTT-GROUP-NET-MESH-AND-TALK-V1` | **PASS** |
| 2 | This DISC | **Locked** |
| 3 | `CALL-GROUP-DISPATCH-V1` | APPLY when named |
| 4 | Optional `CALL-GROUP-BROADCAST-V1` | After B PASS if needed |

---

## Recommended MOB

**Name:** `CALL-GROUP-DISPATCH-V1`

### In scope

1. Left panel **Call Groups** under PTT Groups — same map-group / fleet-tick pick; **Join needs 2+** (match PTT).  
2. **Join call group** → multi-leg SIP to picked cams (`sipGroupCall` dispatch path).  
3. **End** → tear down legs; 1:1 Call + PTT Groups still work.  
4. While active: wall/pin Call on a **joined** cam = same group call (or clear toast if not on net — pick one at APPLY).  
5. Status: **Call group active · HQ + N**.

### Out of scope

- New MCU / LiveKit for this  
- Field↔field without HQ  
- Rewriting 1:1 Call  
- Turning off WVP  
- Bundling VC BWC ingress  
- Changing PTT Groups (already PASS)

### Risk

**Medium–high** — multi-leg SIP + PTT restore after end (learned on SOS). One MOB, one verify.

---

## PASS later

| # | Test | Pass |
|---|------|------|
| 1 | PTT Groups Join + Hold Group PTT still PASS | ☐ |
| 2 | Call Groups under PTT — Chin+kk → Join | ☐ |
| 3 | HQ and both hear each other (discussion) | ☐ |
| 4 | End → 1:1 Call + PTT work | ☐ |
| 5 | 1:1 Call without Join still works | ☐ |

---

## APPLY phrase

**`MOB-APPLY CALL-GROUP-DISPATCH-V1`**

Until then: disc only — no code.
