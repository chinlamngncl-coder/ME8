# MOB DISC — ANPR-PLATE-LISTS-V1 design lock (FR + industry)

**Date:** 2026-07-30  
**Status:** **APPLIED with this MOB** — design locked before code to avoid patch loops  
**APPLY:** `MOB-APPLY ANPR-PLATE-LISTS-V1`  
**Operator:** Unify like FR; do not invent a random UI; check how ANPR vendors do lists.

---

## Industry (what we copy)

| Vendor pattern | Take for Axiom |
|----------------|----------------|
| **Milestone XProtect LPR** | **Match lists** of plate numbers; read → compare → event/alarm; operators maintain lists; search/filter |
| **Plate Recognizer / public ALPR** | Same engine for snapshot + live; hit = list match after OCR |
| **Not** | Face-style photo embedding enroll for plates |

So V1 = **plate string lists** (like Milestone match lists), not FR face vectors.

---

## FR UI parity (what we copy from Axiom Face)

| FR Watchlist | ANPR Plate lists |
|--------------|------------------|
| Hub panel: enroll form + toolbar + table | Same layout family (`ax-bl-*` grid / table chrome) |
| Grades + filter + search + refresh | Grades + filter + search + refresh |
| Result of live/offline → list match | Result of **Read plate** → list match badge |
| Separate from Verify 1:1 | Separate **sub-tab** under ANPR: **Snapshot** \| **Plate lists** |
| Face Watchlist stays faces-only | Plate lists never mix into FR index |

**Sub-tabs under ANPR** (not a fourth top-nav invent): keeps one ANPR module like Milestone’s LPR area, while Snapshot stays the FR “Verify-like” work surface.

---

## Grades (three — product lock)

| `listStatus` | Operator label | Tier (later hits) |
|--------------|----------------|-------------------|
| `suspicious` | Suspicious | medium |
| `wanted` | Wanted | high |
| `blacklist` | Blacklist | high |

Default enroll grade: **suspicious** (like FR default suspect — not auto-blacklist).

---

## Match rule (V1)

- Normalize: uppercase, strip spaces/dashes → `plateCompact`  
- Exact match on compact vs enrolled compact  
- Return `listMatch` on successful `/api/analytics/anpr/read`  
- No fuzzy / OCR-error distance in V1 (avoids false Wanted hits)

---

## Out of scope (do not bundle)

- Live ZLM ANPR worker  
- Offline video ANPR  
- Socket hit toast / Ops jump  
- CSV import  
- Allow-list / unlisted events  

---

## PASS / FAIL

| Check | PASS |
|-------|------|
| ANPR → Plate lists | Enroll form + table like Watchlist family |
| Add plate Blacklist/Wanted/Suspicious | Appears in table with grade badge |
| Snapshot Read that plate | Result card shows list hit badge |
| No list | “No list match” / empty — not an error |
| FR Watchlist | Unchanged |

**No freestyle second UI.**
