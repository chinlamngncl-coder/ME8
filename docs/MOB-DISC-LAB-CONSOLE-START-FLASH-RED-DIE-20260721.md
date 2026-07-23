# MOB DISC — LAB-CONSOLE-START.bat flashes red and closes in ~1 second

**Date:** 2026-07-21 ~01:03  
**Status:** DISC only — **no APPLY until you order**  
**Operator:** *Double-click LAB-CONSOLE-START.bat → Yes on Admin. Nothing — red words, disappears in 1 second.*

---

## Verdict (one screen)

| Question | Answer |
|----------|--------|
| Did you do something wrong? | **No.** The bat is **broken**. |
| What are the red words? | PowerShell / CMD error from a **bad multi-line command** inside `LAB-CONSOLE-START.bat`. |
| Why does the window vanish? | Script hits `exit` / errorlevel **without `pause`** on that failure path → window closes in ~1s. |
| Are we on an old server because of this? | **No.** Dashboard may still be whatever **UbitronC2** already was. This bat **failed to restart** cleanly. |
| Can agent click Yes for you? | **No.** And even with Yes, this bat’s stop block can still crash before a clean restart. |

---

## What actually breaks (agent reproduced)

Running `LAB-CONSOLE-START.bat` prints roughly:

```text
LAB CONSOLE START
...
^ : The term '^' is not recognized as the name of a cmdlet...
$svc) was unexpected at this time.
```

**Cause:** Lines 15–25 of `LAB-CONSOLE-START.bat` pass a PowerShell `-Command` with bat `^` continuations **inside** the quoted script. PowerShell sees a literal `^`, errors (red), then CMD tries to run the leftover `if (-not $svc)` as CMD → second error → **exit 255** → window gone.

So: **not** “Admin refused only.” The **stop-service block itself is malformed**.

`RESTART-FLEET.bat` (called next) is a different path and **does** `pause` on success/fail when it runs alone. You never got there cleanly when the first block exploded.

---

## What you do **now** (workaround — no code change)

### Option A — recommended (one bat, has pause)

1. Open folder: `C:\Users\user\Desktop\Enterprise Mobility\ME8`  
2. **Right-click** `RESTART-FLEET.bat` → **Run as administrator**  
3. Click **Yes** on UAC  
4. **Read** the black window — it should say service restarted **or** START CANCELLED, and wait for a key (`pause`)  
5. Then browser: `http://192.168.1.38:3988` → **Ctrl+Shift+R**

### Option B — see the red error yourself

1. Press **Win+R** → type `cmd` → Enter  
2. Type:

```text
cd /d "C:\Users\user\Desktop\Enterprise Mobility\ME8"
LAB-CONSOLE-START.bat
```

3. Window **stays open** so you can read the red lines (same `^` bug).  
4. Still use **Option A** to actually restart.

### Do **not** keep double-clicking `LAB-CONSOLE-START.bat`

It will keep flashing and dying until that bat is fixed with an APPLY.

---

## After Option A works — pin test (same as before)

1. Wall Idle  
2. Click **Chin pin only** (not panel first)  
3. PASS/FAIL: wall Live + pin picture + BWC light?

---

## One next APPLY (when you order)

**`MOB-APPLY LAB-CONSOLE-START-FIX-PS1-V1`**

- Replace the broken inline PowerShell `^` block in `LAB-CONSOLE-START.bat` with a small `.ps1` file (or one-line stop) + **`pause` on any failure** so the window never vanishes in 1s.  
- Keep: stop UbitronC2 if running → call `RESTART-FLEET.bat`.

Until then: **use right-click `RESTART-FLEET.bat` → Run as administrator.**

---

## Bottom line

**Red flash + 1s close = broken `LAB-CONSOLE-START.bat`, not you failing Admin.**  
**Workaround: right-click `RESTART-FLEET.bat` → Run as administrator.**  
**Say `MOB-APPLY LAB-CONSOLE-START-FIX-PS1-V1` when you want the bat fixed.**
