# MOB DISC — Will FR alert mix up with Live · SOS · PTT?

**Status:** DISC 2026-07-11 — plain answer to operator question  
**Question:** “Risk? Will it be mixed up with live and SOS? PTT?”  
**Related:** `MOB-DISC-FR-STABILITY-GUARD.md`, `MOB-DISC-FR-WHAT-TO-DO-NOW.md`

---

## Short answer

| System | Mixed up in **code**? | Mixed up for **operator eyes**? |
|--------|----------------------|----------------------------------|
| **Live command wall** | **No** — different files, different screen | **No** — wall unchanged |
| **SOS** | **No** — different events, different banner | **Maybe** — two red strips if both happen at once |
| **PTT hold-to-talk** | **No** — map/wall PTT not rewired | **Maybe** — FR has its own PTT **buttons** (Standby team, Field alert) |

**Today’s drawer shells (Act 1):** layout only · **no new live streams** · **no SOS wiring** · lab preview **cannot** push real PTT/field.

---

## What is separate (will NOT get tangled in code)

```text
SOS pipeline          → sos banner, sos incidents, sos invite queue
Command wall live     → video-wall.js, fleet-ui.js  (LOCKED — not edited)
Map PTT hold-to-talk  → pttServer / sipServer core (LOCKED — not edited)

Face match alert      → fr-alarm.js only
  · socket: fr-blacklist-hit, fr-alarm-ack, fr-alarm-dismiss
  · socket: fr-field-alert  (NOT sos-*)
  · API:    /api/analytics/fr/ptt-standby-team  (NOT sos PTT team)
```

Different **names on the wire** = they do not share one alarm handler. FR did not replace SOS code.

---

## What shares something (honest)

### 1) Server **live stream pool** (8 cameras max)

| Uses pool | Where |
|-----------|--------|
| Command wall / map live | `video-wall.js`, `fleet-ui.js` |
| FR 6-tile watch | `fr-live-watch.js` |

**Shared:** total ffmpeg decodes on server (cap 8).  
**Not shared:** player UI — wall tiles ≠ FR tiles.

**Risk:** If wall has 6 live + FR starts 6 watch → can hit cap. **This existed before drawer MOBs.** Drawer shell does **not** add a 7th stream yet (video area is placeholder).

**Later (Act 3):** rail/drawer live video could add 1 more stream — we flagged cap 7/8 in design docs. **Not built yet.**

---

### 2) PTT **hardware path** (same radios, different buttons)

| Button | What it does | Same as SOS? |
|--------|----------------|--------------|
| **Hold PTT on map/wall** | Normal talk | No — unchanged |
| **SOS response PTT** | SOS workflow | No — separate |
| **FR → Alert field** | Beeps/message to **one** BWC (`fr-field-alert`) | No — FR-only, you must click |
| **FR → Standby PTT team** | Groups nearby BWCs for FR hit (`ptt-standby-team` API) | No — FR-only, you must click |

**Code mix-up risk:** **Low** — only runs when operator clicks FR drawer/HQ buttons.  
**Operator mix-up risk:** **Medium** — three different “red alert + PTT” stories; labels matter.

**Lab “Preview alert”:** Ack/Dismiss only · Field + Standby PTT **blocked** (toast: not a real match).

---

### 3) Red UI at the same time (eyes, not code)

| UI | Position | Label |
|----|----------|--------|
| **SOS banner** | In page flow | SOS / fall text |
| **FR HQ strip** | Top fixed bar | **“FR hit”** + name · cam · % |
| **FR drawer** | Bottom-right | Face match alert panel |

**Both SOS and FR can show red at once** if both events happen — they do **not** cancel each other. That is **visual clutter**, not one system triggering the other.

**Mitigation (already):** FR bar says **FR hit**, not SOS. Drawer title: **Face match alert**.

---

## What today’s MOBs did NOT do

| Fear | Truth |
|------|--------|
| FR drawer steals wall video | **No** — placeholder only |
| FR replaces SOS banner | **No** |
| FR auto-pushes PTT on hit | **No** — click only |
| Preview alert calls real PTT | **No** — guarded |
| Edited `video-wall.js` / `pttServer.js` | **No** |

---

## Risk tier summary

| MOB applied | Tier | Live / SOS / PTT mix-up |
|-------------|------|-------------------------|
| `mob-fr-rail-alert-shell` | 2 (FR UX swap) | Code: **no**. Eyes: FR bar vs SOS bar. |
| `mob-fr-alert-drawer-shell` | 1 (layout) | Code: **no**. Lab preview safe. |

---

## When risk goes up (future — not now)

| Future MOB | Watch for |
|------------|-----------|
| `mob-fr-rail-snap-to-live` | +1 live stream — pool cap |
| `mob-fr-alert-drawer-live` | Real video in drawer — same cam reuse rules |
| `mob-fr-probe-queue-32` | More server CPU/snaps — not SOS |

Agent will **DISC + ask** before those.

---

## What you should do

| If you want… | Do this |
|--------------|---------|
| Peace of mind, no FR test | **Nothing** — core fleet unchanged |
| See drawer layout only | Hard refresh → Face recognition → **Preview alert (lab)** → Ack |
| Worry about SOS + FR both red | Normal — two separate systems; train: **FR hit** vs **SOS** labels |
| Something actually broke on wall/PTT/SOS | **`FAIL`** + RESTORE baseline — not an FR patch |

---

## Bottom line

> **Will it mix up with live, SOS, PTT?**

- **In code:** **No** for Act 1 shells — separate files, separate socket names, no locked-file edits.  
- **On screen:** Two red alerts **can** show together (FR + SOS) — different labels, operator learns which is which.  
- **PTT:** Normal talk unchanged; FR only uses PTT when **you click** Field or Standby — preview cannot.  
- **Live wall:** **Untouched.**

**Safe to leave SKIP checkpoint** until you want a 2-minute lab preview. No obligation to test SOS or wall for this MOB.
