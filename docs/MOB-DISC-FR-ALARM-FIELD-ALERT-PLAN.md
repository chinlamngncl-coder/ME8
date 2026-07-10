# MOB DISC — FR plan: more snaps · Ack / click protocol · field alert on blacklist

**Status:** DISC locked 2026-07-10 — **plan only, no APPLY**  
**Search:** Snapshot, Ack, dismiss, fr-alarm, blacklist hit, vibrate, MESSAGE, auto Call, rolling  
**Builds on:** `MOB-DISC-FR-ALARM-SOP-NEXT.md`, `MOB-DISC-FR-SNAPSHOT-RAIL-THRESHOLD.md`  
**Cue:** More snaps OK but want denser; Ack does nothing useful; click red alarm / click snap — what should happen?; can BWC vibrate / message / auto-call on catch?

---

## 1) More snapshots — yes, still room

You already feel better capture. That matches **cleaner rail** + whatever soak rate you have now. **`mob-fr-snapshot-rolling` is still pending** — we have not applied the “snapping like crazy” MOB yet.

| Today (typical) | Can go denser |
|-----------------|---------------|
| ~every `FM_FR_POLL_SEC` (default **4s**) → **1** best of 3 grabs | Poll **2s**; and/or emit **each good grab** to rail (not only the window winner) |
| Alarm still deduped (`HIT_DEDUPE_MS` ~45s) | **Keep** — more snaps ≠ more chimes |

**Plan MOB:** `mob-fr-snapshot-rolling` (first FR APPLY in this genre when you say so).

Ceiling: sidecar CPU + live stream load. Start 2s / emit-good-grabs; soak; only then push harder.

---

## 2) Why Ack feels like “nothing”

**Today (code truth):**

| Control | What it does |
|---------|----------------|
| **Ack** | Emit `fr-alarm-ack` (audit) → **close red panel** |
| **Dismiss** | Emit `fr-alarm-dismiss` → close panel |
| Snapshot card click | **Nothing** (not wired) |
| After Ack | No dossier, no live jump, no note, no field notify |

So you are right: Ack is only “I saw it / clear interrupt.” That is **not** an enterprise catch protocol.

---

## 3) Locked operator protocol (what it *should* be)

### A. Snapshot rail (any face crop)

| Click | Protocol |
|-------|----------|
| **Non-match** (normal border) | Open small detail: crop · device · time · **Add to Watchlist** (optional) · Close |
| **Match** (red border) | Same as opening the alarm for that hit (dossier view) |

### B. Red alarm toast / panel (blacklist confirmed)

This is a **triage interrupt**, not the end.

| Action | Meaning (locked) |
|--------|------------------|
| **Ack** | Operator confirms they handled the interrupt — close panel; **keep** red snap on rail; audit “acked” |
| **Open dossier** | Jump Watchlist → that person (grade / notes / photo) |
| **Watch live** | Focus that BWC on FR tile / Ops live if online |
| **False positive** | Close + audit FP — not a real sighting |
| **Alert field** (new) | Notify the **catching BWC** (see §4) — optional confirm |
| **Dismiss** | Close without “confirmed sighting” weight (or merge with FP later) |

### C. After Ack — training one-liner

1. Verify crop vs enrolled photo + score.  
2. Context: which BWC / where.  
3. Decide: real → Ack + dossier / alert field; wrong → False positive.  
4. Continue watch — rail keeps snaps.

---

## 4) Field alert on blacklist catch — vibrate / message / auto-call?

**Product wish (accepted):** when watchlist is caught, tell the **officer wearing that BWC** fast.

### What the stack can do today (honest)

| Idea | Feasible now? | Notes |
|------|---------------|--------|
| **Vibrate BWC** | **Unknown / likely no** | Current `DeviceControl` cmds: Lock, Record, TakePicture, Reboot, … — **no Vibrate** in our list. Needs **vendor firmware** cmd if it exists; do not invent. |
| **SIP text MESSAGE** | **Maybe** | We already send SIP `MESSAGE` for config/control. A short “FR ALERT: {name}” only if firmware shows it on device UI — **bench first**. |
| **PTT / voice prompt to that cam** | **Plausible** | HQ short PTT or voice-broadcast path to **that camId only** — “Watchlist match” — less dependent on vibrate. |
| **Automatic Call** | **Possible but risky** | Reuses live Call mic path. During Open All / live it fights half-duplex / INVITE (you already burned on Call+PTT). Prefer **operator-triggered** “Call unit” button, not silent auto-Call on every hit. |
| **Dashboard only** (chime + speech) | **Already** | Chime + VoiceAlerts on `fr-blacklist-hit` |

### Recommended field-alert policy (locked for plan)

```
Match alarm fires
  → Dashboard: chime + red panel (now)
  → Optional auto (site setting OFF by default):
        1) Prefer: short PTT/voice cue to that BWC  OR  SIP MESSAGE if bench proves UI shows it
        2) Never auto-Call without operator confirm (v1)
        3) Vibrate: only after vendor cmd proven on your BWC model
  → Operator can press [Alert field] on the panel anytime
```

**Best “caught” answer for Ubitron v1:**  
**Operator Ack + Alert field (PTT/voice or proven MESSAGE)** + **Watch live** — not silent auto-Call, not fake vibrate.

---

## 5) Proper plan → then do (one MOB at a time)

| Order | MOB | Intent | Risk |
|-------|-----|--------|------|
| **1** | `mob-fr-snapshot-rolling` | More snaps (faster poll / emit good grabs); alarm dedupe stays | Med (CPU) |
| **2** | `mob-fr-alarm-actions-dossier` | Alarm: Open dossier · Watch live; click red snap opens same | Med |
| **3** | `mob-fr-alarm-false-positive` | FP + audit | Low–Med |
| **4** | `mob-fr-crop-click-detail` | Non-match snap click → detail / enroll path | Med |
| **5** | `mob-fr-field-alert-ptt-or-msg` | Alert field button (+ optional auto setting); **bench MESSAGE/PTT first** — detail: `MOB-DISC-FR-FIELD-ALERT-PTT-MSG.md` | **APPLIED 2026-07-10** — manual **Alert field** only; short PTT beep + text/plain SIP MESSAGE; no SOS/PTT core edits; auto-alert still off |
| **6** | `mob-fr-field-vibrate` | **Only if** vendor vibrate cmd proven | Parked |
| **7** | `mob-fr-field-call-confirm` | “Call unit” on panel — **manual**, not auto | Higher (live Call) |

**Do not** mix with fleet boot soften / pin / live wall in the same turn.

**Also pending (separate):** `mob-fleet-boot-online-soften` — not this genre.

---

## 6) Success criteria

| Check | Pass |
|-------|------|
| Snaps | Clearly denser than today while watch runs; alarm not spamming |
| Ack | Still closes interrupt; rail keeps match; audit recorded |
| Red panel / red snap click | Dossier + Watch live available |
| Field | One proven path to notify that BWC (PTT/MESSAGE); no surprise auto-Call |
| Operator | Can answer “I got a hit — what do I do?” without a blank Ack |

---

## Bottom line

- **More snaps:** yes → start with **`mob-fr-snapshot-rolling`**.  
- **Ack empty:** by design today — protocol above replaces it.  
- **Click red / click snap:** open triage (dossier / live / FP / alert field).  
- **Vibrate / message / auto-call:** message/PTT first after bench; vibrate only with real firmware cmd; **no silent auto-Call** in v1.

When ready, reply e.g.  
`MOB-APPLY mob-fr-snapshot-rolling`  
then later alarm-actions / field-alert — one at a time.
