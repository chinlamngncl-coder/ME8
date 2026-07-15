# MOB DISC — Scale live (many users watching many cameras)

**Status:** talk only — **no apply**  
**Date:** 2026-07-14  
**Search:** `Track B`, `scale live`, `many viewers`

---

## Plain goal

Super-admin and many users must watch **many** live cameras.  
Our normal 8-cam wall + FFmpeg **cannot** grow into that.

So we use the same idea as the Chinese platforms:

- **WVP** = camera desk (who is online, start picture)  
- **ZLM** = media box (one picture → many people can watch it)  
- **Our Fleet screen** = the TV wall users actually open (our login, our look)

PTT / SOS / normal 8-cam ops stay on the **old** wall. Do not mix.

**Hard rule:** Do **not** push ZLM into the old FFmpeg wall path again. That already broke Open All.

**2026-07-14:** Step 1 PASS (`mob-track-b0-quiet-ops`). Step 2 PASS (`mob-track-b1-tile-on-dashboard` + FLV URL / auth / G.711 fixes) — lock `docs/MOB-DISC-TRACK-B1-WVP-TILE-PASS.md`. **Next:** Step 3 many boxes — `docs/MOB-DISC-TRACK-B-WHATS-NEXT.md`.

---

## What we do (one line each — no menu)

**Step 1 — Fix the normal wall first**  
Turn off the lab ZLM side noise that was fighting Open All.  
Prove Chin + kk Open All works again.  
*(Old bad name: “quiet ops” — just means: make normal wall calm and working.)*

**Step 2 — One live picture inside our own page**  
Take the same fast Play you already saw in WVP.  
Show **one** camera that fast **inside Fleet** (our URL, our login).  
Not the Chinese WVP website for the customer.  
*(Old bad name: “one tile WVP” — just means: one box of video on our screen.)*

**Step 3 — Many boxes**  
Same idea, more cameras on one scale wall.

**Step 4 — Who may watch**  
Super-admin / assigned users only.

**Step 5 — Customer pack later**  
Ship without “install Docker yourself.” Separate work.

---

## What you do / what I do

| You | Me (when you say apply — not now) |
|-----|-------------------------------------|
| Confirm normal wall Open All OK after step 1 | Turn off lab ZLM side noise for ops |
| Point one GB cam at WVP for step 2 test | Add one video box on Fleet that plays that stream |
| Say pass/fail in plain words | Next step only after pass |

**No apply in this message.** You said remember — obeyed.

---

## Forbidden

- Stuffing ZLM into Track A / pool FFmpeg again  
- Option lists and secret MOB nicknames without plain English  
- Skipping step 1 while wall Open All is still broken  

---

## Related (old jargon map — ignore names, use English above)

| Bad old name | Means |
|--------------|--------|
| quiet ops / b0 | Fix normal wall; turn off lab ZLM noise |
| one tile wvp / b1 | One fast live picture inside Fleet |
| Track A | Normal 8-cam ops wall |
| Track B | Scale live for many users |
