# MOB DISC — FR soak PASS · “PTT” words · half-face still · FR group standby

**Status:** DISC locked 2026-07-10 — soak **PASS** (core) · language + product gaps locked  
**Search:** FR SOAK PASS, PTT, beep, Alert field, SOS PTT group, standby, half face  
**Related:** `MOB-DISC-FR-CONSOLIDATE-STABILITY-FREEZE.md`, `MOB-DISC-FR-ALERT-UX-SOS-VS-FR-REPORT.md`, `MOB-DISC-FR-SNAP-FULL-FACE-OR-BUST.md`

---

## Soak result (locked)

**FR SOAK PASS** for stability of the stack you care about:

| Check | Result |
|-------|--------|
| Live | **PASS** |
| Open All | **PASS** |
| SOS | **PASS** |
| PTT (talk / channel) | **PASS** |
| PTT grouping during SOS | **PASS** |
| Field **beep** (Alert field) | **PASS** that it fires — **FAIL quality** (choppy) |
| Face crop on rolling | **FAIL** — still **half face** |
| FR alarm actions | Only **Ack / Dismiss / Alert field** today |

Freeze can lift for **one** named MOB when you choose — not a pile-on.

---

## What “PTT” meant — two different things (locked)

Agent soak row “PTT” and your product language were **not** the same. Fix the words:

| Phrase | What it actually is | Your word? |
|--------|---------------------|------------|
| **Alert field** | Short **beep/cue** (and soft MESSAGE) to the **catching BWC** over the PTT **audio path** | You hear a **beep** — **not** “start a PTT group” |
| **PTT** (ops / SOS) | Hold-to-talk / channel; **SOS PTT group** = put units on **standby radio team** | **Your** meaning of PTT |
| Soak “PTT passed” | Real **talk / SOS grouping** still works after FR MOBs | **PASS** — good |

So: when the agent said “PTT” next to FR Alert field, that meant **beep on the wire**, **not** SOS-style group activate.

**Going forward in discs/UI copy:**

- Say **Alert field** / **field beep** for the catch cue.  
- Say **FR standby group** / **FR response PTT** (or similar) only if we build SOS-like grouping for a face hit.  
- Do **not** call the beep “PTT” in operator-facing text.

---

## Your FR “PTT” product intent (accepted for disc)

> My meaning of PTT is to **activate a group like SOS** to call all on **standby**.

| Today FR alarm | Missing (your intent) |
|----------------|------------------------|
| Ack | Close interrupt |
| Dismiss | Close without weight |
| Alert field | Beep **one** catching BWC |

**Not present:** “Raise FR hit → build / push a **standby PTT group** (nearby / assigned units) like SOS response team.”

### Logic (same family as SOS, separate door — already AGREED)

```
SOS:  distress → banner → response PTT team → ack → SOS report
FR:   watchlist hit → bar → (optional) FR standby group → ack → FR sighting report later
```

Do **not** reuse SOS ack form.  
Do **not** pretend Alert field beep = group standby.

**Suggested later MOB name:** `mob-fr-standby-ptt-group` (DISC only until soak + nonblocking + crop are settled).

Risk: high (PTT / SOS-adjacent). One MOB, checkpoint, no stack with crop/beep.

---

## Half face — still open

`mob-fr-reject-clipped-face` + `mob-fr-snap-bust-crop` are on disk; **operator still sees half face**.

| Possible | Action |
|----------|--------|
| Sidecar not restarted after bust MOB | Restart fleet + sidecar, re-check |
| Bust pad still too tight / composition gate too weak | Follow-on MOB after you confirm restart |
| Detector box half-in-frame that still “passes” | Stricter composition / skip more |

**Do not** keep shipping ugly half-face as OK. Next crop MOB only after you confirm sidecar was up with bust code.

---

## Suggested order (when you leave freeze — one at a time)

| # | MOB | Why |
|---|-----|-----|
| 1 | `mob-fr-hq-alert-nonblocking` | Leave FR page with hit up |
| 2 | `mob-fr-field-alert-smooth-cue` | Fix **choppy beep** |
| 3 | **`mob-fr-snap-half-face-strict`** | Kill remaining half-face (stricter than bust v1) — **APPLY code below** |
| 4 | `mob-fr-standby-ptt-group` | **Your** PTT = SOS-like standby — **DISC only**, after crop/beep/nonblocking |

### Half-face — APPLY code (copy/paste when ready)

```text
MOB-APPLY mob-fr-snap-half-face-strict
```

**Scope (one MOB):** `fr-sidecar/app.py` (+ poller skip if new error code)  
- Stronger edge reject (larger margin)  
- Larger bust / full-face pad defaults  
- If pad clamps to still-tight / half composition → **skip** (no ugly rail tile)  
- Embedding unchanged  

**Not this MOB:** standby PTT group, smooth beep, nonblocking bar.

### Standby PTT group — parked

`mob-fr-standby-ptt-group` = FR hit → SOS-like **standby radio team** (not Alert field beep).  
High risk (PTT/SOS-adjacent). **No APPLY** until half-face + nonblocking + smooth cue are settled. Detail disc when you open that MOB.

---

## Bottom line

| Question | Answer |
|----------|--------|
| Soak? | **PASS** live / Open All / SOS / PTT / SOS PTT group |
| Beep? | Works, **choppy** |
| Agent “PTT” on Alert field? | Meant **beep**, not group |
| Your PTT? | **Standby group like SOS** — not built; disc locked |
| Half face? | **Still FAIL** — not done |
| Alarm buttons today? | Ack · Dismiss · Alert field only |

No APPLY from this disc. Reply one named MOB when ready.
