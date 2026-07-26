# MOB DISC — User Circle: batch open 8–10 pin videos (ops time-saver)

**Date:** 2026-07-24  
**Status:** PAPER ONLY — no APPLY · no code  
**Phrase (when ready):** `MOB-APPLY USER-CIRCLE-BATCH-OPEN-V1` (name may refine after PASS on Tactical Turf)  
**Operator ask:** Can we call 8–10 pins in one shot so a “user circle” of videos pops up instantly? Popular in operations. Tactical? Or add into Tactical?

---

## Verdict (one line)

**Yes — we can, and we already do most of it at 8.** The missing piece is a first-class **User Circle** (named / incident roster), not a new video engine. Cap at **8 for V1**; treat **10 as later** only if wall slots grow.

---

## What already exists (do not reinvent)

| Piece | Today |
|-------|--------|
| Wall capacity | **8** panels (Bank A 5 + Bank B) |
| Fleet select | Multi-select up to **`MAX_PIN_SELECT = 8`** |
| One-shot open | Ops button **Open All (Up to 8)** → `openAllSelectedPins` → `openAllLivePins` |
| Pin popups | **`MAX_OPEN_PIN_POPUPS = 8`** + dock layout |
| WVP storm control | Staggered `startPlay` (`OPEN_ALL_DEVICE_STAGGER_MS` + handoff gate) so Open All does not melt Invite |

So “show 8 videos at one shot” is **already productized** on Ops. Operators who multi-select then hit Open All are already doing a manual circle.

---

## What the operator is really asking for

Not “can WVP paint eight tiles?” — that works.

They want **ops muscle memory**:

1. Define a **circle of people** (team / shift / incident roster) once.  
2. One control → **all their pin videos + wall tiles come up together**.  
3. Saves the click-storm of opening pins one by one under pressure.

That is a **roster + one-shot open** feature. Video path stays the existing Open All / WVP handoff / pin mirror stack (Firmware Gold + handoff locks).

---

## 8 vs 10

| Cap | Feasibility | Why |
|-----|-------------|-----|
| **8** | **Ready** | Matches wall, select set, popup dock, Open All. V1 lock. |
| **9–10** | **Not free** | No 9th/10th wall slot without layout change; popup dock + FLV attach load rise; Open All stagger lengthens (“instant” feels slower). |

**Recommendation:** Ship User Circle at **8**. If ops later demand 10, that is a **separate wall-capacity MOB** (e.g. 2×5 or scroll bank), not bundled into Circle V1.

“Instantly” in lab terms = **one operator action**; media still staggers ~300 ms/cam so 8 cams ≈ ~2 s invite pacing — acceptable and safer than a true parallel storm.

---

## Where it should live

### A — Ops (primary for V1) — **recommended**

Enhance what operators already use:

- Keep **Open All (Up to 8)** as the engine.  
- Add **User Circles**: named lists of up to 8 device IDs (localStorage or Server Config later).  
- UI: Circle picker → **Open Circle** (same path as Open All).  
- Optional: “Save current selection as Circle”.

**Why first:** Zero new map product; reuses Fleet list + wall; immediate ops time-save; does not wait on Turf.

### B — Tactical (natural Phase-2 plug) — **yes, later**

Locked Tactical Module 1 already says: zone **entry** → `startPlay` + PTT gtid 49 per device.

Upgrade concept: **Incident Circle**

- Devices currently **inside** the active zone (or tagged to Incident ID) = the circle.  
- Button **Open Incident Circle** → same `openAllLivePins` (cap 8).  
- Auto on entry can stay one-by-one; **manual circle open** is the burst time-saver when the IC wants everyone on wall now.

**Do not** put Circle V1 only on Tactical and leave Ops without it — daily dispatch lives on Ops.

### C — Map-drawn “geo circle” selection — **park behind A**

Draw a radius on Ops/Tactical map → select all GPS-inside devices → Open All. Powerful, but needs stable GPS + draw UX. After named Circle + Open All reuse.

---

## Risk (internal) → one path

| Risk | Mitigation |
|------|------------|
| Second video path / new player | **Forbidden** — call existing `openAllLivePins` / handoff only |
| Pin storm / dock storm | Reuse Open All stagger + current dock; no fan-open invent |
| Firmware Gold pin cores | Touch only through named APPLY; prefer fleet-ui + thin wall API |
| Bundle with Turf entry/exit | **No** — Circle V1 on Ops first; Tactical plug is a later MOB |
| Cap creep to 10 in same MOB | **No** — 8 locked |

**Single recommendation:** Paper this → after current video/Tactical shell stability, apply **`USER-CIRCLE-BATCH-OPEN-V1` on Ops** (named circles + Open Circle = Open All). Then **`TACTICAL-INCIDENT-CIRCLE-OPEN-V1`** plugs the same helper when Turf entry/exit is live.

---

## Suggested MOB order (when you order APPLY)

```
1) USER-CIRCLE-BATCH-OPEN-V1     ← Ops: named circle ≤8 → openAllLivePins
2) TACTICAL-TURF-ENTRY-EXIT-V1   ← already planned (per-device entry)
3) TACTICAL-INCIDENT-CIRCLE-OPEN-V1  ← Open all in-zone (≤8) one shot
```

Optional later: `WALL-CAPACITY-10-V1` only if ops insists on 10.

---

## Out of scope for this disc

- Raising wall to 10 panels  
- New FLV player or VC meeting grid  
- Auto-open everyone on every GPS ping (that stays Turf entry policy)  
- Replacing Command Wall schemes  

---

## Operator next step

This is **paper only**. If the concept matches what you meant:

1. Say **CIRCLE DISC OK** (or what to change: Ops-only / Tactical-only / want 10 anyway).  
2. When ready to build: **`MOB-APPLY USER-CIRCLE-BATCH-OPEN-V1`**.

No code until that APPLY.
