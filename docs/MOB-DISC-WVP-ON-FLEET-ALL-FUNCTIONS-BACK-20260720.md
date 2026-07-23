# MOB-DISC — Can all Fleet functions come back with WVP on top?

**Date:** 2026-07-20 ~16:12  
**Status:** DISC only — **no code, no restore**  
**Operator ask:** Finish major job first (pin, panel, SOS, live, PTT, grouping, call). Defer 16×9. Stop patch loops. Confirm everything can be normal with WVP on Fleet.

---

## Short answer (confirm)

**Yes — that is the locked product design.**  
WVP on Fleet is **not** “replace Fleet.” It is **three pipes**:

| Pipe | Owner | UI |
|------|-------|-----|
| SOS / status / GPS | WVP Alarm + ACL → **classic Socket.IO** | Frozen classic handlers |
| **Live video** | WVP/ZLM handoff → FLV | Classic wall + pin (small allowed lifts) |
| **PTT / Call / grouping** | Fleet **:29201** + Fleet SIP MESSAGE | **Unchanged** classic sockets |

All Ops functions **can** be back on one dashboard. They are **not** all back **today**. What remains is a **finite checklist**, not an infinite patch spiral — **if** we stay on this architecture and do not re-lobotomize Fleet voice or re-restore the whole tree.

**16×9 panel polish:** cosmetic. **Parked** until live + pin + voice matrix PASS. Does not block WVP correctness.

---

## What “normal” means (honest matrix)

| Function | Designed to work with WVP+Fleet? | Today (lab) | Blocker type |
|----------|----------------------------------|-------------|--------------|
| Cold SOS (Alarm on :5060) | **Yes** | **PASS** (prior) | — |
| Live wall picture | **Yes** | **PASS** (audio-drop) | Done |
| Live map pin | **Yes** | **APPLIED** — needs your test | Pin mirror from wall `<video>` (`MOB-APPLY-WVP-HANDOFF-PIN-MIRROR-FROM-VIDEO-V1`) |
| Panel 5 poll duplicate | **Yes** (classic) | Works — confusing, not broken | Auto-rotate + one live cam |
| Panel 16×9 / sizing | **Yes** (classic CSS) | **Deferred** | Jul 19 MOBs not re-applied — **not WVP** |
| Soft PTT hold | **Yes** (29201) | **FAIL** | Cam never TCP-login after group MESSAGE (WVP-homed SIP) |
| PTT grouping / fleet row | **Yes** (29201) | **FAIL** | Same as PTT |
| SOS group / dispatch PTT team | **Yes** (29201 fan-out) | **Untested / likely FAIL** | Same root as PTT |
| BWC Call | **Yes** (Fleet path) | **FAIL / parked** | Same contact + 29201 family |
| Open All / FR / evidence | **Yes** (classic) | Not re-tested this arc | After live+voice stable |

**Half-pass wall without pin was a known gap, not “we lost Fleet.”**  
**PTT dead while video works is also a known split** — documented in `MOB-DISC-NATIVE-29201-RESTORED-STILL-DEAD-20260720.md`.

---

## Why it felt like “patch and die”

Three separate things got mixed:

### 1 — Jul 20 classic restore (UI floor)

Restored **Jul 18** snapshot → dropped **Jul 19 panel CSS** (16×9, 348px rail).  
**Not caused by WVP.** Re-apply later as one named MOB on **this** tree — **not** another full restore.

### 2 — Video needed frontend micro-lifts (plan drift, but necessary)

Original EXECUTE said “frontend frozen.” Reality: classic player expected JSMpeg/WS; WVP handoff is FLV/mpegts. Required **bounded** lifts:

- FLV on `video-stream-ready`
- Proxy + token
- Dedupe + `hasAudio:false`
- Pin mirror from `<video>`

That is **one video stack**, not endless UI churn. **Stop adding video MOBs** once wall + pin PASS.

### 3 — Voice is a different marriage (not more video patches)

PTT/Call **never** go through WVP audio (ARCH cancel locked).  
Blocker: cam SIP-homes **WVP :5060**; Fleet sends group MESSAGE but cam **does not open :29201**.  
Fix = **Fleet contact / register / MESSAGE path** MOB — **not** another FLV/proxy MOB.

---

## End state (what “done” looks like)

```
SOS/status     WVP :5060 Alarm  →  ACL  →  classic sos-alarm / device-status     ✅
Live           start-video      →  handoff FLV  →  wall + pin mirror               ⏳ pin test
PTT/Call/group Fleet sockets    →  gtid+29201 MESSAGE  →  TCP HDA login  →  talk   ❌ contact MOB
Panel polish   classic CSS only — no WVP                                                     ⏸ parked
```

When all three rows PASS, Ops is **normal** with WVP under Fleet. No second product UI.

---

## What we will NOT do (anti–patch-death)

| Forbidden | Why |
|-----------|-----|
| Re-route PTT/Call through WVP broadcast / VoiceAdapter | Wrong SDK path; already cancelled |
| Full `RESTORE-CLASSIC-PASS` to “fix panel” | Wipes WVP handoff work |
| Open-ended “small obvious” video tweaks | Video stack closes at wall+pin PASS |
| Bundle SOS + live + PTT in one MOB | One named APPLY at a time |
| 16×9 before voice matrix | You said defer — agreed |

---

## Remaining work (finite list — major job only)

| # | MOB (when you say APPLY) | Closes |
|---|--------------------------|--------|
| 1 | **Pin mirror** (done — you test) | Pin live |
| 2 | **`MOB-APPLY-FLEET-PTT-CONTACT-WVP-HOMED-V1`** (or your name) | PTT + grouping + SOS team talk |
| 3 | **Call verify** on same contact fix | Call |
| 4 | Re-test SOS + Open All once live+voice PASS | Regression matrix |
| **Later** | `MOB-APPLY-REAPPLY-PANEL-16x9-FIT-FIVE-V1` | Cosmetics only |

No item 5–20 for video unless pin test **fails** — then one diagnose MOB, not a chain.

---

## Confirm (plain)

- **Putting WVP on Fleet should not permanently kill pin, SOS, PTT, grouping, or call.** Correct. Design says they all return.
- **They are not all back yet.** Correct. Video mostly there; voice blocked on **register/contact**, not on missing UI.
- **16×9 later.** Agreed. Not part of major job.
- **This is not meant to be patch forever.** Agreed — **if** we close video (pin test), then **one** voice/contact arc, then matrix re-test. Panel polish last.

**One line:** WVP+Fleet = classic Ops with WVP only for **video + Alarm SOS**; everything else stays Fleet; today’s gap is **pin test + 29201 contact**, not “we threw away the product.”
