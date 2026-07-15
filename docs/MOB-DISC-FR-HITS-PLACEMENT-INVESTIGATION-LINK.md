# MOB DISC — Hits placement + link to Investigation (logic)

**Status:** DISC only — **no APPLY** until you name a MOB  
**Date:** 2026-07-13  
**Trigger:** “Hits = match-only — where do you put them? How link to investigation? Logical?”  
**Parent:** `MOB-DISC-FR-HITS-STRIP-VS-ROLLING.md`  
**Related:** `MOB-DISC-FR-HOLDS-DISPOSITION-LIFECYCLE.md`, `MOB-DISC-FR-KEPT-SHIP-EVIDENCE-NAMING.md`

---

## Plain answer

**Where:** Analytics → Face → **right column**, **above** today’s Recent rail — a short **Watch hits** strip (4–6 sticky cards). Same screen as live tiles; operators do not leave the watch desk.

**Investigation link:** Hits are the **live inbox**. Investigation holds are the **saved tray**. Bridge = existing **Keep** (one deliberate click) — not auto-file every match into Evidence.

That split is logical. Auto-pushing every POI hit into Investigation would flood the holds tray the same way rolling floods the rail.

---

## Placement (concrete) — SUPERSEDED for space

**Do not stack a second strip above Recent.** The right column is already filled by **16** Recent slots (`mob-fr-snap-rail-16-fit`, no scroll). See correction:

→ **`MOB-DISC-FR-HITS-NO-SPACE-ABOVE-16.md`** (locked: reserve **4 of 16** for Hits, **12** Recent)

Legacy sketch below kept for history only:

Today’s layout:

```
Analytics · Face
┌─────────────────────────┬──────────────────┐
│  6 live tiles           │  Recent (rolling │
│  watch set              │  16 face crops)  │
└─────────────────────────┴──────────────────┘
```

Target:

```
Analytics · Face
┌─────────────────────────┬──────────────────┐
│  6 live tiles           │  Watch hits      │  ← NEW (match-only, sticky)
│  watch set              │  [4–6 cards]     │
│                         │  ──────────────  │
│                         │  Recent          │  ← existing rolling
│                         │  [face flood]    │
└─────────────────────────┴──────────────────┘
```

| Lane | DOM (intent) | Lives where |
|------|----------------|-------------|
| **Watch hits** | `#ax-fr-hits-strip` above `#ax-fr-crop-rail` | Analytics Face only (session UI) |
| **Recent** | existing `#ax-fr-crop-rail` | Unchanged role |

**Not** a new top-level nav tab. **Not** buried only under Evidence (too late for live watch).

Optional later: Evidence → Investigation holds filter `from hit` / grade — secondary archive, not the live home.

---

## Three objects (do not collapse)

| Object | Lifetime | Purpose |
|--------|----------|---------|
| **Recent snap** | Seconds–minutes, FIFO | “Any face we saw” |
| **Watch hit** | Sticky until Ack / TTL / Clear | “Watchlist person ≥ threshold” — live desk |
| **Investigation hold** | Days–weeks until disposition | “Operator chose to keep this pack” — Evidence tray |

```
BWC face
   │
   ├─ rolling ──────────► Recent (no score clutter)
   │
   └─ match ≥ threshold ► Watch hits (grade + score%)
                              │
                              ├─ POI / monitoring → stay on Hits (quiet)
                              ├─ Suspect → Hits + amber toast
                              ├─ Blacklist → Hits + red alert
                              │
                              └─ operator Keep ──► Investigation holds
                                                      │
                                                      ├─ Clear / Close hold
                                                      └─ Link to Case file (later)
```

**Logical rule:** Match creates a **hit**. Human judgment creates an **investigation hold**. Alerts are only the loud path for high grades — not the filing system.

---

## How Hits link to Investigation (v1)

Reuse what already exists on snap / map Keep:

| Action on a Hit card | Result |
|----------------------|--------|
| **Keep** | Same pack path as today → `storage/fr-kept` → Evidence → **Investigation holds** |
| **Open** | Soft detail (crop, enroll photo, score, grade, cam, time, GPS) — not always red drawer |
| **Ack / Clear** | Remove from Hits strip only (session) — does **not** delete a hold |
| **Go to holds** (optional link) | If this hit was Kept → jump Evidence → that hold id |

Metadata to carry on Keep from a hit (already partly there): `blacklistId`, `displayName`, `scorePct`, `camId`, `listStatus` / grade, crop, GPS.

**Do not auto-Keep** on match (any grade). Volume + false positives would trash Investigation.

**Suspect / blacklist:** toast can include **Keep** as a one-tap (same API) — still explicit.

---

## Why this is logical (and what would not be)

| Approach | Verdict |
|----------|---------|
| Hits above Recent on Face panel + Keep → holds | **Locked** — live desk + deliberate archive |
| Auto-create hold on every match | **Reject** — Investigation becomes another flood |
| Hits only inside Evidence | **Reject** — operators watching live never look there in time |
| Hits replace Recent entirely | **Reject** — lose “any face” context for investigation of near-misses |
| Red alert = only place matches exist | **Reject** — breaks POI/monitoring (no interrupt by design) |

---

## Hit card content (enough to decide Keep)

- Face crop  
- Name + **grade badge** (POI / monitoring / suspect / blacklist)  
- Score %  
- Cam / time  
- Actions: **Keep** · Open · Ack · (blacklist: same field/map actions via toast/drawer)

Session TTL suggestion: **15–30 min** or until Ack; blacklist may stay until Ack even if TTL (policy later).

---

## MOB plan (placement + bridge)

| # | MOB-APPLY | Delivers |
|---|-----------|----------|
| **1** | `mob-fr-hits-strip-pin` | `#ax-fr-hits-strip` above Recent; sticky match cards; grade + score; rolling cannot eject |
| **2** | `mob-fr-hit-keep-to-holds` | Keep on hit card → same Investigation holds pack; store `listStatus` + score |
| **3** | `mob-fr-amber-toast-suspect` | Soft toast; Keep available |
| **4** | holds disposition / link-case | Already in follow-up list — closes the Investigation side |

---

## Apply cheatsheet

```text
MOB-APPLY mob-fr-hits-strip-pin
MOB-APPLY mob-fr-hit-keep-to-holds
```

---

## Bottom line

| Question | Answer |
|----------|--------|
| Where put Hits? | Analytics Face **right column, above Recent** |
| Link to investigation? | **Keep** → Investigation holds (explicit); not auto |
| Logical? | **Yes** — live inbox ≠ evidence tray ≠ case file |
