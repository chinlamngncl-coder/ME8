# MOB DISC — Operator steps: which bat · close all? · pin-first test

**Date:** 2026-07-21 ~00:54  
**Status:** DISC only — operator how-to (no code)  
**After:** `PIN-CLICK-STARTS-WALL-THEN-MIRROR-V1` (needs Fleet reload so `server.js` capabilities load)

---

## Short answers

| Your question | Answer |
|---------------|--------|
| Which name / which file? | **`LAB-CONSOLE-START.bat`** in the ME8 folder (the one already open in your IDE). |
| Close everything first? | **Close the browser dashboard tab** (or the whole browser window for this lab). You do **not** need to close Cursor. |
| Just click something and it restarts? | **No.** Hard refresh alone does **not** reload `server.js`. You must run the bat once. |
| Does the bat restart Fleet? | **Yes.** `LAB-CONSOLE-START.bat` stops the Windows service if needed, then calls **`RESTART-FLEET.bat`**. One double-click is enough. |

Ignore other bats for this test (ship packs, baseline folders, Test 2, etc.).

---

## Step by step (do only these)

### 1) Stop live on the wall (so wall is Idle)

In the dashboard (if still open):

- Stop any wall panels that say **Live** (Chin / kk / others), **or** close that browser tab entirely.

You want the video wall **Idle** before the pin-first click. If the tab is closed, skip this — after restart the wall starts Idle.

### 2) Run **one** bat

1. Open folder: `C:\Users\user\Desktop\Enterprise Mobility\ME8`  
2. Double-click: **`LAB-CONSOLE-START.bat`**  
3. If Windows asks for Administrator to stop **UbitronC2** → Allow.  
4. Wait until the lab console finishes starting (black/console window settles; dashboard URL available as usual).

Do **not** also run `RESTART-FLEET.bat` separately — the lab console bat already calls it.

### 3) Open dashboard fresh

1. Open the lab dashboard in the browser (same way you always do — your lab LAN IP, **not** a `172.…` address).  
2. **Hard refresh once:** `Ctrl + Shift + R`  
3. Log in if asked.

### 4) Pin-first test (the real check)

1. Confirm wall panels are **Idle** (no Live picture yet).  
2. On the **map**, click **one pin only** (e.g. the orange **Chin** marker — or any other device pin).  
3. Do **not** click the wall panel Play first.

### 5) What PASS looks like

| Expect | FAIL if |
|--------|---------|
| That cam’s **wall panel** starts Live (picture) | Wall stays Idle forever |
| **Pin popup** shows the **same** picture after a short “Live streaming…” | Pin stays black unless you clicked the panel first |

Then say **PASS** or **FAIL** (and which line failed).

---

## What you can ignore for this test

- Fit pins / Singapore search / Pin Stack UI  
- kk dead / BWC light (separate issue — not this MOB’s pass bar)  
- Dock jump (separate — not this MOB)  
- Any bat inside `baseline\`, `ship-build-test\`, or customer pack folders  

---

## Bottom line

**Close the old dashboard tab → double-click `LAB-CONSOLE-START.bat` once → hard refresh → wall Idle → click one map pin only.**  
That is the whole operator path.
