# MOB DISC — Investigation holds need disposition (close / clear / delete) + how to mark them

**Status:** DISC only — **no APPLY**  
**Date:** 2026-07-13  
**Trigger:** Investigation holds UI has Open / Copy ID only — no close, cancel, or delete. “How can investigation have no close?” What to log? Color? Number? Think harder.  
**Search:** investigation holds, disposition, close hold, clear FR keep, fr-kept lifecycle  
**Related:** `MOB-DISC-FR-KEPT-SHIP-EVIDENCE-NAMING.md` · Case Files (open/closed already exist)  

---

## Honest gap

You’re right. Shipping **Investigation holds** as an inbox with **no way out** is incomplete product logic.

Today:

```
Keep → pile grows → browse forever → no disposition
```

That is a **tray**, not an investigation workflow. Operators will drown once volume rises.

---

## Don’t confuse two objects

| Object | What it is | Already has |
|--------|------------|-------------|
| **Investigation hold** | One FR **snap pack** kept for later (face + GPS + time) | Keep, list, open thumb |
| **Case file** | Formal field report + linked evidence | Open / **Closed**, notes, link evidence |

**Close a hold** ≠ **Close a case file**.

| Action | Meaning |
|--------|---------|
| **Close / Clear hold** | “We’re done with *this snap* in the tray” — disposition recorded |
| **Close case file** | “This *incident report* is finished” — existing Case Files status |
| **Escalate / Link to case** | Hold graduates into (or attaches to) a Case file — real investigation home |

Mistake to avoid: forcing every Keep into a full Case file (too heavy). Mistake we made: Keep with **no exit**.

**Mental model:**

```
FR snap → Keep → Investigation hold (working tray)
                      ├── Clear / Close hold  → done (with reason + log)
                      ├── Link to Case file   → formal investigation
                      └── Discard (soft)      → hide from Active (audit kept)
```

---

## What operators need on a hold (v1)

### 1) Status (required lifecycle)

| Status | Color chip | Meaning |
|--------|------------|---------|
| **Open** | Amber | Still in tray — needs attention |
| **Cleared** | Green | Reviewed; no further action (false hit, known OK, etc.) |
| **Linked** | Blue | Attached to a Case file |
| **Discarded** | Grey | Soft-removed from Active list (not “never existed”) |

Optional later: **Priority** flag (red ring) — not a status; a filter.

Default list view = **Open** only (like Evidence Library Active / Archived). Toggle: Open | Cleared | Linked | Discarded | All.

### 2) Human number (not only `frk-…` hash)

| ID | Role |
|----|------|
| **Hold no.** | Short, speakable: `IH-260713-004` (date + sequence) |
| **Pack id** | Technical `frk-…` (Copy ID / IT / files on disk) |

Show **Hold no.** on the card big; pack id small / copy.

### 3) Color coding (what to put on the card)

| Signal | Use |
|--------|-----|
| **Status chip** | Amber / Green / Blue / Grey (above) |
| **Match score** | Keep as % text (already) — not a second color system |
| **SOS / live alarm** | Separate (don’t overload hold status with SOS red) |
| **Priority** (optional) | Small red “!” or border — only if ops ask |

One color language for **disposition**. Don’t invent five unrelated palettes.

### 4) What to **input** when closing / clearing

**Required (pick list — fast for ops):**

| Disposition reason | When |
|--------------------|------|
| False positive | Wrong face / bad match |
| Known / cleared | Person OK / whitelist context |
| Duplicate | Same face already held |
| Escalated to case | Linked / opened Case file |
| Other | Must type short note |

**Auto (no typing):**

- Who (dashboard user)  
- When (UTC + local)  
- Hold no. + pack id  
- Snapshot meta already on pack (cam, GPS, score, name)

**Optional:** free-text note (1–2 lines).

**Not required on Clear:** full case narrative — that belongs on **Case file**.

---

## Close vs Cancel vs Delete (and do we keep a log?)

| Word | Recommend | Keeps files? | Log? |
|------|-----------|--------------|------|
| **Clear / Close hold** | Primary exit | **Yes** — jpg/json stay; status → Cleared | **Yes** — disposition event |
| **Cancel** | Avoid as label (ambiguous) | — | — |
| **Discard** | Soft remove from Active | **Yes** for retention window | **Yes** |
| **Delete** | Rare; confirm; preferably **super_admin** | Move to trash / or purge after N days | **Yes** — who/when/why |
| **Link to case** | Escalate | Yes + case link | **Yes** |

### Should closed holds “keep somewhere”?

**Yes.** Investigation discipline:

1. **Active tray** — Open holds only  
2. **History** — Cleared / Linked / Discarded still listable (filter)  
3. **Audit log** — append-only line per disposition (who, when, reason, note, hold no.)  
4. **Disk** — don’t silently wipe jpg on Clear; purge is a **retention** policy later (e.g. 30/90 days), not one click  

If court / complaint later: you need “we saw this face, cleared as false positive at 15:02 by operator X” — **not** a vanished Keep.

Hard delete without log = bad for anything called investigation.

---

## What we should *not* do

| Idea | Why not |
|------|---------|
| Only Delete, no Clear | Punishes ops; kills audit |
| Rename hold panel to “Cases” | Collides with Case Files |
| Require Case file for every Keep | Too slow for false-positive flood |
| Color = random traffic light with no legend | Confuses; status chip + legend is enough |
| Close = delete files immediately | No investigation trail |

---

## Recommended product shape (summary)

```
Investigation holds
  [ Open | Cleared | Linked | Discarded ]

  Card:
    [IH-260713-004]  ● Open (amber)
    thumb · name · cam · time · score
    [Open] [Clear…] [Link to case] [Discard]
```

**Clear…** → reason picklist + optional note → status Cleared → toast “Hold cleared — kept in history”  
**Link to case** → pick/create Case file (reuse Case Files UI later) → status Linked  
**Discard** → confirm → status Discarded (still in history / retention)

Log file (concept): `storage/fr-kept/disposition.jsonl` or fields on each `{id}.json` + index refresh.

---

## Proposed MOBs (parked — pick order)

| MOB | Scope |
|-----|--------|
| **`mob-fr-holds-disposition-status`** | Status field + Open/Cleared filters + Clear dialog (reason + note) + audit fields; **no hard delete yet** |
| **`mob-fr-holds-hold-number`** | Human `IH-yymmdd-seq` on Keep + card |
| **`mob-fr-holds-link-case`** | Link hold → existing Case file; status Linked |
| **`mob-fr-holds-soft-discard`** | Discard + history filter |
| **`mob-fr-holds-hard-delete-admin`** | Super-admin purge + mandatory reason + log (last) |

**Suggested first APPLY:** `mob-fr-holds-disposition-status` (+ hold number in same pass if you want one MOB — say so).

---

## Answers to your questions (short)

| Question | Answer |
|----------|--------|
| How can investigation have no close? | It shouldn’t — **Clear/Close hold** is required product |
| Cancel or delete? | Prefer **Clear** + **Discard**; hard **Delete** only admin + log |
| If we close, keep a log? | **Yes** — who / when / reason / note; files stay unless retention purge |
| Color code? | **Status chips**: amber Open, green Cleared, blue Linked, grey Discarded |
| Number? | **Yes** — short **Hold no.** `IH-…` plus technical pack id |
| What to input? | **Reason picklist** (required) + optional note; identity/time automatic |

---

## No code in this DISC

Reply with which MOB to APPLY first (recommend disposition status).
