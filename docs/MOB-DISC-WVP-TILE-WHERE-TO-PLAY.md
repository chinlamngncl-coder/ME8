# MOB DISC — Where to Play / what you do (WVP lab tiles)

**Status:** LOCKED operator plain English — 2026-07-14  
**Search:** `where play`, `lab panel`, `direct-zlm`, `what do I click`

---

## Where to Play

**On the main Fleet dashboard** after you login:

`http://192.168.1.38:3988` → map / ops screen as usual.

Bottom-right floating box titled:

**Lab · WVP two tiles**

- **Tile A** / **Tile B** = the two pictures  
- **Play A** / **Play B** = start that picture  
- **Stop A** / **Stop B** = stop  

That is the player. **Not** the Chinese WVP website. **Not** Open All. **Not** a separate “MVP” page.

(There is still an old lab HTML page `/test-wvp-tile.html` — **ignore it** for this prove. Use the dashboard panel only.)

---

## What you are expected to do (only this)

1. Cams on WVP port **5061** (for this lab).  
2. Hard refresh the dashboard once.  
3. Click **Refresh cams** if the lists look empty.  
4. Click **Play A** (and **Play B** if testing two).  
5. Look at the **picture**. Say **PASS** or **FAIL**.

That’s it.

You do **not** open DevTools.  
You do **not** read server logs.  
You do **not** time with a phone or put OSD for us.  
You do **not** “check CORS” or paste URLs.

---

## What “the log” means (if we mention it)

The **small dark text area inside the same lab panel** (under the two tiles).  
Not a file. Not Cursor. Not WVP admin.

If Play works, you may see a line like `direct-zlm http://192.168.1.38/...` — **optional**.  
If you don’t look at it: **ignore it.** Your job is still only picture → PASS/FAIL.

Agent may read that panel text or server logs **without asking you to**.

---

## PASS / FAIL

| You see | You say |
|---------|---------|
| Live picture on Tile A/B, feels OK enough to keep going | **PASS** |
| No picture, spinner forever, red player err, or still painfully late | **FAIL** |

Agent owns why. You only report what you see.

---

## Related APPLY (so far)

- Two tiles: `mob-track-b2-two-wvp-tiles`  
- Direct ZLM (speed try): `mob-wvp-tile-direct-flv`  
- Latency plan: `docs/MOB-DISC-ZLM-LATENCY-HANDOVER.md`
