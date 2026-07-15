# MOB DISC — Hits overflow (>4 reserved slots)

**Status:** DISC locked 2026-07-13 — **operator AGREE** (4 sticky + overflow queue + ledger; Keep → holds)  
**Date:** 2026-07-13  
**Trigger:** “What if suddenly more than 4? Where do suspect / monitoring snaps go?”  
**Parent:** `MOB-DISC-FR-HITS-NO-SPACE-ABOVE-16.md` (4 sticky + 12 Recent)  
**Related:** `MOB-DISC-FR-HITS-PLACEMENT-INVESTIGATION-LINK.md`, snap ledger, Investigation holds

---

## Plain answer

The **4 sticky cells are a live desk window, not the archive.**  
When a 5th (6th, …) watchlist match arrives, it still **exists** — it goes to a **Hits queue + durable ledger**. It does **not** vanish, and it does **not** steal Recent’s 12 slots.

Suspect / monitoring / POI / blacklist all use the **same overflow path**; only **interrupt UX** (toast/chime) differs by grade.

---

## Mental model

```
Match ≥ threshold
        │
        ├─► Sticky Hits (max 4 on screen)     ← “what I’m looking at now”
        │         │
        │         └─ full? ──► Overflow queue (session, ordered)
        │
        ├─► Snap ledger (disk)                ← “what matched today” (survives refresh*)
        │
        └─► Optional Keep ──► Investigation holds   ← human archive
```

\*Ledger already exists for snaps; match rows should be queryable (`match: true` + grade). Session queue can rebuild from recent ledger on reload (later MOB).

---

## On-screen 4 — who stays visible?

**Policy (locked): priority + recency.**

| Priority (keep on desk) | Grade |
|-------------------------|--------|
| 1 highest | `blacklist` |
| 2 | `suspect` |
| 3 | `monitoring` |
| 4 lowest | `poi` |

When a new hit arrives and **sticky slots are full** (4 if reserve-4of16; **5** if `mob-fr-hits-top5-bar`):

1. If new grade **outranks** the weakest sticky → **bump** weakest into overflow queue; new hit takes a sticky cell.  
2. Else if same grade → **bump oldest** same-or-lower grade (FIFO within priority).  
3. Else → new hit goes **straight to overflow queue**; sticky unchanged.

**Layout preference (2026-07-13):** top bar of **5** — `MOB-DISC-FR-HITS-TOP5-BAR.md` (no APPLY yet). Overflow logic unchanged.

**Same person + same cam** within dedupe window (`HIT_DEDUPE_MS` ~45s): refresh that card’s score/time — **do not** consume a second sticky slot.

---

## Overflow queue — where “the rest” go

| Surface | What operator sees | Cap (lab start) |
|---------|--------------------|-----------------|
| **Badge on Hits header** | `Watch hits · 4` or `Watch hits · 4 (+7)` | Soft |
| **Overflow list** | Click badge / “+N more” → small panel or drawer list (thumb, name, grade, score, cam, time) | **32** session (drop oldest) |
| **Snap ledger** | Durable match history (filter Hits / grade) | Existing ledger retention |
| **Investigation holds** | Only after **Keep** | Operator-driven |

Overflow panel is **not** a second 16-rail and **not** auto-Investigation.

---

## By grade — what happens when >4

| Grade | Sticky (≤4) | Overflow | Interrupt |
|-------|-------------|----------|-----------|
| **POI** | If priority wins a cell | Queue + ledger | None |
| **Monitoring** | Same | Queue + ledger | None (gold badge in list) |
| **Suspect** | Prefer sticky | Queue + ledger | Amber toast on **new** hit (even if queued — once per dedupe) |
| **Blacklist** | Prefer sticky hardest | Queue + ledger | Red toast / HQ (existing) |

So: **suspect/monitoring never “go nowhere.”**  
If not on the 4 cells → **overflow list + ledger**. Suspect still gets soft toast so the operator knows to open “+N”.

---

## What we explicitly reject

| Idea | Why not |
|------|---------|
| Spill hits into Recent’s 12 | Mixes match-only with face flood; Recent becomes unreadable |
| Grow sticky to 8–16 | Breaks 16-fit / tile space (already rejected extra strip) |
| Auto-Keep every overflow hit | Floods Investigation holds |
| Drop overflow on the floor | Silent loss — worse than today’s wash |

---

## Investigation link (unchanged)

| From | Action |
|------|--------|
| Sticky cell or overflow row | **Keep** → Investigation hold |
| Overflow only | Still Keepable — filing does not require a sticky slot |

Clearing a sticky/overflow row ≠ deleting a hold.

---

## MOB plan

| # | MOB-APPLY | Delivers |
|---|-----------|----------|
| **1** | `mob-fr-hits-reserve-4of16` | 4 sticky + 12 recent |
| **2** | `mob-fr-hits-overflow-queue` | +N badge, overflow list, priority bump, dedupe refresh |
| **3** | `mob-fr-hit-keep-to-holds` | Keep from sticky **or** overflow row |
| **4** | (optional) ledger filter “Matches only” | Shift review after the fact |

---

## Apply cheatsheet

```text
MOB-APPLY mob-fr-hits-reserve-4of16
MOB-APPLY mob-fr-hits-overflow-queue
MOB-APPLY mob-fr-hit-keep-to-holds
```

---

## Bottom line

| Question | Answer |
|----------|--------|
| More than 4? | Overflow **queue** + **ledger**; badge `+N` |
| Suspect / monitoring go where? | Sticky if priority allows; else overflow list — **not** deleted, **not** dumped into Recent |
| Investigation? | Still **Keep** from sticky or overflow — never auto |
