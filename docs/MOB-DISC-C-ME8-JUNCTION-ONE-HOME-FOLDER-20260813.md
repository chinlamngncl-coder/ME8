# MOB DISC — One home folder (`C:\ME8`) — restart Fleet / ANPR / FR / Weapon

**Date:** 2026-08-13  
**Audience:** Operator (plain English)  
**Why:** Long Desktop path caused Windows `WinError 206`. Lab uses short junction `C:\ME8`.

---

## Remember this only

**Your home for this product is:**

### `C:\ME8`

Open that folder in Explorer. That is enough.

- Same files as the old Desktop folder (`…\Desktop\Enterprise Mobility\ME8`).
- `C:\ME8` is a **shortcut junction** into that folder — not a second copy.
- You do **not** need to go back to Desktop for normal restarts.
- Desktop folder still works if you open it by habit — same project.

**Do not** hunt inside `anpr-sidecar`, `fr-sidecar`, or `weapon-sidecar` for daily start. Root bats already point there.

---

## How it works (one picture)

1. **Fleet** = main dashboard / Node server (browser UI, video handoff, sockets).
2. **ANPR / FR / Weapon** = separate Python windows (sidecars). Leave each window open while you use that analytics page.
3. Browser talks to Fleet. Fleet talks to sidecars on localhost ports.

Close a sidecar window → that engine dies. Fleet can stay up.

---

## Restart — from `C:\ME8` only

### A) Restart Fleet (dashboard)

1. Close the old Fleet / Node window (or stop the Ubitron service if you use that).
2. In `C:\ME8`, start Fleet the way you always do for lab, for example:
   - `server.js` / `run.js` via your usual Start script, **or**
   - `START-UBITRON-SERVICE.bat` if that is how this lab runs as a service.
3. Hard refresh the browser once after Fleet is up.

*(If your lab uses a different Fleet bat on the Desktop shortcut, keep using that shortcut — just know the project root is the same as `C:\ME8`.)*

### B) Restart ANPR

1. Close the old ANPR black window (if any).
2. Double-click **`START-ANPR.bat`** in `C:\ME8`.
3. Leave that window open.
4. **Do not** need `START-ANPR-INGEST.bat` for normal lab (native ingest is default).

### C) Restart Face (FR)

1. Close old FR / Face Matching window.
2. Double-click **`START-FACE-MATCHING.bat`** (or **`START-FR.bat`**) in `C:\ME8`.
3. Leave that window open.

### D) Restart Weapon

1. Close old Weapon window.
2. Double-click **`START-WEAPON.bat`** in `C:\ME8` (if present in your tree).
3. Leave that window open.

---

## What you see in `C:\ME8` (your screenshot)

| File | What it is |
|------|------------|
| `START-ANPR.bat` | Plate engine |
| `START-ANPR-INGEST.bat` | Old/extra ingest — skip unless told |
| `START-FR.bat` / `START-FACE-MATCHING.bat` | Face engine |
| `START-UBITRON-SERVICE.bat` | Windows service style Fleet (if you use it) |
| `server.js` / `run.js` | Fleet code — not “extra folders to remember” |

Other `RESTORE-*.ps1` files = rollback tools. Not daily start.

---

## Pin so you never forget

1. Pin **`C:\ME8`** to Quick access in Explorer.
2. Optional: desktop shortcut named **“ME8 HOME”** → `C:\ME8`.
3. Only remember: **open `C:\ME8` → click the START bat you need → leave window open**.

---

## Locked rules (agent)

- Do not tell operator to use WSL `172.x` IPs.
- Do not call WVP `ensurePlay` from ANPR to “fix” ingest (harms concurrent stream base).
- Product face stays **Mobility Axiom**.
- Code edits still need **MOB-APPLY** / go ahead.

---

## Status

Operator home path for lab restarts = **`C:\ME8`**. Old Desktop path is the same tree via junction — not a second product to manage.
