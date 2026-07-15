# MOB DISC — What to do now (operator · plain language)

**Status:** DISC 2026-07-11  
**For:** After `mob-fr-6tile-grid-ui` + `mob-fr-rail-alert-shell`  
**You said:** “I have no idea what you are talking about.” — this doc fixes that.

---

## In one sentence

We only changed the **Face recognition** screen (Analytics tab). **Map, live wall, PTT, SOS are untouched.** Your job: **5-minute look** → reply **PASS** or **FAIL** (or **SKIP** if you are not testing FR today).

---

## Do you need to do anything?

| Your situation | What to do |
|----------------|------------|
| **Using FR / face watch today** | Do the **5-minute test** below → reply PASS or FAIL |
| **Not using FR today** | Reply **`SKIP checkpoint`** — we pause Act 1 until you test later |
| **Something already broken** (wall, PTT, SOS) | Reply **`FAIL`** + what broke — **do not** blame FR unless it started after today’s refresh |

**Nothing is required on map, command wall, or PTT for this checkpoint.**

---

## 5-minute test (only if you open Analytics → Face recognition)

### Step 1 — Refresh

1. Run **`RESTART-FLEET.bat`** (or your usual fleet restart).
2. Open the dashboard in the browser.
3. **Hard refresh:** `Ctrl + Shift + R` (clears old JavaScript).

### Step 2 — Face screen layout

1. Go to **Analytics** → **Face recognition**.
2. You should see:
   - **6 video boxes** (not 4) in a 3×2 grid  
   - **Watch roster** underneath (Chin, kk, etc.)  
   - **Snapshot column** on the right (16 small boxes)

**PASS look:** 6 tiles, roster works, Start watch / Stop watch buttons there.  
**FAIL:** Still 4 tiles only, or page errors, or blank screen.

### Step 3 — Watch (optional but good)

1. Tick 1–2 online BWCs → **Start watch**.
2. Wait ~10–20 s — video should appear in a tile.
3. Press **Stop watch**.

**PASS:** Video starts and stops.  
**FAIL:** No video when it worked before, or browser console full of errors.

### Step 4 — Alarm look (only if you get a real face match)

*Skip this step if you have no watchlist hit in the lab.*

When a **watchlist match** happens:

| Old way (months ago) | New way (today’s MOB) |
|----------------------|------------------------|
| Big red box covered the screen | **Small panel bottom-right** + red bar at **top** |
| | Snapshot on the right shows **MATCH** + name + % |

Check:

1. Red **strip at top** of page still appears.
2. **Bottom-right panel** opens with photos and **Ack / Dismiss** buttons.
3. You can still **click the map** behind the panel (not locked out).

Press **Ack** or **Dismiss** — top strip and panel should go away.

**PASS:** You see the alert and can Ack without the whole app freezing.  
**FAIL:** No alert at all when match used to work, or Ack does nothing.

---

## What to reply in chat (copy one line)

```text
CHECKPOINT PASS
```

```text
CHECKPOINT FAIL — [e.g. still 4 tiles / Start watch broken / Ack broken / wall broke]
```

```text
SKIP checkpoint — not testing FR today
```

That is all we need from you.

---

## What we did NOT change (so you don’t worry)

| Still the same | Not touched |
|----------------|-------------|
| Live command wall | `video-wall.js` |
| Map pins / live on map | `fleet-ui.js` |
| PTT hold-to-talk | `pttServer.js`, `sipServer.js` |
| SOS banner / ledger | SOS pipeline |
| Settings · server config | Baseline core |

FR work lives in **Analytics → Face recognition** only.

---

## If FAIL — what happens next

| Problem | We do |
|---------|--------|
| 6 tiles / roster / watch broken | **One fix** in `fr-live-watch.js` — or RESTORE if bad |
| Alarm drawer confusing | **Revert MOB** — bring back big red modal **and** keep drawer (your choice) |
| Wall / PTT / SOS broke | **RESTORE baseline first** — not an FR patch |

We **do not** stack fixes. One thing at a time.

---

## What comes after you PASS (not your job yet)

| Next MOB (agent, when you say APPLY) | What it is |
|--------------------------------------|------------|
| `mob-fr-alert-drawer-shell` | Prettier alert panel layout (still no live video in panel) |
| `mob-fr-red-toast-shell` | Red message strip on hit (design shell) |

**You do not run these.** You only say `MOB-APPLY …` when you want the next step.

---

## Stability rule (your reminder)

> Months of stable wall / PTT / SOS — don’t break it.

Agent must say **risk first** before any MOB that touches core files.  
Technical detail: `MOB-DISC-FR-STABILITY-GUARD.md` (for agent, not daily reading).

---

## Bottom line

| Question | Answer |
|----------|--------|
| What do you want me to do? | **Hard refresh → open Face recognition → 5 min look → PASS / FAIL / SKIP** |
| Must I test face match alarm? | **Only if you can trigger one** — otherwise skip step 4 |
| Did you break the wall? | **We didn’t edit wall code** — if wall broke, say FAIL and we RESTORE |
| What if I’m busy? | Reply **`SKIP checkpoint`** |
