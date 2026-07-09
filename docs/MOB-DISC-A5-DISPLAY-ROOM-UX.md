# MOB DISC — A5 command note + Display room UX (plain)

**Status:** DISC — A5 note is **misleading**; Display room buttons behave as coded but **feel wrong**. Fix is a small follow-up MOB.

---

## 1. “Don’t duplicate the same camera” — are we telling you not to?

**Yes — advice only.** Not a hard block.

| Today | Meaning |
|-------|---------|
| Text in Settings (A5 note) | Avoid same live camera on Operations + Command Wall |
| Text at bottom of **Display room** (`displayRoom.streamNote`) | Same advice |
| **No popup** when you actually open the same camera twice | Product does **not** stop you |

**Why the advice:** one live camera = one server transcode. Two walls playing the same device can stutter or fail.

**Future (optional MOB):** soft warning when cam already live on Operations and you drop it on Command Wall — not in A5.

---

## 2. A5 English was bad — what we meant vs what you get

| What A5 said | What actually happens |
|--------------|------------------------|
| “Open Command Wall” | Opens **Command Wall** tab |
| Note talks about **Display room** | Tab opens on **Live wall** (default), **not** Display room |
| You must click **Display room** yourself | Extra step we did not say |

**Plain intent:** “How to use a second monitor / TV” — not “open the live video grid.”

**Locked fix copy (next MOB):**

- Button: **Open display room setup** (not “Open Command Wall”)
- One line hint: **Monitor 1: Operations. Monitor 2+: use Display room to open TV windows.**
- Second line (optional): **Don’t play the same camera live on two walls.**

No long sentences.

---

## 3. “I click Display room options and go back to the whole main page”

**You’re not wrong — two different behaviours mixed in one screen.**

### Display room is a **launcher**, not navigation inside one page

| Button | What it does |
|--------|----------------|
| **Go to Operations** | Switches **this same browser window** to the **Operations** tab (Monitor 1). **You leave Command Wall.** That is intentional for SOS/PTT control — but the label does not say that. |
| **Open wall window** | Opens a **new pop-up window** for live video (Monitor 2). You stay on Display room unless you clicked Go to Operations. |
| **Open map window** | New pop-up — map mirror |
| **Open status window** | New pop-up — Centre Summary |
| **Launch all display windows** | Opens pop-ups **and** switches this window to Operations for Monitor 1 |

So when you pick **Go to Operations** or **Launch all**, you **will** land on the main Operations page. That is by design for “command on monitor 1” — but it **feels** like the UI ignored your click.

### What you expected

Click a monitor card → go **directly** to that thing (or open that window and **stay** on Display room).

### DISC verdict

| Issue | Fix direction |
|-------|----------------|
| Settings button opens wrong sub-tab | Open **Display room** directly (`panel: 'display'`) |
| “Go to Operations” sounds vague | Rename: **Use this window for Operations (monitor 1)** |
| Launch all jumps away without warning | One line before button: “This window will switch to Operations; other monitors open in new windows.” |
| Pop-ups blocked | Already shows status — make more visible |
| No deep link from Settings | `showTab('command-wall', { panel: 'display' })` |

**Not in scope:** rebuild Command Wall engine (risk 5).

---

## 4. Follow-up MOB (one apply, risk 1)

**Name:** `mob-vms-deploy-a5-display-room-deep-link`

1. Settings button → **Display room** tab, not Live wall.  
2. Short plain i18n (replace A5 paragraph).  
3. Rename Display room buttons for clarity (monitor 1 vs pop-out).  
4. Optional: `CommandWall.showPanel('display')` exported for deep links.

**Do not** bundle with raw-error fix or live video MOBs.

---

## Apply

`MOB-APPLY mob-vms-deploy-a5-display-room-deep-link`
