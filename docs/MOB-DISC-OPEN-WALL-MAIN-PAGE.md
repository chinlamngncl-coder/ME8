# MOB DISC — “Open video wall” lands on main page (not video layout)

**Status:** Root cause confirmed 2026-07-09 FAIL — pop-out → login/`/` reuse. Partial fix APPLIED in `mob-display-room-popout-return` (login `?return=`, force named-window URL). Place-activation still next.

---

## What you reported

**Control room → Monitor 2 → Open video wall** does not show the **Command Wall video layout** (tile grid). It feels like it **goes to the main page** (Operations).

---

## What the code actually does (verified)

| Step | Code | Result |
|------|------|--------|
| Click **Open video wall** | `cw-display-room.js` → `openCommandWallPopout(url)` | `window.open('/command-wall.html', 'mobility-command-wall', …)` |
| **Not called** | `CommandWall.showPanel('live')` | **Does not** switch the **Video wall** sub-tab in this window |
| Pop-out page | `public/command-wall.html` | Standalone page; default tab = **Video wall** (roster + tile grid) |
| Map button (contrast) | `openMapPopout()` | Opens **`index.html?popout=map`** — stripped **Operations map** on the main app URL |

So **video wall** and **map** use **different patterns** by design today. Map pop-out **is** the main app URL. Video wall pop-out **is not** — unless something redirects it.

---

## Why it looks like “main page” (three causes)

### 1. Expectation mismatch (most common on single monitor)

You are on **Command room** in the **same** window. The button opens a **second window** (or reuses one named `mobility-command-wall`).

| What you watch | What you see |
|----------------|--------------|
| **This window** | Stays on **Control room** — unchanged |
| **Other window** | Should be `command-wall.html` video grid |

If the pop-out is **behind**, on another monitor, or **blocked**, you only see the unchanged Control room → feels like “nothing” or “failed”.

**Not a missing feature** — wrong mental model + weak label (**Open video wall** sounds like the **Video wall** tab right above).

### 2. Pop-out auth redirect → Operations (real “main page” bug path)

`command-wall.js` on standalone page:

```
/command-wall.html → GET /api/auth/session
  → if not ok → location = /login.html
  → after login → location = /   (Operations — always)
```

If the pop-out **loses session** (rare same-origin) or opens **login** in that window, after sign-in you land on **`/`** — full **Operations** dashboard. That matches “goes to main page” literally.

### 3. Reused pop-out window already on `/`

Window name `mobility-command-wall` is shared with the **↗ pop-out** button on the Video wall tab.

If that window was previously used and user clicked **Go to Operations** (`<a href="/">` in `command-wall.html` header), the named window shows **main page**. Next **Open video wall** should set `location.href` back to `command-wall.html` — unless pop-up blocked or focus stays on parent.

---

## What you expected vs what we built

| You expected | We built |
|--------------|----------|
| Jump to **Command Wall → Video wall** tab (in-app grid) | Open **`command-wall.html`** in a **new window** for **monitor 2** |
| Same as clicking **Video wall** sub-tab | Different surface (pop-out for TV wall habit) |

**Industry:** Milestone/Genetec use **both** — in-client wall **and** “send to monitor / floating window”. We mixed the **same label** for both.

---

## Link audit — is anything wired wrong?

| Action | Target | Correct for monitor 2? |
|--------|--------|-------------------------|
| **Open video wall** (Control room) | `/command-wall.html` pop-out | **Yes** for TV/monitor 2 |
| **Video wall** sub-tab (top of Command Wall) | In-app `showCwPanel('live')` | **Yes** for monitor 1 / same screen |
| **Configure monitors** (Settings) | `showTab('command-wall', { panel: 'display' })` | **Yes** — Control room |
| **Open map** (Control room) | `index.html?popout=map` | **Yes** — map is on Operations shell |

**Nothing is mis-linked to `/` by the Open video wall click itself.** The failure is **behavior vs label**, or **pop-out → login → `/`**.

---

## DISC verdict

| Issue | Severity |
|-------|----------|
| Same name “video wall” for tab vs pop-out | **High** — operator confusion |
| Single-monitor lab uses pop-out only | **High** — should use in-tab **Video wall** first |
| Login redirect in pop-out drops on `/` | **Medium** — should return to `command-wall.html` after login |
| Map uses main URL; wall uses separate HTML | **Low** — document only |

---

## Recommended fix (one MOB — pick on wake)

**Name:** `mob-display-room-open-wall-in-tab` (bundles disambiguate + fallback)

| Change | Detail |
|--------|--------|
| **Monitor 2 primary button** | **Show video wall** → `CommandWall.showPanel('live')` in **this** window |
| **Secondary (small)** | **Open on monitor 2** → keep `window.open('/command-wall.html')` |
| **Rename tab vs button** | Tab stays **Video wall**; pop-out never uses the same verb alone |
| **Login return** | `login.html?return=/command-wall.html` (optional same MOB or follow-up) |
| **Hint under Monitor 2** | One line: “For a second screen, use **Open on monitor 2**.” |

**Do not** make Open video wall open `index.html` or `/` — that would be wrong.

---

## Quick bench (you, 30 seconds)

1. Click **Open video wall** → watch **taskbar** for a second window (not this tab).
2. If a window flashes **login** then **Operations** → cause #2 confirmed.
3. Click **Video wall** sub-tab (top) → if grid appears, product works — only Control room button behavior is wrong for you.

---

## Apply when ready

`MOB-APPLY mob-display-room-open-wall-in-tab`

Related: `docs/MOB-DISC-UI-NAV-AUDIT-MERRY-GO-ROUND.md` (two video walls).
