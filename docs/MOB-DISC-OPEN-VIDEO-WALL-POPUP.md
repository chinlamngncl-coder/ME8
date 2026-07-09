# MOB DISC — “Open video wall” does nothing (Display 2)

**Status:** **APPLIED** 2026-07-09 — success/error banners + scroll-into-view on Display layout pop-outs.

---

## What it is **supposed** to open

**Not** the Live Wall tab in this same browser window.

**Display 2 → Open video wall** is meant to:

1. Open a **new browser window** (pop-out) — `command-wall.html`
2. That window is the **multi-panel live video wall** (9/16 tiles, drag devices from roster)
3. You **drag that window to monitor 2** (or TV), then F11 fullscreen
4. If you ticked **dispatch groups** below, the URL includes `autofill=1` so online units from those groups fill the wall

Same pattern as **Open map** and **Open status board** — each display = **separate pop-out window** for extended desktop / TV wall habit (Milestone “floating window”, Avigilon “new viewing window”).

---

## Why you see nothing (most likely)

| Cause | What happens |
|-------|----------------|
| **Pop-up blocked** | Browser silently blocks `window.open` → **no window**. Code only writes a small status line if blocked — easy to miss. |
| **Window opened behind** | Check taskbar for another Chrome/Edge window titled Command Wall |
| **Second monitor** | Window may have opened on extended display |
| **Wrong expectation** | You expected **Command Wall → Live wall** tab here — button does **not** do that |
| **Pop-up allowed but instant close** | Rare — login redirect on pop-out; check if `command-wall.html` flashes |

**Bench:** allow pop-ups for `http://192.168.1.38:3888` (your operator URL host), click again, watch taskbar.

---

## What industry does vs what we did

| Industry | Us today |
|----------|----------|
| “Floating window” / “New window” in docs | Button says **Open video wall** — does not say **new window** |
| Pop-up blocked → clear modal | Small `dr-status` text only |
| Single-monitor lab | No fallback “open Live wall in this tab” |

---

## DISC verdict — two problems

### 1. Communication (naming)

Button should say it opens a **window**, e.g. **Open video wall window** or **Pop out video wall** — not imply the embedded tab changes.

### 2. Behaviour (UX gap)

| Fix MOB | What |
|---------|------|
| `mob-display-room-popup-feedback` | On success: green status “Video wall window opened — move to display 2”. On block: **visible** banner + link “Allow pop-ups” |
| `mob-display-room-live-wall-fallback` | If `window.open` fails → offer **Show Live wall** (same tab, `CommandWall.showPanel('live')`) for single-monitor bench |

**Not a missing feature** — pop-out path exists; **feedback and fallback** are missing.

---

## Quick test (you, now)

1. Command Wall → Display layout → Display 2 → **Open video wall**
2. Browser address bar → pop-up blocked icon? → **Always allow**
3. Click again → new window **Command Wall**?
4. Or use top tab **Command Wall → Live wall** for same-window video (monitor 1 habit)

---

## Apply (when you want)

`MOB-APPLY mob-display-room-popup-feedback`  
Optional: bundle fallback with same MOB.

Separate: `mob-a5-labels-enterprise-neutral` (preset naming).
