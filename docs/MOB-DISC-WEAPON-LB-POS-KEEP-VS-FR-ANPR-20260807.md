# MOB DISC — Weapon lightbox position vs FR / ANPR (2026-08-07)

**Status:** disc only. No code until APPLY.  
**After:** `WEAPON-LIGHTBOX-DRAG-X-PARITY-V1` (drag + clear X — done).

---

## Operator ask

Will Weapon stay where I put it, like FR / ANPR — not hardcoded center — including when a **new session** starts?

---

## What the code actually does (checked)

| Surface | Drag? | After close / reopen (same tab) | New browser session / hard refresh |
|---------|-------|----------------------------------|-------------------------------------|
| **FR snap** (`fr-snap-lightbox`) | Yes | **Keeps** left/top if already set; first open defaults bottom-right | **Lost** — no `localStorage`; back to default corner |
| **FR red toast** | Yes | Keeps while DOM lives | **Lost** on reload |
| **ANPR snap** | Yes | **Resets to center** every `openLightbox` (clears left/top/transform) | N/A — always center on open |
| **Weapon snap** (now) | Yes (DRAG-X) | **Resets to center** every open — same as ANPR | N/A — always center on open |

**Persist today:** FR alert **drawer expand** only (`sessionStorage` key `fr-drawer-expanded`). **No** FR / ANPR / Weapon snap **xy** in `localStorage` / `sessionStorage`.

So: Weapon is **not** the same as FR snap yet. It matches **ANPR** (drag yes, reopen = center). Nobody “keeps assigned place across a new login session” today.

---

## What “same as FR” means (honest)

1. **FR-snap parity (same page / same dashboard load):** leave dragged `left`/`top` alone on reopen; only default position when never dragged. Survives close/reopen; **dies on refresh**.  
2. **True new-session keep:** write xy to `localStorage` (clamp on restore). FR/ANPR do **not** have this — adding only on Weapon would be ahead of them.

---

## Recommendation

**Next UI MOB:** match **FR snap** first (cheap, what operators feel).

`MOB-APPLY WEAPON-LIGHTBOX-POS-KEEP-V1`

Exact scope:

- On open: if already has `left`/`top` from a prior drag → **keep**; else center (or FR-style corner — pick center for Weapon modal size).  
- Stop wiping position on every open (undo the ANPR-style reset from DRAG-X).  
- Still clamp to viewport. Cache-bust.  
- No alarm / no retrain / no SOS.

**Not in that MOB:** `localStorage` across sessions. If you want that for **all three** later: `ANALYTICS-SNAP-POS-PERSIST-V1` (FR + ANPR + Weapon together).

---

## Queue after POS-KEEP PASS

| Order | MOB | Why |
|-------|-----|-----|
| Done | `WEAPON-LIGHTBOX-DRAG-X-PARITY-V1` | Drag + X |
| **Next** | `WEAPON-LIGHTBOX-POS-KEEP-V1` | FR-snap reopen keep |
| Then | Colab B **negatives** (cars / bull bars) + retrain B | Kill car=gun FP |
| Then | `WEAPON-ALARM-NEARBY-V1` | HQ WEAPON toast / Ack / blink / PTT — never fake SOS |

---

## One next APPLY

`MOB-APPLY WEAPON-LIGHTBOX-POS-KEEP-V1`
