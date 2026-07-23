# MOB DISC — VC Settings: firewall bottom line + swap card order

**Status:** APPLIED 2026-07-22 — awaiting operator PASS/FAIL  
**APPLY:** `MOB-APPLY VC-SETTINGS-FORM-TOP-FW-BORDER-V1`

---

## Plain English

| # | What you want | Truth today |
|---|---------------|-------------|
| 1 | Line under the last Firewall ports row (WebRTC), same as the row above | CSS **removes** last-row border on purpose: `.vc-settings-fw tr:last-child td { border-bottom: none; }` |
| 2 | **Conference service** (edit form) on top; **Current status** + **Firewall ports** side-by-side underneath | Build order in `conference-hub.js`: top-row status+firewall first, form card second |

---

## Target layout (locked)

```
┌─────────────────────────────────────────────┐
│  Conference service   (full width — form)   │
└─────────────────────────────────────────────┘
┌──────────────────────┐ ┌────────────────────┐
│  Current status      │ │  Firewall ports    │
│                      │ │  … WebRTC row      │
│                      │ │  ─────────────  ← line under last row
└──────────────────────┘ └────────────────────┘
```

No content change to fields, readiness checklist, or port numbers — **order + one border** only.

---

## Files (when APPLY)

| File | Change |
|------|--------|
| `public/js/conference-hub.js` | Render **form card first**, then `vc-settings-top-row` (status + firewall) |
| `public/index.html` (CSS) | Keep last firewall row `border-bottom` (remove / override `tr:last-child td { border-bottom: none }`) |
| Cache bust | `conference-hub.js?v=…` |

---

## Recommended MOB

**Name:** `VC-SETTINGS-FORM-TOP-FW-BORDER-V1`

### In scope
1. Swap: Conference service ↑ ; Current status + Firewall ports ↓ (still side-by-side).  
2. Firewall table: visible bottom line under WebRTC (last data row).  

### Out of scope
- TURN / WSS / deploy logic  
- Fit pins / hub Evidence UI  
- LiveKit ports themselves  

### Risk
**Low** — settings page HTML/CSS only.

### PASS later
| # | Check |
|---|--------|
| 1 | Open Video Conference → Settings: **Conference service** is the **first** card |
| 2 | Under it: Current status \| Firewall ports |
| 3 | Firewall: line under WebRTC row matches line under signaling row |

---

## APPLY phrase

**`MOB-APPLY VC-SETTINGS-FORM-TOP-FW-BORDER-V1`**

Until then: disc only — no code.
