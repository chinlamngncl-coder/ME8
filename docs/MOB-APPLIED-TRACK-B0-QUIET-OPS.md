# MOB — quiet normal wall (lab ZLM side off)

**Status:** APPLIED 2026-07-14 — `mob-track-b0-quiet-ops`  
**Change:** `.env` → `FM_LAB_ZLM=0` only  

**Not this MOB:** pool FFmpeg edits (fast-lab already reverted earlier).

**Why:** Lab ZLM auto side-relay was still on and fighting Open All. This turns that lab path off so the normal wall can be tested clean.

**You:** `RESTART-FLEET.bat` → hard refresh → **one** Open All test (Chin + kk). No more patches until that result.
