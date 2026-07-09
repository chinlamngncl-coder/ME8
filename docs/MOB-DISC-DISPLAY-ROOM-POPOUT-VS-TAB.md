# MOB DISC — Display room: pop-out vs tab-switch (audit)

**Status:** APPLIED 2026-07-09 — `mob-display-room-popout-only` (index + command-wall aligned; Monitor 2–4 pop-out only).

**Trigger:** After `mob-display-room-open-wall-in-tab`, Monitor 2 **Show video wall** only changes tabs — no second window. Centre summary from other entry points also **changes page in the same window**, not a monitor pop-out. Operator feedback: monitor cards are pointless if they do not open displays.

**Verdict:** You are right. The last MOB fixed the wrong problem for the wrong surface. **Display room monitor cards must be pop-out launchers only.** Tab switching belongs elsewhere.

---

## What Display room is supposed to be

| Concept | Industry parallel |
|---------|-------------------|
| **Control room layout** | Milestone Smart Wall “send to monitor”, Genetec floating tile wall |
| **Monitor 1–4 cards** | Physical HDMI outputs — each card = **open that thing on another screen** |
| **Activate layout** | One click: Ops stays on this PC; wall + map + status board open in **new windows** |

**Not:** a second navigation menu that hides content behind tabs in the same browser window.

---

## Code audit — what each button does today

### Control room → Monitor cards (`cw-display-room.js`)

| Card | Button label (today) | Actual behaviour | Pop-out? |
|------|----------------------|------------------|----------|
| **Monitor 1** | Show Operations | `EvidenceManager.showTab('ops')` | **No** — same window |
| **Monitor 2** | **Show video wall** (primary) | `CommandWall.showPanel('live')` | **No** — tab switch inside VMS |
| **Monitor 2** | Open on monitor 2 (secondary) | `window.open('/command-wall.html')` | **Yes** |
| **Monitor 3** | Open map | `window.open('index.html?popout=map')` | **Yes** |
| **Monitor 4** | Open status board | `window.open('/command-centre.html')` | **Yes** |
| **Activate layout** | — | Opens 3 pop-outs **then** `goOperationsTab()` | Mixed |

### Other entry points (same product, different contract)

| Entry | Behaviour | Pop-out? |
|-------|-----------|----------|
| VMS → **Video wall** sub-tab | In-app tile grid | No — correct for same screen |
| VMS → **Control room** sub-tab | Display room launcher | N/A |
| Top nav → **Centre Summary** | `showTab('centre-summary')` | **No** — embedded tab |
| Settings → Faults → **Centre summary** | `showTab('centre-summary')` | **No** — embedded tab |
| Centre Summary toolbar **↗** | `window.open('/command-centre.html')` | **Yes** |

---

## Why it feels broken

### 1. `mob-display-room-open-wall-in-tab` contradicted Display room

That MOB was written for **single-monitor lab** confusion (“Open video wall” felt like it did nothing). The fix put **in-tab navigation on the Monitor 2 card**.

| Surface | Correct action |
|---------|----------------|
| **Video wall sub-tab** (top of VMS) | Switch tab — preview on this screen |
| **Monitor 2 card** (Display room) | **Always pop-out** — that is what “monitor 2” means |

Making tab-switch the **primary** Monitor 2 action makes the card a duplicate of the sub-tab above. **No point labelling it Monitor 2.**

### 2. Centre summary has two products in one name

Operators hit **Centre summary** from Settings or top nav → **same window tab change**. That is intentional for a **supervisor desk** (super admin only).

Display room **Monitor 4** is coded to pop out `command-centre.html` — but:

- Same label family (“Centre summary” / “Open status board”) implies the same action.
- If you used Settings or nav, you only ever saw tab switching.
- Pop-out can fail silently from the operator’s perspective (blocked pop-up, window behind, wrong monitor).
- `login.html` always redirects to `/` after sign-in — pop-out auth loss lands on **Operations**, not back on the status board.

