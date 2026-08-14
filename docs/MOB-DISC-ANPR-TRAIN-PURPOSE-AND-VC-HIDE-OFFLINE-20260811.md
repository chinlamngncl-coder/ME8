# MOB DISC — ANPR train = better Stage 2 (not Stage-1-only) + VC hide offline — 2026-08-11

**Status:** PAPER. No code this turn.  
**Read:** `.cursorrules`

---

## 1) ANPR — “we replaced CCPD with ph_id — then what? Only Stage 1? Why train?”

### Plain truth

You do **not** fall back to “Stage 1 only.”

| Stage | Job | After train |
|-------|-----|-------------|
| **1** | Find **vehicle** → crop | Unchanged |
| **2** | Find **plate inside** that crop | **Should be better** with `ph_id_plates_best.pt` |
| **OCR** | Read characters on plate crop | Still FastALPR (live) |

**Train is not overlapping Stage 1.** It upgrades **Stage 2 only** (plate box quality on your plates / motion). Stage 1 still required. OCR still required.

Wrong outcome we hit: new Stage 2 **unstable** (sidecar flap / Engine Not available) → **zero captures**. That is a **load/reliability** fail, not “training means drop cascade.”

### Correct product intent (locked)

```text
Vehicle (1) → Plate YOLO ph_id (2) → OCR FastALPR
```

- **Better** = fewer missed / better crops into OCR.  
- **Not** = delete Stage 1.  
- **Not** = run CCPD and ph_id at the same time forever (overlap).  
- **Safe** = if ph_id weights fail to load → temporary CCPD so desk still works → fix load → ph_id champion again.

So: train was right; **ship path must not crash**. Fallback is a **seatbelt**, not the long-term design.

### One next APPLY (when you want code)

`ANPR-STAGE2-SAFE-FALLBACK-V1` — keep ph_id as champion; CCPD only if ph_id cannot load; never take sidecar down.

---

## 2) VC — if Offline, show them in “Who can join” / roster?

### Recommendation: **No — do not show Offline in the live join surfaces**

| List | Show |
|------|------|
| Host Tools BWC dropdown | **Online only** (already intended) |
| Left roster “Chin · Offline” | **Hide offline** — only online (or in-room) |
| Right personnel group list | **Online only** for join/add context; optional “Show offline” later if you need admin roll-call |
| Who can join (dashboard users) | Invite list ≠ BWC online — separate; no fake Online dots (already fixed) |

**Why:** Offline rows confuse “who can I add now.” Roll-call of all assigned officers belongs in Settings / groups, not Live Host Tools.

### APPLY when you want it

`VC-HIDE-OFFLINE-ROSTER-V1` — Live roster + personnel on VC Live = online (or already in room) only.

---

## One clear next step

Pick order:

1. Stabilize ANPR first: `MOB-APPLY ANPR-STAGE2-SAFE-FALLBACK-V1`  
2. Then VC list: `MOB-APPLY VC-HIDE-OFFLINE-ROSTER-V1`
