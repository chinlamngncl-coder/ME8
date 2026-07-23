# MOB DISC — Map pin stack vs gold / lab (2026-07-10)

**MOB DISC ONLY — no code.** Honest compare after Open All Chin+kk still shows **Overlapping (2)** and faceplates stacked.

**Search:** pin stack gold, Overlapping (2), autoFan n=2, dock L/R, firmware gold pin layout

---

## Verdict

**Firmware gold, SaaS Mobility trial tree, and current ME8 all use the same n=2 rule:**  
`autoFanStackedPopups` **returns early** when `cluster.length === 2`. Layout is **dock left/right beside pins** (`PIN_POPUP_DOCK_SLOTS` / `assignColocatedPinPopupDocks`) + small y-stagger — **not** edge fan.

The aggressive ±420/520 fan MOB was **not** gold. It shoved panels to map edges and was correctly **reverted**.

Gold checkpoint **PASS** for colocated Chin+kk was **pin video / canvas mirror** (Open All live on pins), **not** “zero Overlapping HUD / zero faceplate overlap.”

---

## What was compared

| Source | Path | n=2 fan? | Dock L/R? | Key constants |
|--------|------|----------|-----------|---------------|
| ME8 firmware gold | `baseline/2026-07-06-me8-firmware-gold/public/index.html` | No (early return) | Yes | `PIN_COLOC_CLUSTER_M=25`, `PIN_COLOC_SCREEN_PX=320`, `PIN_POPUP_GAP=8`, `PIN_LABEL_CLEAR=48` |
| Current ME8 | `public/index.html` | Same | Same | Same (except `MAX_OPEN_PIN_POPUPS` 8 vs gold 6) |
| SaaS Mobility | trial ship `index.html` (same pattern) | Same | Same | Same family |

---

## What the screenshot actually shows

- HUD **Overlapping (2) — Pin Stack Select Drag** + Chin / kk chips = **designed** colocated UX (pick / drag), not a missing gold patch.
- Faceplates near each other beside pins = **dock**, not a broken fan.
- Grey offline pin (e.g. UB-*) = last-GPS persistence — separate from stack layout.

---

## What not to do again

- Do **not** re-apply edge fan (±400+ px) for n=2.
- Do **not** claim “gold had no stack” — gold had the same early-return + dock + HUD.

---

## If operator wants better than gold (optional next MOBs — pick one)

| Option | Intent | Risk |
|--------|--------|------|
| **A — Accept gold** | Overlapping HUD + dock + drag chips is the product bar | None |
| **B — Dock gap only** | Slightly larger horizontal dock offset / y-stagger **beside pins** (still no fan) | Low; one MOB |
| **C — Restore gold file slice** | Only if a real diff is found outside autoFan (none found on layout constants) | N/A until diff exists |

**Parked:** inventing more fan geometry.

---

## Related

- `docs/MOB-DISC-MAP-PIN-FAN-2-REVERT.md`
- `docs/MOB-DISC-MAP-PIN-FAN-2-SCOPE.md`
- `docs/MOB-DISC-GOOGLE-PIN-CANVAS-MIRROR-VERIFY.md` (gold PASS = mirror video)
- `docs/MOB-DISC-MAP-PIN-STACK-STILL-BROKEN.md`
