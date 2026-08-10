# MOB DISC — Keep Ops SOS strip? Rename? Who sees whose SOS? (2026-08-09)

**Status:** Design lock. **No code until named APPLY.**  
**Pairs with:** `MOB-DISC-SOS-OPS-STRIP-FOUR-ACTIONS-DESIGN-20260809.md` · `MOB-DISC-SOS-LOG-TO-SOS-CASE-SHIFT-20260809.md` · Cases scope `MOB-DISC-OPS-CASE-VISIBILITY-TEAM-SCOPE-20260808.md`

---

## 1. Short answers

| Question | Answer |
|----------|--------|
| Still keep the Ops “log” box? | **Yes — keep the Ops side strip.** It is the live desk. We **rename** it (not delete). |
| Rename or move away? | **Rename** → **SOS** / **SOS cases**. Work still happens here for Ack / live. Office + reports → Evidence → Cases. |
| Leave only necessary actions? | **Yes** — Open case · Clear strip only (2-tab box). **No** CSV. **No** Refresh (auto). See compact UI disc. |
| Does every user only see their team / assigned BWC SOS? | **Yes (already).** Same **dispatch scope** as Fleet/Ops cameras — not a private “only SOS I personally pressed” list unless their scope is that small. |

---

## 2. Keep + rename (not remove)

```text
Operations (left / status column)
  └─ SOS cases          ← renamed strip (was “SOS Log”)
       · chart + recent rows (scoped)
       · Open case · Clear strip · Refresh
       · Ack / live still here

Evidence → Cases
  └─ Same SO- cases (office, notes, Super admin CSV reports)
```

**Why keep Ops strip:** Officers need SOS on the **Ops** page next to map/live — enterprise desks keep a live incident list even when records/cases exist elsewhere.  
**Why rename:** “Log” lied. After case-on-raise, each row **is** a case.

We are **not** forcing everyone to leave Ops and hunt Evidence for every SOS blink.

---

## 3. Necessary tabs / buttons on Ops (locked face)

| Keep on Ops | Drop from Ops |
|-------------|----------------|
| Title **SOS** / **SOS cases** | Word **Log** |
| List + 7-day chart | — |
| **Open case** | **Open incident files** as primary (disk) |
| **Clear strip** | **Download CSV** · **Refresh** (permanent drop) |

Optional later (not required for first APPLY): row click → case; “Show on map.”

---

## 4. Who sees which SOS (scope) — today + locked future

### Today (code fact)

SOS dashboard / CSV already filter with `sessionCanSeeCam(session, cameraId)`:

- User sees SOS only for cameras their session is **allowed to see** (dispatch / assigned BWC scope).  
- **Super admin** → typically **all** (same as rest of Fleet).  
- Not “every login sees every SOS on the planet.”

Cases desk locked the same idea: **dispatch scope** for operators; Super admin sees all (`MOB-DISC-OPS-CASE-VISIBILITY-TEAM-SCOPE-20260808.md`).

### Locked product words

| Role | Ops SOS strip | Evidence → Cases |
|------|---------------|------------------|
| Operator / supervisor (scoped) | SOS for **assigned team / stations / BWCs only** | Same cams — their `SO-` / Face / Plate / Weapon cases only |
| Super admin | **All** SOS (lab/org) | **All** cases + report CSV |

**Clarifications:**

1. “Their own team” = **dispatch scope** (assigned devices/groups), **not** “only SOS events I personally Ack’d.”  
2. If Chin’s camera is in your scope, you see Chin’s SOS even if another desk Ack’d it.  
3. We do **not** invent a second private per-user SOS silo unless you name a new APPLY later.

---

## 5. One journey (so rename doesn’t confuse)

1. SOS fires → `SO-` case created (raise APPLY) → row on **Ops SOS cases** (if cam in your scope).  
2. You Ack / open live from Ops.  
3. Need notes / audit / report → **Open case** or Evidence → Cases.  
4. Super admin churns CSV from **Cases**, not Ops.

---

## 6. APPLY pointer (no code this disc)

Strip keep+rename+buttons: `SOS-OPS-STRIP-ACTIONS-V1`  
Case on raise: `SOS-CASE-ON-RAISE-V1`  
Scope: **already** on SOS APIs — verify after raise/Cases wires; no separate “scope invent” APPLY unless a bug shows all-fleet leak.
