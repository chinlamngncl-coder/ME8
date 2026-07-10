# MOB DISC — FR Ack: what is kept today · what is missing · sighting report later

**Status:** DISC only — no APPLY  
**Date:** 2026-07-10  
**Search:** FR ack, dismiss, sighting report, snap ledger, incident, false positive  
**Related:** `MOB-DISC-FR-ALERT-UX-SOS-VS-FR-REPORT.md`, `MOB-DISC-FR-HALF-FACE-SNAP-LEDGER.md`, `MOB-DISC-FR-STANDBY-PTT-GROUP.md`

---

## Operator question (locked)

> When we **Ack** an FR hit — where do all the things we’re supposed to keep and show go? Is that planned for later?

**Short answer:** **Ack today = close the interrupt + audit log only.** Evidence crops and GPS are already on disk from the **watch pipeline** — but there is **no FR sighting report**, **no hit history UI**, and **no operator note / false-positive path** yet. **Yes — planned as separate MOBs**, not SOS ack.

---

## What happens on Ack **today** (shipped)

| Layer | On hit (before Ack) | On **Ack** | On **Dismiss** |
|-------|---------------------|------------|----------------|
| HQ red bar + modal | Opens | **Closes** | **Closes** |
| Chime | Plays | — | — |
| Socket | `fr-blacklist-hit` | `fr-alarm-ack` → `fr-alarm-acked` | `fr-alarm-dismiss` |
| Audit | — | `analytics.fr_alarm_ack` (hitId, camId, blacklistId, user) | `analytics.fr_alarm_dismiss` |
| SOS ledger | **No** | **No** | **No** |
| Standby PTT team | Optional push (`mob-fr-standby-ptt-group`) | **Not auto-ended** (same as SOS — radio may stay up) | Same |
| Alert field beep | Optional | — | — |

**Ack is not a report.** It means: “I’ve seen this hit; stop interrupting me.”

---

## What is **already kept** (without Ack)

These run when the **poller** sees a face — **independent** of Ack:

| Store | What | Where | UI today |
|-------|------|-------|----------|
| **Snap ledger** | Best-frame crop per probe window + GPS + score + match flag | `storage/fr-snap-ledger/` · API `GET /api/analytics/fr/snaps` | **No list UI** (API only) |
| **Rolling rail** | Last ~8 crop cards on Analytics page | Ephemeral DOM | Yes — resets on refresh |
| **Watchlist photo** | Enrolled ID reference | Blacklist API | Alarm modal |
| **Audit** | Field alert, standby PTT, ack/dismiss | Server audit log | Admin / export later |

**Gap:** Ledger row for a match is written **at detect time**; `hitId` may not always be linked to the ledger row on first write. Ack does **not** promote a hit into a “closed incident” record.

---

## What is **not kept / not shown** (planned later)

| Missing piece | SOS equivalent | FR intent |
|---------------|----------------|-----------|
| **Sighting report form** | SOS ack note + helpers + capture | Operator note: confirmed / FP / escalated · optional photo |
| **Hit incident record** | SOS ledger row | `fr-incidents.jsonl` or ledger extension — one row per `hitId` |
| **History list** | SOS ledger UI | Analytics “Sightings” tab — filter by cam, person, date |
| **Map trace** | SOS pin + circle | Person track from snap ledger GPS (`mob-fr-snap-ledger-ui`) |
| **False positive** | Cancel SOS | “Not them” — downgrade noise, optional audit |
| **Export / tender pack** | SOS CSV | FR sighting export — separate scope from SOS |

**Do not** fold these into SOS ack form (already rejected).

---

## Target flow (AGREED — mirror SOS discipline, FR door)

```
Watchlist hit
  → HQ bar (+ modal)
  → optional: Alert field · Standby PTT team
  → Ack  ──► closes interrupt
  → optional later: FR sighting report (same session or “complete later”)
  → history + map from snap ledger / incident index
```

SOS parallel:

```
SOS → banner → PTT team → ack → SOS report → ledger
FR  → bar     → standby  → ack → FR report  → FR history (later)
```

---

## Suggested MOB sequence (one at a time)

| # | MOB | Delivers |
|---|-----|----------|
| 1 | `mob-fr-hq-alert-nonblocking` | Ack from any page without modal trap |
| 2 | **`mob-fr-ack-incident-record`** | On ack: durable row keyed by `hitId` (cam, person, score, crop ref, GPS, ack user, time) |
| 3 | `mob-fr-sighting-report` | Optional panel after ack: note, outcome (confirmed / FP / monitor), link standby PTT team list |
| 4 | `mob-fr-snap-ledger-ui` | Browse snaps + “Show on map” + filter match-only |
| 5 | `mob-fr-person-track-map` | Path / heat from ledger GPS for one blacklistId |

**Not in ack v1:** auto-end standby PTT (operator may still be on radio).

---

## Ack vs Dismiss (product)

| Action | Meaning | Future incident status |
|--------|---------|------------------------|
| **Ack** | Seen and triaged — normal close | `acknowledged` |
| **Dismiss** | Close without weight (noise / wrong tab) | `dismissed` — may still keep ledger crop |

Both should eventually write to incident index; today only audit.

---

## APPLY commands (when ready)

```text
MOB-APPLY mob-fr-ack-incident-record
MOB-APPLY mob-fr-sighting-report
MOB-APPLY mob-fr-snap-ledger-ui
```

Do **not** bundle ack record + sighting form + ledger UI in one pass.

---

## Bottom line

| Question | Answer |
|----------|--------|
| Does Ack save a report? | **No** — audit + close UI only |
| Is evidence lost on Ack? | **No** — snap ledger already has crops/GPS from detect |
| Can I browse hits after Ack? | **Not yet** — API exists; UI + incident index later |
| Same as SOS ack? | **No** — separate FR sighting MOBs |
