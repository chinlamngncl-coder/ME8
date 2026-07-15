# MOB DISC — Where graded matches live (vs rolling snapshot flood)

**Status:** DISC only — **no APPLY** until you name a MOB  
**Date:** 2026-07-13  
**Trigger:** “Snapshots appear, no score. POI / monitoring / suspect — where do we show them? Otherwise rolling polling replaces everything.”  
**Related:** `MOB-DISC-FR-LIST-GRADE-TOAST-NOT-ALL-ALERTS.md`, `MOB-DISC-FR-GRADE-TIERED-ALERT-URGENCY.md`, `MOB-DISC-FR-SNAPSHOT-RAIL-THRESHOLD.md`

---

## Plain answer

**You are right.** Today the Snapshot rail is a **FIFO of rolling faces**. Graded matches that are *not* full red alerts have **no durable home**, so the next poll wash **will** bury them.

Also: **no score on most cards is expected right now** — not proof the score engine is dead.

---

## Why snapshots show with no score (today)

With `FM_FR_ROLLING_RAIL` (default on):

| Emit | What rail gets | Score / name? |
|------|----------------|---------------|
| Each good grab | `fr-crop-tick` `match: false`, `scorePct: 0` | **No** — face only |
| Window winner (below threshold) | **Not** sent to rail when rolling is on | Operator never sees “73% near miss” |
| Match ≥ threshold + **blacklist/suspect** | `fr-blacklist-hit` → toast + one match card | Yes — until washed out |
| Match ≥ threshold + **poi/monitoring** | One `fr-crop-tick` `match: true` (no toast) | Yes briefly — **then washed out** |

So: rail full of faces + no % = **rolling working**. Match math only paints score when `match: true` (≥ slider / `FM_FR_MATCH_MIN`).

Your FAIL (“faces, no score”) still means: **no gallery hit above threshold** on those frames. Separate from “where do quiet grades live?”

---

## The eviction problem (your logic is correct)

```
[match POI card] → [face] → [face] → … → pushed off end of 16 slots
```

`pushCrop` always inserts at slot 0 and shifts everything. **No pin.**  
Silent grades rely on that same rail → **functionally invisible** under live poll.

Blacklist survives longer only because toast/HQ/drawer hold state — not because the rail protects the card.

---

## Locked direction — two lanes + grade homes

Do **not** make every grade a red alert. Do **give every grade a place that rolling cannot erase**.

### Lane A — Recent (rolling)

- What you have now: face crops, image-first, fast poll  
- **No** score clutter (keep clean)  
- Purpose: “what faces did we see?”

### Lane B — Watch hits (durable)

- Only rows where `match: true` (score ≥ threshold)  
- Pin / sticky until Ack, TTL (e.g. 15–30 min), or Clear  
- Shows: crop · name · **score%** · **grade badge** · cam · time  
- Click → lightbox / soft detail (not always full alert drawer)

**One rail with two sections is fine** (Hits on top, Recent below) — or a filter toggle: `All | Hits only`. Prefer **Hits strip above Recent** so operators always see matches first.

**Placement + Investigation Keep bridge (detail):** `MOB-DISC-FR-HITS-PLACEMENT-INVESTIGATION-LINK.md`

---

## Where each grade shows (locked)

| Grade | Interrupt alert? | Primary surface | Secondary |
|-------|------------------|-----------------|-----------|
| **POI** | No | **Hits strip** (quiet badge, blue/grey) | Snap ledger `match: true` |
| **Monitoring** | No | **Hits strip** (gold border + badge) | Ledger |
| **Suspect** | Soft | **Amber toast/popup** + **Hits strip** | Ledger; no SOS chime |
| **Blacklist** | Yes | **Red toast + HQ + drawer** + Hits strip | Ledger; field actions |

**Rule:** Rolling Recent never replaces Hits. Hits never auto-open red drawer for poi/monitoring.

---

## Optional near-miss (later, not required for grade homes)

Show best-of-window **below-threshold** score only in lightbox or a “Near” filter — not on every rolling card (that was deliberately cleaned). Separate MOB if you want calibration visibility again.

---

## MOB plan (one at a time)

| # | MOB-APPLY | Delivers | Risk |
|---|-----------|----------|------|
| **1** | `mob-fr-hits-strip-pin` | Hits lane / sticky match cards; rolling cannot eject until Ack/TTL; grade badge + score on hit cards | Low–Med UI |
| **2** | `mob-fr-amber-toast-suspect` | Suspect soft toast (not red alert) | Low UI |
| **3** | `mob-fr-chime-by-tier` | Chime blacklist only | Low |
| **4** | `mob-fr-rail-near-miss-score` (optional) | Show below-threshold % in lightbox / debug — not on every snap | Low |

**Do first for your FAIL:** prove a hit (score ≥ threshold) — Hits strip is useless until match fires. Then APPLY **#1** so quiet grades have a home.

Already done (server): `mob-fr-alert-tier-server` — poi/monitoring skip `fr-blacklist-hit`.

---

## Apply cheatsheet

```text
MOB-APPLY mob-fr-hits-strip-pin
MOB-APPLY mob-fr-amber-toast-suspect
MOB-APPLY mob-fr-chime-by-tier
```

---

## Bottom line

| Question | Answer |
|----------|--------|
| Why faces, no score? | Rolling ticks omit score by design; score only on **match** cards |
| Where do POI / monitoring / suspect go? | Not “nowhere” — need a **Hits** surface; today they only flash on the same FIFO rail |
| Will polling replace them? | **Yes, today** — that is the bug/gap |
| Fix shape | **Recent** (rolling) + **Hits** (pinned by grade) + soft toast only for suspect; red alert only blacklist |
