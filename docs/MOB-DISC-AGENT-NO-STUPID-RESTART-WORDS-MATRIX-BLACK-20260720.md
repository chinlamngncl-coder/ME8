# MOB DISC — No stupid restart words · matrix popout black after Close-safe

**Date:** 2026-07-20  
**Status:** LOCKED (paper) — agent language + fail diagnosis  
**Related APPLY (already done):** `POPOUT-CLOSE-SAFE-V1`  
**Operator anger:** Agent said “restart lab console” — operator does not understand that phrase and should never be given it.

---

## Plain English (for you)

1. **You already restarted the right thing.**  
   Double-clicking **`LAB-CONSOLE-START.bat`** already runs **`RESTART-FLEET.bat`**. That **is** the Fleet / desk server restart.  
   You do **not** need a second mysterious restart. You do **not** need “restart Fleet too.”

2. **Black matrix popout is not your fault.**  
   After `POPOUT-CLOSE-SAFE-V1`, matrix Close was fixed to not kill the wall — but the popout picture path likely **regressed**. That is an **agent bug**, not “you forgot a step.”

3. **What you do now:**  
   Hard refresh the main desk once → Soft Open / play so panels are Live → open matrix again.  
   If matrix is still black: say **FAIL matrix black**. Do not hunt bats.

---

## Agent rule (LOCKED) — restart language

| Forbidden | Required instead |
|-----------|------------------|
| “restart lab console” | **`RESTART-FLEET.bat`** (double-click) — or **nothing** if page-only change |
| “restart UbitronC2” alone | Same bat, or “I can’t — you do it” |
| “restart Fleet too?” after they already ran Lab Console Start | **Never.** Lab Console Start **=** Fleet restart |
| Extra homework after one restart | Agent diagnoses; operator only **refresh once / pass / fail** |

**Facts:**

- `LAB-CONSOLE-START.bat` → stops service if needed → **`call RESTART-FLEET.bat`**. One click chain.
- Page-only edits (`matrix.html`, `live.html`) → often **hard refresh** is enough; do not invent a second bat.
- Server edits (`lib/liveViewers.js`, `server.js`) → **one** `RESTART-FLEET.bat` (or Lab Console Start). Done once.

Also see: `MOB-DISC-OPERATOR-WHAT-IS-UBITRONC2-RESTART.md`.

---

## Why matrix can be black after Close-safe (agent diagnosis)

`POPOUT-CLOSE-SAFE-V1` changed matrix surface to **`matrix-popout`** (good for Close).

Likely fail:

1. Popout listens for `video-stream-ready` and **drops** events unless `surface === matrix-popout`.
2. Parent wall may already be live as **`ops`**. Opener FLV URL should copy the picture — if that URL miss fails, matrix asks `start-video` as `matrix-popout`.
3. If ready comes back tagged wrong / opener FLV miss / parent not Live yet → **black / “No live video”**.

So: Close-safe goal was right; **picture path broke**. Fix needs a **named MOB-APPLY**, not more restarts.

---

## One next APPLY (when you order it)

**`POPOUT-MATRIX-FLV-READY-ACCEPT-V1`**

- Keep Close-safe surfaces (`matrix-popout` / `live-popout`) so Close does **not** stop wall.
- Fix picture: matrix/live popout must show FLV when parent wall is Live (opener URL and/or accept ready for that cam without killing Close-safe).
- No second restart ritual in the APPLY note — say **`RESTART-FLEET.bat` once** only if server file touched; else **hard refresh**.

---

## One line

**Lab Console Start already restarts Fleet. Matrix black = Close-safe regression. Say `MOB-APPLY POPOUT-MATRIX-FLV-READY-ACCEPT-V1` when you want the picture fix — do not restart again for me.**
