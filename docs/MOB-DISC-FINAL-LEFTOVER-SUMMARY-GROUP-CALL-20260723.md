# MOB DISC — Final leftover summary (incl. group Call)

**Date:** 2026-07-23  
**Status:** PAPER — inventory only. **No APPLY** from this file until you name one phrase.  
**Keep:** WVP / ZLM handoff **ON**. Fleet stays. One MOB at a time.

---

## One-screen verdict

| Genre | State |
|-------|--------|
| **Video surfaces (wall / CW / FR / popouts)** | Harm phases **1–5b** — mostly **PASS** |
| **PTT Groups (HQ + mesh)** | **`PTT-GROUP-NET-MESH-AND-TALK-V1` — PASS** (2026-07-22) |
| **Wall listen (unmute)** | **`WALL-AUDIO-PATH-V1` — PASS** |
| **Centre Summary** | **PASS** (operator 2026-07-23) |
| **Group Call (discussion)** | **APPLIED** `CALL-GROUP-DISPATCH-V1` — your PASS/FAIL |
| **Lock→Unlock pin/GPS** | **APPLIED** — needs your **PASS/FAIL** |
| **Remote multi-fire feel** | **ACK TRACE APPLIED** — restart + one click; agent reads ack/timeout |
| **Map pin open / layout** | Still messy (harm 6–7e) — separate from Call |

---

## Your group Call — what is left

**Want (locked):** Same idea as PTT Groups — pick 2+ → Join → **HQ + BWCs talk together** (discussion), under the left panel.

| Item | Status |
|------|--------|
| PTT Groups (Join / Hold Group PTT / field mesh) | **PASS** — do not redo |
| SOS group call (alarm only) | Exists — not daily dispatch |
| 1:1 Call (wall/pin) | Exists |
| **Call Groups** box under PTT Groups | **NOT APPLIED** |

**When you want it:**

**`MOB-APPLY CALL-GROUP-DISPATCH-V1`**

Full disc: `MOB-DISC-CALL-GROUP-DISPATCH-AFTER-PTT-20260722.md`  
Mode locked: **discussion first** (reuse `sipGroupCall.js`). Not LiveKit. Not a new voice stack.

Optional later (only if still needed after Call Groups PASS): `CALL-GROUP-BROADCAST-V1` (HQ → all, field mics down).

---

## Leftover MOB queue (recommended order)

Do **one** at a time. Agent pick for “what next” if you only care about voice/group:

### A — Voice / group (your “group call to do”)

| # | Phrase | Why |
|---|--------|-----|
| **1** | `MOB-APPLY CALL-GROUP-DISPATCH-V1` | **Default next for group Call** — disc ready |
| 2 | `CALL-GROUP-BROADCAST-V1` | Only if discussion PASS and you still want broadcast mode |
| later | `CONFERENCE-BWC-INGRESS-WVP-HANDOFF-V1` | LiveKit / VC “let BWC into room” — **different** product from Call Groups |
| later | `PTT-29201-WVP-HOMED-V1` | Soft PTT / Call reliability if 1:1 Call flakes under WVP-home |

### B — Safety / remote feel (if still scary)

| # | Phrase | Why |
|---|--------|-----|
| 1 | Confirm GPS APPLY | Restart → Lock→Unlock → pin back? **PASS/FAIL** |
| 2 | `MOB-APPLY DEVICE-CONTROL-SIP-ACK-TRACE-V1` | Prove wire: 1 MESSAGE vs retransmits (Snapshot/Record multi-feel) |
| — | **No** Snapshot debounce APPLY | Log still shows **1×** `device control sent` |

Disc: `MOB-DISC-REMOTE-ONE-CLICK-MULTI-FIRE-LOG-20260723.md`

### C — Map pin (if still broken for you)

| # | Phrase | Why |
|---|--------|-----|
| next pin | `PIN-CLICK-POPUP-OPEN-NO-DOCK-STORM-V1` | Harm plan **7e** — click→popup; stop storm (when you resume pin genre) |

Do **not** mix pin MOBs into Call Groups APPLY.

### D — Ops only (no code until FAIL)

| Item | Action |
|------|--------|
| FR Verify / matching | Your UI check — `MOB-DISC-FR-VERIFY-OPS-CHECK-WHERE-20260723.md` |
| Arrow encoding | **APPLIED** — Ctrl+F5; PASS if → looks clean |

### E — Polish / later

| Item | Notes |
|------|--------|
| Panel sizing / polish | Harm phase 13 |
| Full `index.html` mojibake sweep | Separate from map-toolbar arrow MOB |
| Gate B ZLM latency | **PARKED** until you name a latency MOB |

---

## Already done (do not re-open unless regress)

- FLV wall lifecycle, Command Wall, FR live watch, panel/matrix popouts (harm 1–5b)  
- `PTT-GROUP-NET-MESH-AND-TALK-V1`  
- `WALL-AUDIO-PATH-V1`  
- Centre Summary await-audit (operator PASS)  
- `WVP-PRESENCE-REPLAY-GPS-ON-ONLINE-V1` (code in — **your** Lock→Unlock check)  
- `MAP-TOOLBAR-ARROW-ENCODING-V1`  
- SOS ledger scope — **PASS** (no nag)

---

## Agent must not

- Park WVP / turn handoff off to “fix” Call or remotes  
- Bundle Call Groups + pin + Snapshot in one APPLY  
- Treat LiveKit conference as the same MOB as Call Groups  
- Ask you to pick A/B when the Call disc already locked **discussion first**

---

## Default recommendation (tonight / next session)

1. **If group Call is the priority:** say **`MOB-APPLY CALL-GROUP-DISPATCH-V1`**.  
2. **If remotes still scare you first:** say **`MOB-APPLY DEVICE-CONTROL-SIP-ACK-TRACE-V1`**.  
3. **If pin after Lock is still FAIL:** say GPS FAIL (we re-diagnose) — code already applied once.

Pointers:  
- Remaining Centre/FR/GPS/Snapshot: `MOB-DISC-REMAINING-CENTRE-FR-LOCK-GPS-SNAPSHOT-20260722.md`  
- Harm master list: `MOB-DISC-WVP-HARM-100-CONSOLIDATION-FIX-PLAN-20260720.md`
