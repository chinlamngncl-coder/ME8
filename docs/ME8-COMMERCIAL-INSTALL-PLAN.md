# ME8 — commercial install method (target)

**MOB DISC:** installation behaviour for commercial SKU  
**Status:** Wave 1 shipped — BUILD bundles dependencies; `SETUP-ME8.bat` starts Fleet  
**Future MOB:** `mob-me8-setup-installer-exe` (optional MSI/Inno wrapper)

---

## Problem (dev-style install)

Early ME8 docs described: copy folder → `npm install` → PowerShell factory script → verify → restart. That is **Node developer workflow**, not commercial software.

Commercial customers and partners expect:

1. Receive media or zip from vendor  
2. Run **one setup** or **one start** action  
3. Open URL in browser  
4. Configure in **Settings**

---

## Target model (three layers)

| Layer | Who | Experience |
|-------|-----|------------|
| **Ship desk** | Ubitron internal | BUILD produces **ready-to-run** folder (deps installed, factory storage, license, verify PASS) |
| **Partner / IT** | Optional on site | Copy folder → **`SETUP-ME8.bat`** → hand off URL + `CUSTOMER-START.txt` |
| **Operator** | Customer | Browser only — [ME8-CUSTOMER-INSTALL.md](./ME8-CUSTOMER-INSTALL.md) |

No `npm`, no PowerShell training, no config file names in any handoff document.

---

## v1 ship (current after MOBs)

```
Ubitron BUILD-ME8-CUSTOMER.ps1
  → staged app + node_modules + factory storage + license
  → VERIFY PASS
  → zip to partner

Partner site
  → unzip to C:\Ubitron-ME8\
  → SETUP-ME8.bat
  → give customer CUSTOMER-START.txt + URL

Customer
  → browser → Settings
```

**Prerequisite:** Node.js runtime on server (same as many Electron/server products) — document as “Windows Server + Node 18+” on **partner** handoff sheet only, or bundle Node in a later MOB.

---

## Later MOB options (pick one for `me8-v1.1` — not required for first ship)

| Option | Partner experience | Effort |
|--------|-------------------|--------|
| **A. SETUP-ME8.bat only** (now) | Double-click start | Done |
| **B. Ship portable Node** in pack | No separate Node install | Medium |
| **C. Inno Setup / MSI** | `Setup-Ubitron-ME8.exe` → Program Files, Start Menu | Medium |
| **D. Windows service** | Install service + auto-start | Higher |

Recommendation for **`me8-v1` lock:** **A + BUILD ships `node_modules`** (already in BUILD). Partner never runs `npm install`.

---

## Out of scope (commercial v1)

- Customer runs Docker / compose  
- Customer runs verify scripts  
- Customer or partner edits bootstrap files  
- Multiple confusing `.bat` names in handoff — use **`SETUP-ME8.bat`** as the single “start product” name; `RESTART-FLEET.bat` remains alias for engineers  

---

## Pass gate (commercial install story)

| # | Check |
|---|--------|
| I1 | Customer/partner docs mention only `SETUP-ME8.bat` + URL + `CUSTOMER-START.txt` |
| I2 | BUILD output includes `node_modules/` — partner does not run `npm install` |
| I3 | Zero bootstrap/config file names in CUSTOMER-START or partner runbook |
| I4 | Ubitron internal doc holds BUILD/VERIFY detail |
| I5 | TLS: default LAN http handoff; HTTPS via IT appendix only; auto trust proxy when operator URL is https |

---

**Internal:** [ME8-INTERNAL-SHIP-DESK.md](./ME8-INTERNAL-SHIP-DESK.md)
