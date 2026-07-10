# MOB DISC — FR consolidate: done · untested · **stability freeze**

**Status:** DISC locked 2026-07-10 — **stop stacking FR MOBs**; soak first  
**Search:** FR consolidate, freeze, soak, checkpoint, what done, what not tested  
**Home:** Analytics → Face recognition

---

## Operator call (locked)

> We are **MOBing too much**. Must make sure software is still **stable**.  
> Consolidate: what is done vs what I have **not tested**.

**Rule until you say otherwise:**

| Do | Do not |
|----|--------|
| Soak / hard refresh / mini checkpoint | New `MOB-APPLY` on FR (or PTT-adjacent FR alert) |
| Report **PASS / FAIL** per row below | Stack archive / auth / bust tweaks / nonblocking in one night |
| One fix only if something **broke** | “While we’re here” FR features |

Empty map / slow come-up / fleet warm chrome are **fleet** genre — separate; FR freeze still applies to FR files.

---

## A — APPLIED this arc (code on disk)

Test column = what we know from you tonight (honest).

### Snapshots / rail / ledger

| MOB | What it does | Your test? |
|-----|----------------|------------|
| `mob-fr-snapshot-rail-clean` | Snapshot header; image-only cards | Earlier — felt better |
| `mob-fr-snapshot-rolling` | More snaps to rail (~2s / each good grab) | Partial — then half-face complaint |
| `mob-fr-snap-ledger` | Durable crops + cam/time/score/GPS index + API | **Not soaked** (disk/API) |
| `mob-fr-snap-retention-raise` | Hot 50k / 90d / 5GB + warn % | **Not soaked** |
| `mob-fr-reject-clipped-face` | Edge-clip → skip rail/ledger | Unclear — still saw half faces after |
| `mob-fr-snap-bust-crop` | Pad to full-face / bust display crop | **Not soaked** (needs sidecar restart) |

### Alerts (HQ + field)

| MOB | What it does | Your test? |
|-----|----------------|------------|
| `mob-fr-field-alert-ptt-or-msg` | Manual **Alert field** (PTT + MESSAGE) | Earlier path OK |
| `mob-fr-field-alert-repeat-10` | ~10 dual-beeps | Heard **1** until pace |
| `mob-fr-field-alert-pace-20ms` | 20 ms frame pace | **Passed** — then **choppy** |
| `mob-fr-hq-global-alert-bar` | Red strip all pages | **Partial** — stuck behind modal; other pages hard |

### Earlier FR (same genre, prior)

| MOB | Note |
|-----|------|
| Best-frame window, crop rail 8, offline, enroll soft quality, offline video crops, etc. | Assume still in tree — **re-smoke** if anything feels off after tonight’s stack |

---

## B — AGREED / DISC only — **not built** (do not APPLY in freeze)

| Item | Intent | When |
|------|--------|------|
| `mob-fr-hq-alert-nonblocking` | Bar primary; don’t trap shell | After soak |
| `mob-fr-field-alert-smooth-cue` | Fix choppy BWC audio | After soak |
| FR sighting report on FR page | Same *discipline* as SOS; **not** SOS ack form — **AGREED** | Later |
| `mob-fr-auth-permissions` + snap delete | Dashboard auth for FR | Later |
| `mob-fr-snap-archive-ftp` | Archive then prune | Later |
| `mob-fr-snap-ledger-ui` / person-track map | List + map path | Later |
| `mob-fr-snap-zone-gate` | Per-BWC geo snap | Later |
| Auto field-alert on match | Still **off** by design | Later |
| Dossier / Watch live / FP buttons | Planned | Later |

---

## C — Stability mini-soak (do this before any new FR APPLY)

After `RESTART-FLEET` + hard refresh:

| # | Check | Pass? |
|---|--------|-------|
| 1 | Ops: one cam live → stop | |
| 2 | Open All lite → stop all | |
| 3 | Map: online pin moves with fresh GPS (no boot cache ghosts) | |
| 4 | FR: watch on → rolling snaps look like **face/bust** not half-face junk | |
| 5 | Blacklist hit → HQ bar + modal; Ack/Dismiss | |
| 6 | **Alert field** → BWC hears cue (note: may still be choppy) | |
| 7 | Leave FR to Live/Map **with bar up** — can you navigate? (expect: modal may still trap — known) | |
| 8 | PTT / Call still OK on a cam | |

Reply **FR SOAK PASS** or **FR SOAK FAIL** (+ which row).

Only then: one named MOB (prefer `mob-fr-hq-alert-nonblocking` or smooth-cue — your pick).

---

## D — Why freeze matters

Tonight stacked: ledger, retention, clip, bust, repeat, pace, HQ bar, plus fleet warm chrome on/off.  
Any one can look fine while **live / Open All / PTT** regress. Stability > more FR features.

---

## Bottom line

| Question | Answer |
|----------|--------|
| What’s done? | Rail/rolling, ledger+retention, clip+bust, field alert×3, HQ bar — **on disk** |
| What’s untested? | Ledger/retention/bust soak; HQ bar on other pages; choppy cue still open |
| What’s agreed not built? | Nonblocking modal, smooth cue, FR report on FR (not SOS), auth/FTP/map |
| Now? | **Soak + checkpoint — no more FR MOB pile-on** |

No APPLY from this disc.
