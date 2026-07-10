# MOB DISC — FR alert UX: choppy cue · stuck on FR page · SOS-ack vs FR report

**Status:** DISC locked 2026-07-10 — **operator AGREED**; no APPLY yet  
**Search:** choppy beep, stuck FR page, FR ack, SOS ack, sighting report, modal trap  
**Related:** `MOB-DISC-FR-ALERT-REPEAT-HQ-GLOBAL.md`, `MOB-DISC-FR-FIELD-ALERT-ONE-BEEP.md`, `MOB-DISC-FR-ALARM-FIELD-ALERT-PLAN.md`

---

## Operator report (accepted)

1. **Field alert passed** (paced 10-beep path works) — but audio **sounds bad / choppy**.  
2. When the FR alert pops, **cannot leave FR page** / test other pages — **stuck** behind the popup.  
3. Question: put **FR alert ack into SOS Alert ack** (same report style)? Or keep / build report **later on FR page**? **Which is better for real use?**

### AGREED (locked)

SOS pattern: shell alert → ack → optional report.  
**FR stays on FR** — later sighting note/report on **FR page / snap ledger**, **not** the SOS ack form.

---

## 1) Choppy field cue — why

Pacing fixed the “1 beep” dump. Choppy usually means:

| Cause | Note |
|-------|------|
| Frame timer drift / GC | `setTimeout(20ms)` is not a hard realtime clock |
| Device jitter buffer | Short dual-beep + gaps can stutter on BWC speaker |
| TCP write still bursty | One frame/tick is better than dump; still not mic-smooth |

**Follow-on MOB (not this disc’s APPLY):** `mob-fr-field-alert-smooth-cue` — longer tones, fewer gaps, or paced with `setInterval` + catch-up; optional shorter 5-beep “clean” pattern for soak.

Do **not** re-dump the whole buffer.

---

## 2) Stuck on FR page — root cause

| Layer | Today |
|-------|--------|
| `#fr-alarm-backdrop` | `position: fixed; inset: 0; z-index: 26000` — **full-screen overlay** |
| Modal | Opens on hit — blocks clicks to nav / Live / Map |
| HQ bar | Applied — but **modal still traps** until Ack/Dismiss |

So: global bar was right; **blocking modal on every hit** fights “use any page.”

### Locked UX fix intent

| Rule | Intent |
|------|--------|
| Hit arrives | **HQ bar always** (all pages) + chime |
| Modal | **Optional** — Open from bar; **not** forced full-screen trap |
| Or | Modal is **corner card** with `pointer-events: none` on backdrop (like SOS ack panel) so nav still works |
| Ack / Dismiss | From **bar or** panel — same actions |

**Suggested MOB:** `mob-fr-hq-alert-nonblocking` — stop trapping the shell; bar is primary; detail on demand.

---

## 3) FR ack → SOS ack? Or FR report later?

### Short answer (locked recommendation)

**Do not merge FR into SOS Alert ack.**  
**Do** mirror SOS *patterns* (shell banner, non-blocking, optional report) — but keep FR as its **own** incident type on the **FR / Analytics** side.

### Why not fold into SOS ack

| | **SOS** | **FR watchlist hit** |
|--|---------|----------------------|
| Meaning | Officer distress / life safety | Possible person-of-interest sighting |
| Urgency | Highest — radio team, live strip | High triage — not the same as SOS |
| Report | Incident note, helpers, capture, ledger | Sighting: who / which BWC / score / crop / FP? |
| Audit / tender | SOS ledger scoped by group | FR ledger / snaps / blacklist — different evidence |
| False positive | Rare “cancel SOS” | Common (wrong face) — needs **FP** path |

Mixing them:

- Pollutes SOS ledger with face matches  
- Trains operators to treat every FR hit like distress  
- Breaks “SOS scope PASS” mental model  
- Ack form fields (helpers, live capture) don’t fit a face crop

### What *is* better for use (same family, separate door)

```
SOS family (keep):     Banner → live response → Ack form → SOS ledger report
FR family (build like): Bar (all pages) → optional detail → Ack / FP / Alert field
                        → later: FR sighting note / report on FR page or snap ledger
```

| Phase | Where | What |
|-------|--------|------|
| **Now / next** | Shell | Non-blocking FR bar + Open detail (don’t trap page) |
| **Soon** | FR alarm panel | Dossier · Watch live · FP · Alert field (already planned) |
| **Later** | FR page / snap ledger | Optional **sighting report** (note + crop + cam + GPS) — **FR report**, not SOS ack UI |

So: **same discipline as SOS (ack + report trail), different product surface.**  
Not “reuse SOS ack dialog.”

---

## 4) Suggested APPLY order

| # | MOB | Intent |
|---|-----|--------|
| 1 | `mob-fr-hq-alert-nonblocking` | Don’t trap shell; bar primary; backdrop like SOS (nav works) |
| 2 | `mob-fr-field-alert-smooth-cue` | Fix choppy BWC audio |
| 3 | Later | `mob-fr-sighting-report` on FR/Analytics — optional note → FR ledger (not SOS) |

---

## Bottom line

| Question | Answer |
|----------|--------|
| Choppy alert? | Real — smooth-cue MOB next (after or with nonblocking) |
| Stuck on FR page? | Full-screen FR modal — **fix: non-blocking** |
| Put FR ack into SOS ack? | **No** — different incident; pollutes SOS |
| FR report like SOS? | **Yes later** — on **FR page / FR ledger**, same *idea*, not same form |

Reply e.g. `MOB-APPLY mob-fr-hq-alert-nonblocking` when ready.
