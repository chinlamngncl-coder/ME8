# MOB DISC — A3 hierarchy UX feedback (where? NHQ? neutral words)

**Status:** DISC — **A3 labels shipped but UX/copy failed the operator.** Fix is a small follow-up MOB, not a redo of scope logic.  
**Trigger:** User could not find “See all”; **NHQ** / **TOC** / **Corporate** jargon is wrong for a general product (not PNP-only).

---

## Honest: where “See all” actually is today

Not a new screen. Same place as before A3 — we only renamed labels and added badges.

| Step | Where |
|------|--------|
| 1 | Sign in as **super admin** (only role that manages users) |
| 2 | **Settings** (gear) → **Server Config** |
| 3 | Top tab: **Dashboard** (not Server / BWC / Groups) |
| 4 | Sub-tab: **Operators** (not My account) |
| 5 | Wide table → **scroll horizontally to the far right** |
| 6 | Column **Station scope** (last wide column before **Actions**) |
| 7 | On an **Operator** row (not Super admin): checkbox **See all stations (Corporate)** |
| 8 | Below that: **Station groups** checkboxes (dispatch group names) |
| 9 | Change something → **Save** on that row → badge under **Role** updates |

**Why you may have seen nothing**

| Cause | What you see instead |
|-------|----------------------|
| Only user is **global** / super admin | No “See all” checkbox — super admin is always all-stations |
| On **My account** | No users table |
| On **Server** tab | No users table |
| Did not **scroll right** | Table is ~2240px wide; Station scope is off-screen |
| Not super admin | Users section hidden / read-only |
| Old JS cached | Hard refresh after `server-setup.js?v=20260708-a3-hierarchy` |

**Badge location:** small pill under **Role** column — **Corporate (all stations)** or **Station-scoped**. Easy to miss next to a huge permission grid.

---

## What A3 was supposed to do (no new feature)

- Explain existing rule: **see all dispatch groups** vs **assigned groups only**  
- Same enforcement as SOS ledger PASS — labels only  
- **We did not add** a new toggle; we relabeled the old **See all groups** checkbox

---

## What went wrong (copy + layout)

### 1. NHQ / TOC / Corporate — **reject in product UI**

| Shipped (bad) | Problem |
|---------------|---------|
| “NHQ / Corporate” in hints | Tender/internal slang — not Ubitron product language |
| “Station / TOC” | TOC is ops jargon; customers use **station**, **site**, **team** |
| “Corporate (all stations)” | Vague; sounds like company HR not dispatch scope |

**Locked for customer-facing copy:** no **Corporate**, no **NHQ**, no **TOC**, no **PNP**-specific org names. “Corporate” is **not** enterprise-product language — it is tender slang that must never appear on Settings. Agent docs may use plain prose (“operations desk”) — **never** these tokens in `locales/` or HTML fallbacks.

**Full lock:** `docs/MOB-DISC-A3-BANNED-JARGON-LOCK.md`

### 2. Neutral vocabulary (locked for fix MOB)

| Concept | Use in UI |
|---------|-----------|
| Sees every dispatch group | **All stations** |
| Sees only assigned groups | **Assigned stations only** |
| Checkbox (unchanged permission) | **See all dispatch groups** (restore clear name) |
| Column header | **Dispatch groups** (not “Station scope”) |
| Super admin | **Super admin** (unchanged) |
| One-line intro | “**All stations** = super admin or See all dispatch groups. **Assigned only** = pick groups below.” |

No “Corporate”. No “NHQ”. No “TOC”.

### 3. Layout — why DISC says A3 “failed UX” even if code works

- Scope control is column **20+** in a horizontal scroll — enterprise products put **group assignment near User / Role**, not after VC/Audit columns.  
- Badges are tiny; hints duplicate in three places.  
- Bench text assumed you already knew the old **See all groups** checkbox.

---

## Recommended fix (one MOB — not live/SOS)

**Name:** `mob-vms-deploy-a3-copy-neutral-ux`  
**Risk:** 1–2 (i18n + column order / hint trim only)

1. Replace all NHQ / TOC / Corporate strings with table above.  
2. Move **Dispatch groups** column **left** (after Role or after Sign-in until) — still one MOB, small HTML/JS order change.  
3. One short intro line; drop duplicate paragraph hints in every cell.  
4. Keep badges: **All stations** / **Assigned only** (short, coloured).  
5. Update agent DISC docs to drop NHQ from UI examples.

**Do not** change `seeAllDispatchGroups` behaviour or ledger scope.

---

## What to test after fix MOB

1. Settings → Server Config → Dashboard → Operators  
2. **Without scrolling past Role**, see dispatch groups / See all checkbox  
3. Operator row: toggle **See all dispatch groups** → Save → badge **All stations**  
4. Uncheck, assign one group → Save → badge **Assigned only**  
5. No string in UI contains NHQ or TOC  

---

## Reply to apply fix

`MOB-APPLY mob-vms-deploy-a3-copy-neutral-ux`

Until then: A3 logic is fine; **product copy and placement are wrong** for your users.
