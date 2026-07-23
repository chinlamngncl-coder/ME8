# MOB DISC — What’s next after Fleet INVITE lobotomy PASS (2026-07-20)

**Type:** DISC only — no APPLY / no code  
**Just closed:** Live open + stop for Chin 08 — **lobotomy PASS** (no Fleet INVITE/408; stop not stuck on `invite_in_flight`)

---

## Where you stand (one screen)

| Area | Status |
|------|--------|
| **Live picture** (WVP/ZLM) | Works |
| **Live stop** (no long defer) | PASS tonight |
| **Cold SOS** | Still dead (cam on :5060; Fleet marriage / Alarm on wire unfinished) |
| **Cold PTT** | Still dead |
| **Pin video PTT** | Still dead |
| **Call / other voice** | You skipped — treat as same voice genre until proven |

Picture brain is healthier. **Voice / SOS brain** is still the open product gap.

---

## What is *not* next

- More invite/stop patches for live (unless stop regresses)  
- Frontend gold / pin-mirror edits  
- Ship / TOTP nags  
- Mixing cold SOS + PTT + Call into one giant APPLY  

---

## Next — pick **one** genre (you choose)

### Option A — Cold SOS genre *(recommended if button must work cold)*

**Goal:** Physical Chin SOS (no live) → dashboard alarm banner / `sos-alarm`.

**Why first:** Safety signal; adapter already exists; prior night often had **no Alarm MESSAGE** on proxy when button pressed.

**Operator proof later:** Cam not in live → press SOS → banner. Agent watches proxy + `wvpWebhooks` + fleet log.

**Possible APPLies (named later, one at a time):** prove Alarm on :5060 → adapter → Socket.IO; do not start Fleet video INVITE (already lobotomized).

---

### Option B — PTT genre (cold + pin)

**Goal:** Talk works cold and/or while pin/live picture is up.

**Why hard:** Needs cam on Fleet **29201** and/or finished WVP audio broadcast path. Group-config / wake spam ≠ working talk.

**Operator proof:** Hold PTT cold; then with pin live. Agent checks PTT online + TX/RX / WVP broadcast logs.

---

### Option C — Call hygiene only

**Goal:** Call button with live picture (ops-live).  
You already assumed it won’t work; only pick this if Call is higher priority than cold SOS/PTT.

---

### Option D — Pause product; document / baseline

No new APPLY. Lab runs with **live OK**; voice parked until a focused session.

---

## Suggested order (if no preference)

1. **A — Cold SOS**  
2. **B — PTT** (cold, then pin)  
3. Call only if needed after A/B  

---

## How you start the next piece

Reply with one line, for example:

- `next: cold SOS` → we write a short operator how-to DISC, then you say **MOB-APPLY …** when ready for code  
- `next: PTT`  
- `next: pause`  

**No code until a named MOB-APPLY.**