So “centre summary does not pop out” is **true for 3 of 4 entry paths**; only Display room Monitor 4 and the ↗ button are pop-out-first.

### 3. Activate layout jumps this window away

**Activate layout** calls `goOperationsTab()` **before** you notice the new windows. This window switches to Operations while pop-outs open. Feels like “it just changed page” even when pop-outs succeeded.

### 4. Monitor 1 is the only honest tab-switch

Monitor 1 = “this workstation is the operator desk” → staying in one window is correct. Monitors 2–4 should **never** switch tabs in the launcher window (except Activate layout’s Monitor 1 side-effect, which needs a visible warning).

---

## Behaviour matrix (what we should ship)

| User intent | Where | Action |
|-------------|-------|--------|
| Preview wall on **this** screen | VMS → **Video wall** tab | `showPanel('live')` |
| Wall on **HDMI monitor 2** | Display room → Monitor 2 | **Pop-out only** |
| Supervisor dashboard on **this** desk | Nav / Settings → Centre summary | In-app tab (OK) |
| Status board on **HDMI monitor 4** | Display room → Monitor 4 | **Pop-out only** |
| Full room in one click | Activate layout | Pop-outs + Ops on this window (with warning) |

**Rule:** Display room cards **2, 3, 4 = `window.open` only.** No `showPanel`, no `showTab`, no `location.href` on those cards.

---

## What was wrong with the previous DISC

`docs/MOB-DISC-OPEN-WALL-MAIN-PAGE.md` correctly identified label confusion, but recommended putting **in-tab wall on Monitor 2** as the primary fix. That trades one confusion for a worse one:

- Hides the real Monitor 2 action behind a secondary button.
- Teaches operators that “monitor” means “another tab”.
- Leaves Centre summary / map / Ops on **three different patterns** without a clear rule.

**Retire that recommendation.** Keep the login-return and label-disambiguation notes; drop in-tab primary on Monitor 2.

---

## Recommended fix MOB (one apply)

**Name:** `mob-display-room-popout-only`

| # | Change |
|---|--------|
| 1 | **Revert** Monitor 2 primary: remove **Show video wall** / `showVideoWallInTab` from Display room |
| 2 | Monitor 2: **one** button — **Open video wall on monitor 2** → `openCommandWallPopout` (today’s secondary) |
| 3 | Intro line on Display room: *“Monitors 2–4 open in new windows. Drag to the correct display and press F11. For a same-screen preview, use the Video wall tab above.”* |
| 4 | **Activate layout**: banner before click — *“This window will switch to Operations; wall, map, and status board open separately.”* |
| 5 | Rename Settings / nav path copy so it does not pretend to be Monitor 4 — e.g. Settings button **Open centre summary (this window)** vs Display room **Open on monitor 4** |
| 6 | Optional same MOB or follow-up: `login.html?return=` so pop-out auth recovery does not dump on `/` |

**Do not touch:** `video-wall.js`, live pool, SIP/PTT engines.

**Risk:** 1 — launcher + copy only.

---

## Bench after fix

1. **Ctrl+F5** → VMS → Control room.
2. Monitor 2 → one button → **new window** with video grid (watch taskbar / second monitor).
3. Monitor 4 → **new window** `command-centre.html` (not Centre Summary tab in parent).
4. **Video wall** sub-tab → grid in **same** window (unchanged).
5. Settings → Faults → Centre summary → **same** window tab (unchanged, but label says so).
6. Block pop-ups → red banner names the monitor; no silent tab fallback.

---

## Apply when ready

`MOB-APPLY mob-display-room-popout-only`

**Revert partial:** implicitly rolls back the bad part of `mob-display-room-open-wall-in-tab` (Monitor 2 tab primary). Video wall sub-tab behaviour unchanged.

Related: `MOB-DISC-OPEN-WALL-MAIN-PAGE.md`, `MOB-DISC-A5-DISPLAY-ROOM-UX.md`, `MOB-DISC-UI-NAV-AUDIT-MERRY-GO-ROUND.md`.
