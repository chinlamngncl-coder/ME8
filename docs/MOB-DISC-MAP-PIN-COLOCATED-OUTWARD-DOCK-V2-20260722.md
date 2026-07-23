# MOB DISC — Map pin V1 FAIL: Chin popup still covers kk (root cause found)

**Status:** APPLIED — `MAP-PIN-COLOCATED-OUTWARD-DOCK-V2` (2026-07-22). Operator verify pending.  
**Trigger:** Operator screenshot after `MAP-PIN-COLOCATED-OUTWARD-DOCK-V1` — click **Chin** → big panel still opens **to the right** of Chin dot; **kk pin covered**. Click kk still OK.  
**Search:** `single popup`, `PIN_POPUP_DOCK_SLOTS[1]`, `clusterOpenPinCamIds`, `colocatedMapClusterForCam`  
**Related:** `MOB-APPLIED-MAP-PIN-COLOCATED-OUTWARD-DOCK-V1` (FAIL)

---

## We see it — same FAIL

Your screenshot: Chin dot + label, video panel **docked on the right** (arrow on left edge of panel). kk is **under / behind** that panel to the right.

**V1 did not fix the case you test** — click **one** pin (Chin only open).

---

## Plain English — why V1 failed

| What you do | What code thinks | What happens |
|-------------|------------------|--------------|
| Click **Chin** only | “**1** open popup” | Rules for **single** pin → **always open panel on the RIGHT** |
| kk not open yet | kk **ignored** for dock math | Chin panel grows **toward kk** → **covers kk dot** |
| Click **kk** | kk on the **right** side of pair | Panel opens **more right** → Chin dot on **left** still visible ✓ |

**V1 only fixed sort order when TWO popups are open at once.**  
Your daily test is **one click → one popup** — that path still uses **right dock**.

---

## Code proof (why)

When only Chin popup is open:

```
clusterOpenPinCamIds([chin])  →  [[chin]]     ← one cluster, length 1
assignClusterDockPlans([chin]) →  side: 'right'   ← PIN_POPUP_DOCK_SLOTS[1]
```

There **used** to be a second pass: “Chin is in a **2-cam GPS cluster** with kk → dock outward.”  
That pass is **missing** from today’s `runColocatedPinPopupDockLayout` in `index.html`.

So V1’s screen-X sort **never runs** for your click — only the **single-pin right dock** runs.

---

## What PASS looks like

| Test | Pass |
|------|------|
| Click **Chin** (kk not open) | Panel opens **away from kk** — kk dot **visible and clickable** |
| Click **kk** | Panel opens away from Chin — Chin dot visible |
| **Open All** (both open) | Two panels **beside** dots, neither covers partner dot |
| No map-edge fan exile | Panels stay near pins (not ±420px) |

Visual for Chin left, kk right:

```
PASS:
[Chin panel] 🟠Chin   🟠kk        ← Chin panel LEFT of Chin dot

FAIL (today):
🟠Chin [Chin panel──────]  (kk hidden)
```

---

## Recommended MOB — V2 (one fix, targeted)

**Name:** `MAP-PIN-COLOCATED-OUTWARD-DOCK-V2`

### In scope

1. **`outwardDockSideForColocatedCam(camId)`** — if GPS cluster size = 2:
   - After marker spread, compare cam **screen X** to cluster **center X** (or sibling).
   - **Left of center** → dock **`left`**. **Right of center** → dock **`right`**.
   - Works when **only one** popup is open (your Chin click).

2. **`runColocatedPinPopupDockLayout`** — for every **open** popup on a 2-cam cluster, apply outward dock (restore missing mapCluster pass).

3. **`spreadStableColocatedMarkers`** — spread bearings from **same** left/right screen rule (not slot vs lng mismatch).

4. **Single-pin default** — if cam is **not** in a 2-cluster, keep `right` dock as today.

5. Files: `public/index.html` (live map boot), mirror `public/js/dashboard-boot.js`.

### Out of scope

- WVP / FLV / start-video
- Hardcode `chin` / `kk`
- Map-edge fan

### Risk

**Low–medium** — map layout only; test Chin-only click + Open All.

### Verify

| # | Test | Pass |
|---|------|------|
| 1 | **Ctrl+F5** → click **Chin only** → kk visible | ☐ |
| 2 | Click **kk** → Chin visible | ☐ |
| 3 | Open All → both panels outward | ☐ |
| 4 | Chin panel not on wrong side (arrow points at Chin, box not over kk) | ☐ |

---

## Agent pick

**`MAP-PIN-COLOCATED-OUTWARD-DOCK-V2`** — fixes the **single-popup** path V1 missed. Same operator test as your screenshot.

---

## Ask

**`MOB-APPLY MAP-PIN-COLOCATED-OUTWARD-DOCK-V2`**
