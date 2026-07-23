# MOB DISC — Localhost YES for PTT / Call / mic

**Date:** 2026-07-18  
**Status:** LOCK — corrects bad “use only LAN IP” operator advice  
**Ask:** Without localhost, no PTT / Call / mic. Is localhost good to go?

---

## Answer

# YES — use localhost on this PC for Ops

**Chrome on the Fleet PC:**

### `http://localhost:3988`

(or `http://127.0.0.1:3988` — same thing)

That is **correct** for PTT, Call, and mic.

---

## Why (one sentence)

Browser blocks microphone on plain HTTP at a LAN IP (`192.168.1.38`).  
`localhost` / `127.0.0.1` are treated as safe → mic works.  
Code already says this (`ptt-mic.js` / `call-mic.js`).

---

## Split (do not mix)

| Who | Address |
|-----|---------|
| **You — Chrome on this PC** | **`http://localhost:3988`** ← PTT / Call / mic |
| **BWC cam settings** | **`192.168.1.38`** ← never localhost on the cam |

---

## What you do

1. Chrome → **`http://localhost:3988`**  
2. If page dead → `RESTART-FLEET.bat` → wait ~15s → open **localhost** again  
3. Allow mic if Chrome asks  
4. Use PTT / Call as usual  

Do **not** switch to `192.168.1.38` in the browser when you need mic.

---

## Agent mistake

Earlier “use only `192.168.1.38:3988`” was **wrong for mic/PTT/Call** on this PC.  
That was for cams / habit — **not** for your Ops browser when you need the microphone.

**One line:** Localhost:3988 is good to go for Ops mic/PTT/Call; cams stay on 192.168.1.38.
