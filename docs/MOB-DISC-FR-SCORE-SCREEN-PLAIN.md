# MOB DISC — Your Score screen (plain English) + what next

**Status:** DISC only — **no code, no APPLY**  
**Date:** 2026-07-14  
**Trigger:** Operator angry — screen full of raw lines; said no real snapshot; wants clear next step, not tech talk.

---

## What your screen said (human words)

You pressed **Score vs last snap**. Three ideas were on that card:

| What it tried to say | Your number | Plain meaning |
|----------------------|-------------|---------------|
| **Saved Watchlist face vs live crop** | **−4.3%** | **Broken / useless.** This is not “almost a match.” The saved fingerprint and the live face are not talking properly. |
| **Pass line** | **70%** | Still the locked bar. Under 70 = fail. |
| **Re-read enroll photo vs live** | **66.3%** | Closer to real, but **still under 70** — not good enough. |
| **Saved vs re-read enroll** | about the same | The photo on file is fine; the problem is match strength / wrong live picture. |

**Bottom line for you:**  
**Fail.** Even the better line (**66%**) does **not** clear **70%**.  
The **−4%** line means “don’t trust the saved fingerprint path until we fix it” — not that your face is −4% human.

---

## “I didn’t even snapshot”

If you **did not** get a clear live face on Recent **before** clicking Score, the tool may have scored against an **old or wrong** little face file on the server.

**Correct test order (only clicks):**

1. Face live → Start watch → **your face clearly on a tile** until a face appears on **Recent**.  
2. **Then** Watchlist → open the person → **Score vs last snap**.  
3. Read the **middle** number that says something like “Fresh enroll ↔ live: **XX%**”. That is the one that matters most tonight.

If Recent never showed your face, **stop** — tell me “no snap on Recent.” Don’t keep scoring.

---

## What we are **not** doing

- No more raw log paste as the answer.  
- No “buffalo / ONNX / dims” as the operator path.  
- **No** moving the match slider down. Bar stays **70%**.

---

## Honest status

| Question | Answer |
|----------|--------|
| Did the stronger face engine fix it? | **No** — still under 70 (66% on the better line). |
| Is −4% a real “match score”? | **No** — treat as **broken saved fingerprint** until Watchlist fingerprints are rebuilt **after** restart, then score again on a **fresh** Recent face. |
| Ship-ready match? | **No.** |

---

## Next MOB (pick one — you name APPLY later)

### Option A — Clean retest (no new feature)

1. Restart Fleet once.  
2. Watchlist → **Re-embed gallery** (the button — rebuilds fingerprints).  
3. Live → **real** face on Recent.  
4. **Score vs last snap** again.  
5. Send only: **the percent** (and PASS if ≥70 / FAIL if not).

### Option B — Next product fix (if A still fails under 70)

```text
MOB-APPLY mob-fr-enroll-from-bwc-still
```

**Plain:** enroll / update the person using a **bodycam face photo**, not only an ID photo — same camera family as live.  
(Many systems need this when ID photo vs bodycam never clears a hard bar.)

### Option C — If A shows −4% again after Re-embed + fresh snap

Then it’s a **bug** in “saved fingerprint vs live,” not your face. Next named fix would be path-align — I’ll write that in plain clicks when you say A failed again.

---

## What I need from you (one line)

Either:

- **“no snap on Recent”** — we fix the test path first, or  
- **“retested: XX%”** after Re-embed + real snap, or  
- **`MOB-APPLY mob-fr-enroll-from-bwc-still`** if you want the BWC enroll path next.

No code in the reply. No waste vocabulary.
