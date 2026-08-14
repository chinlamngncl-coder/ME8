# MOB DISC — Users & authority: filter above hint + professional Stations copy — 2026-08-11

**Status:** Discuss only. **No code** until named APPLY.  
**Read:** `.cursorrules` · UI copy judgment · no invent beyond this disc.

---

## Got it — layout swap

**Today (your screenshot):**

1. DASHBOARD USERS  
2. Hint: “All stations = Super admin…”  
3. Search · Role · Stations  

**Wanted:**

1. DASHBOARD USERS  
2. Search · Role · Stations  
3. Hint **below** the filter row  

Same elements, same ids — **reorder only** (hint `<p>` moves under `#ss-users-filter`). No new controls. No card redesign.

---

## Copy — hierarchy hint (professional)

Current (`server.users.hierarchyIntro`):

> All stations = Super admin or See all groups. Assigned only = pick Dispatch groups.

Problems: telegram style (`=`), teaches product jargon in the wrong place, reads like an agent note.

**Recommend (one short line — Bucket B: scope risk):**

| Option | Text |
|--------|------|
| **A (pick)** | **Stations: All stations see every group. Assigned only is limited to the groups you tick.** |
| B | Scope: All stations = full map groups. Assigned only = selected groups only. |
| C (shortest) | All stations see all groups; Assigned only uses the groups you select. |

Also tidy dropdown labels if still raw:

| Key | Today | To |
|-----|--------|-----|
| `server.users.filterScopeAll` | All scopes | **All stations types** or **Any** → prefer **All** |
| Stations column already uses All stations / Assigned only | keep |

**Pick A** unless you prefer C.

Panel intro rule: never blank; one professional sentence under the filters is enough.

---

## Proposed APPLY

`MOB-APPLY USERS-AUTHORITY-FILTER-HINT-ORDER-V1`

Scope:

1. Move `server.users.hierarchyIntro` block **below** `#ss-users-filter` (and empty state stays with list).  
2. Replace intro string (en.json + HTML default) with **option A** (or your chosen line).  
3. Optional: `filterScopeAll` → **All**.  
4. **No** filter logic change, no card layout change, no CSS freestyle beyond existing filter styles.

---

## Out of scope

- Rewriting Role / Search labels  
- Per-permission search  
- Hiding the hint entirely (would violate “never blank” panel guidance unless you order Bucket A remove)

Say **`MOB-APPLY USERS-AUTHORITY-FILTER-HINT-ORDER-V1`** when ready.
