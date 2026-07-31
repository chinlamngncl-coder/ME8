# MOB DISC — ANPR Snapshot / Plate lists click jumps to Face (FR)

**Date:** 2026-07-31  
**Status:** **BUG LOCKED** — no code until APPLY  
**Search:** ax-anpr-subnav, ax-hub-nav-btn, showPanel, data-anpr-sub, Plate lists → Face  
**Operator:** Click **Plate lists** or **Snapshot** under ANPR → UI goes to **Face recognition (FR)**. Asking **why** — unified **look** (dark controls), not unified **functions** with FR.  
**Related:** `MOB-DISC-ANPR-PLATE-LISTS-V1-APPLIED.md` · `MOB-DISC-UI-DARK-FORM-CONTROLS-UNIFY-V1-APPLIED.md`

---

## Plain English

1. **You are right.** ANPR sub-tabs must stay inside ANPR. They must **not** open Face / Verify / Watchlist.  
2. **UI unify ≠ function merge.** Dark form controls = paint only. Plate lists = ANPR match lists. Face Watchlist stays faces.  
3. **Why it jumps to FR:** a copy-paste class mistake in the Plate lists MOB — not intentional product logic.

---

## Root cause (exact)

ANPR sub-buttons reused the **same CSS class** as the top Analytics hub nav:

```html
<!-- Top hub (correct) -->
<button class="ax-hub-nav-btn" data-panel="face">…</button>
<button class="ax-hub-nav-btn" data-panel="anpr">…</button>

<!-- ANPR sub-nav (bug) — same class, NO data-panel -->
<button class="ax-hub-nav-btn" data-anpr-sub="snapshot">Snapshot</button>
<button class="ax-hub-nav-btn" data-anpr-sub="lists">Plate lists</button>
```

Hub binder in `analytics-hub.js`:

```js
document.querySelectorAll('.ax-hub-nav-btn').forEach(function (btn) {
  btn.addEventListener('click', function () {
    showPanel(btn.getAttribute('data-panel')); // null on sub-buttons
  });
});
```

`showPanel(null)` → `currentPanel = panel || 'face'` → **Face recognition**.

A second listener calls `showAnprSub(...)`, but the hub handler still runs and wins the panel switch.

**Not** because Plate lists “is FR.” Not because dark-form unify mixed modules.

---

## What was intended vs what broke

| Intent | Actual |
|--------|--------|
| Reuse **look** of hub pills (`.ax-hub-nav-btn` styles) | Reused class → same click selector as top nav |
| Sub-tab only toggles Snapshot / Plate lists | Also fires `showPanel` → Face |

---

## Recommended MOB (one path)

### `ANPR-SUBNAV-STAY-ON-ANPR-V1`

| # | Change |
|---|--------|
| 1 | Give ANPR sub-buttons their **own** class (e.g. `ax-anpr-subnav-btn`) — keep same visual via CSS twin of hub pills |
| 2 | Hub binder: only `.ax-hub-nav` / `[data-panel]` buttons — **never** `.ax-anpr-subnav` |
| 3 | `showPanel` active-state: only top hub `[data-panel]` buttons |
| 4 | Cache-bust `analytics-hub.js` |

**Do not:** merge ANPR into FR · remove Plate lists · change dark form unify.

---

## PASS / FAIL

| Check | PASS |
|-------|------|
| On ANPR → click **Plate lists** | Stay on ANPR; lists panel shows |
| On ANPR → click **Snapshot** | Stay on ANPR; snapshot workspace shows |
| Top nav **Face recognition** | Still opens Face only when clicked |

---

## Operator decide

When ready:

- **`MOB-APPLY ANPR-SUBNAV-STAY-ON-ANPR-V1`**

**No code in this disc.**

---

## Lock record

| Item | Decision |
|------|----------|
| Jump ANPR sub-tab → FR | **Bug** — class/selector collision |
| UI look unify = function unify | **False** |
| Next MOB | **`ANPR-SUBNAV-STAY-ON-ANPR-V1`** |
| Code | **None** until APPLY |
