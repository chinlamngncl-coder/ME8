# MOB DISC — Task 2.3 PTZ AR: how to test (plain English)

**Date:** 2026-07-25  
**Status:** DISC — **LOCKED**  
**Task:** Phase 2 **2.3** PTZ AR split  
**APPLIED:** `MOB-APPLIED-TACTICAL-PTZ-AR-SPLIT-V1-20260725.md`

---

## Short answer

You do **not** need a PTZ camera to say **PASS** on 2.3 for desk smoke.

**PASS without PTZ:**

1. **Ctrl+F5**  
2. Open **Tactical**  
3. Click **PTZ AR split**  
4. You should see: **map on the left**, **a video/AR panel on the right**  
5. Click **Close AR** — map goes full width again  
6. Open a BWC on Ops as usual — **if video still works like before → PASS**

That proves the split UI did not break the lab.

---

## What each piece is (no jargon)

| What you see | Meaning |
|--------------|---------|
| **Left** | Same Tactical map you already use |
| **Right** | New “AR” pane for a **roof / overview PTZ** live picture + glass pins |
| **PTZ** | A motorized camera that can pan/tilt/zoom and store **presets** (saved view angles like “North Gate”) |
| **Lock preset** | Tell the system: “camera is now looking at that saved angle — show AR pins” |
| **Pan away** | If you move the camera by hand, pins **hide** (picture no longer matches the pins) |

Without a PTZ, the right pane may say **No ONVIF PTZ cams** / presets empty / Live won’t paint a roof cam. **That is OK** for this PASS.

---

## What you cannot test until you get a PTZ

These need a real ONVIF PTZ with presets registered in Fixed cams:

| Step | Needs PTZ? |
|------|------------|
| Split open (map left / panel right) | **No** |
| Close AR | **No** |
| Ops BWC video still works | **No** |
| Pick roof PTZ + load presets | **Yes** |
| **Lock preset** → pins appear on the video | **Yes** (+ pins fed in — see below) |
| Pan pad → pins disappear | **Yes** |

When you get a PTZ later:

1. Register it as a **fixed cam** (ONVIF, PTZ enabled) in Settings / Fixed cams  
2. Tactical → **PTZ AR split** → choose that cam → **Live**  
3. Pick a preset → **Lock preset**  
4. (Engineer / later UI) pins with `uv_x` / `uv_y` for that preset — today via console:  
   `TacticalAr.setPins([{ name: 'Gate', uv_x: 0.4, uv_y: 0.5, presetToken: '…' }])`  
5. Move with the small pad → pins should hide  

**Do not** delay 2.3 PASS waiting for that PTZ.

---

## Locked desk PASS / FAIL

| Result | Say |
|--------|-----|
| Split opens (left map / right panel), Close AR works, BWC video still OK | **PASS** |
| Tactical blank, crash, or BWC video broken after this change | **FAIL** |

Agent must **not** ask you to buy/wire a PTZ just to PASS 2.3.

---

## After PASS

Phase 2 Task 2.3 done → Phase 2 complete.  
Phase **3** stays paused until you open it.
