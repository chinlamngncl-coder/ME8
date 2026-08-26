# MOB-DISC — Overwatch AR engine C1 note (pickup later)

**Date:** 2026-08-26  
**APPLY done:** `VMS-OVERWATCH-AR-ENGINE-C1-V1`, `VMS-OVERWATCH-AR-PROMOTE-C2-V1` (code in tree; **site PASS later** — operator accepted code-now / PASS-when-cams)  
**Status:** C1+C2 in tree. Operator tests on real cams / after ship. Fix only on FAIL with named MOB.

## Genre tracker (agent owns this — operator does not)

| Epic | MOB | Status |
|------|-----|--------|
| A SOS → Investigation | A1–A3 payload / autofire / ACK | Done (earlier) |
| B Universal PTZ | B1–B4 + AR pad UX | Done (earlier) |
| C Overwatch AR | `VMS-OVERWATCH-AR-ENGINE-C1-V1` | **In tree** — site PASS pending |
| C Overwatch AR | `VMS-OVERWATCH-AR-PROMOTE-C2-V1` | **In tree** — site PASS pending (PASS-later accepted) |
| C+ | Not named (no drag-enlarge; no C3 paper yet) | **Parked** until C1/C2 site results |

**Testability:** C1/C2 need live distinct fixed cams. Without cams → cannot PASS; do not block ship on that alone unless FAIL later.

## What C1 shipped

- File: `public/js/tactical-ar.js` (cache bump on `index.html` script tag)
- Semaphore: `isMountingOverwatch` + `mountGen` — busy click ignored; teardown → ~300ms → remount
- Focus: `POST .../zlm/start` `{ owner, viewMode: 'focus' }`
- PIPs: `{ owner, viewMode: 'grid' }` + `preferSubstream: true`; max **8**; overview cam excluded from PIP list
- Pins beyond 8: glass markers only (no video)
- Audio: factory muted; do not unmute
- No cross-page canvas mirror (Ops + Overwatch same cam = two FLV sockets; accepted)
- Non-PTZ / RTSP: soft-fail `goto-preset`; empty presets → **Current View** (`_current_`)
- Overview dropdown: enabled ONVIF **or** RTSP (not PTZ-only)

## Deferred (do NOT start unless operator FAILs or names MOB)

| Item | Note |
|------|------|
| **C2 Promote** | **Applied** `VMS-OVERWATCH-AR-PROMOTE-C2-V1` (PASS later when cams exist). Design locks below remain the contract. |
| **Same-URL 9-decode lab** | Lab VLC same stream only proved 1 stable player; not a product bug by itself. |
| **PIP offline / prove fail** | Handle when real cams fail; do not invent retry storm. |

## When operator returns with FAIL

1. Ask: which step (open / Use this View / switch preset / PIP count / crash / audio).
2. Check: `isMountingOverwatch`, `pipMounts.length` ≤ 8, focus `viewMode`, PIP `grid` + preferSubstream.
3. One named `MOB-APPLY` only — no C2 bundle into a C1 fix.

## Lab smoke

Removed 2026-08-26 (`__c1LiveSmoke`, `__c1CapSelfTest`, `lab-overwatch-c1-smoke.html`). Do not re-add unless operator asks.

---

## C2 locked design — APPLIED (PASS later)

**MOB:** `VMS-OVERWATCH-AR-PROMOTE-C2-V1`  
**Code:** `public/js/tactical-ar.js` + PIP Promote chrome in `global.css`  
**Aligned:** 2026-08-26 debate. Drag-focus rejected. Operator accepted **code now / PASS when cams exist**.

### Gate (historical)

1. ~~C1 site smoke PASS~~ waived for coding; still required for **PASS**.
2. Operator said: `MOB-APPLY VMS-OVERWATCH-AR-PROMOTE-C2-V1`.
3. Implement **only** the locks below — no drag, no full 9 teardown, no hover-auto-promote, no cross-page canvas mirror.

### Rule 1 — UI: Click, don’t drag

- **No dragging** HTML PIPs over AR / GIS (z-index / pointer-event fights; bad drops).
- Each PIP: small **Promote** control on PIP chrome (not whole-tile click if that fights “watch picture”).
- Click → swap that PIP with Focus (see Rule 2).
- Map-marker promote for cams beyond the 8 PIPs = Rule 3 only; do not silently reuse “open linked live elsewhere” unless product explicitly replaces that path in the APPLY.

### Rule 2 — Decode: Surgical teardown (no storms)

- Leave the **other 7 PIPs untouched** and running.
- Flow:
  1. Lock: `isSwapping = true` (also treat busy if `isMountingOverwatch` — merged: **`isMountingOverwatch || isSwapping` → ignore**).
  2. Kill **2 only**: current Focus player + clicked PIP player (decodes 9 → 7).
  3. Flush ~300ms (MSE settle). Do **not** start mounts before both destroys settle.
  4. Mount **2**: clicked cam → Focus (`viewMode: 'focus'`); old Focus cam → that PIP slot (`viewMode: 'grid'` + `preferSubstream: true`).
  5. Unlock: `isSwapping = false`.
- Cap math: never above 9; briefly at 7 then back to 9.
- Swap by **camId**, not DOM index.
- Distinct ZLM `owner` per slot so stop cannot kill the wrong proxy.
- If Focus camId === PIP camId → **no-op**.
- **Fail-safe:** if the 2-cam remount fails → **leave the 7 running**; show offline on the dead slot(s) only. **Never** panic-teardown the whole board.

### Rule 3 — 9th pin: Eviction by promotion

When operator promotes a **map marker** that is not one of the 8 mounted PIPs:

1. Kill Focus (Cam A).
2. Kill **oldest PIP** (Cam B) — FIFO.
3. Flush ~300ms.
4. Mount clicked marker cam as new Focus (`viewMode: 'focus'`).
5. Mount old Focus (Cam A) into the freed PIP slot (`viewMode: 'grid'` + preferSubstream).
6. Evicted Cam B → marker-only again (no 10th decode).

FIFO is the locked default. Sticky “don’t evict recently promoted” only if site FAIL later names it.

### Explicitly out of C2

- Drag / free resize / floating PIP windows  
- Promote that tears all 9  
- Auto-promote on hover  
- Cross-page canvas mirror (C1 accepted dual FLV + hard 9-cap)

### Pickup checklist (agent)

- [x] `MOB-APPLY VMS-OVERWATCH-AR-PROMOTE-C2-V1` (PASS-later accepted)
- [x] Semaphore merge + surgical 2-kill + fail-safe offline slots
- [x] Promote chrome + FIFO eviction for marker-beyond-8
- [x] Cache-bust `tactical-ar.js` (`?v=20260826-overwatch-c2-v1`)
- [ ] Site PASS with distinct cams (operator)