# MOB DISC — UI navigation audit (merry-go-round + wrong words)

**Status:** DISC only — **code-checked** 2026-07-09. No fixes applied here except labels in `mob-vms-tabs-mixed-d`.  
**User ask:** Correct wall/tab links, no raw technical prompts, industry-plain help — stop click-here-go-back loops.

---

## Sleep summary (read this first)

| Done tonight | Still broken / confusing (needs your call) |
|--------------|---------------------------------------------|
| **Option D labels** applied — Video wall \| Control room, Configure monitors | **Two different “video wall”** places (see below) — #1 operator confusion |
| Popup feedback on Control room buttons | Help text still says **Server → Map groups** — wrong path |
| Centre Summary `global` bug fixed | **index.html** had stale fallbacks (partially fixed in mixed-d pass) |
| Site readiness uses plain errors | **centre.viewLocal** = “View local” — meaningless |
| | Settings **Faults** vs Control room **Status board** — same data, two doors |
| | Long **4-step Windows** list on Control room — installer tone |

**Next genre (when you wake):** `mob-ui-nav-consolidation` — not one MOB per string; one pass on links + help.

---

## Link audit — does the button go to the right place?

Verified in code (`evidence-manager.js`, `server-setup.js`, `command-wall.js`, `cw-display-room.js`).

| You click | Code path | Lands on | **Correct?** |
|-----------|-----------|----------|--------------|
| Settings → Site readiness → **Configure monitors** | `showTab('command-wall', { panel: 'display' })` | Command Wall → **Control room** tab | **Yes** — room launcher, not video grid |
| Command Wall nav (top) | `showTab('command-wall')` | Command Wall → **Video wall** tab (default) | **Yes** |
| Control room → **Show Operations** | `EvidenceManager.showTab('ops')` | **Operations** | **Yes** |
| Control room → **Open video wall** | `window.open('/command-wall.html')` | **New window** — pop-out wall | **Yes by design** — **not** the Video wall tab |
| Control room → **Open map** | `window.open('?popout=map')` | Map pop-out | **Yes** |
| Control room → **Open status board** | `window.open('/command-centre.html')` | Centre Summary pop-out | **Yes** |
| Settings hub → Faults → **Centre summary** | `showTab('centre-summary')` | **Centre Summary** tab (same app) | **Yes** — duplicate of status board pop-out |
| Site readiness row → **Open** | `followReadinessLink` | Server Config section / Map groups / Dashboard Auth / Evidence storage | **Yes** (see hops below) |
| Readiness → Storage row | `openEvidenceStorage()` | Closes Server Config → **Evidence** → Storage panel | **Yes** but **3 hops** |

### Critical confusion (not a broken link)

**Two “video wall” surfaces:**

| Name (after Option D) | Where | What it is |
|------------------------|-------|------------|
| **Video wall** (sub-tab) | Same browser, Command Wall | In-app grid — drag roster, live tiles |
| **Open video wall** (button) | Control room card | **New window** for monitor 2 |

Industry does both (Milestone floating window + Smart Client wall). **We use the same words** — operators think the button is broken when nothing changes *in this tab*.

**DISC fix (future MOB, not applied):**  
- Button: **Open wall on monitor 2** (or **Pop out wall**)  
- Optional: if pop-up blocked → **Switch to Video wall tab** (`mob-display-room-live-wall-fallback`)

---

## Merry-go-round paths (unnecessary hops)

| Path | Hops | Industry habit |
|------|------|----------------|
| Settings → Maintenance → Evidence → Storage | 3 | Genetec: one “Storage” entry in admin — we split hub + evidence nav |
| Settings → Configuration → Server Config (same as Server Config button) | 2 | Redundant cards |
| Site readiness storage fix → Evidence tab | 2 + leaves config | OK for engineers; heavy for owner |
| Faults card → Centre Summary **and** Control room → Status board pop-out | 2 doors, same KPIs | Pick **one** primary for supervisors |

**DISC direction:** One admin story — **Settings = configure**, **Operations = run**, **Command Wall = video**, **Centre Summary = supervise**. Control room = **multi-monitor setup only** (not daily ops).

---

## Wrong or amateur help text (verified in `en.json`)

| Key | Problem | Industry-style fix (future MOB) |
|-----|---------|----------------------------------|
| `displayRoom.noGroups` | “Server → Map groups” — **no top nav “Server”** | “Settings → Map groups” |
| `ptt.groupBox.pickFirst` | Same wrong “Server → Map groups” | Same fix |
| `map.permGrantSteps` | “Server Config → Dashboard Auth” — OK but long | Short: “Ask your admin to grant map control in user settings.” |
| `centre.viewLocal` | “View local” | “Open full screen” or remove |
| `video.popout` / `video.popoutMatrix` | “Vid Popout” | “Pop out video” / “Video matrix” |
| `displayRoom.groupsLabel` | “TV Wall — Dispatch Groups” | “Video wall — dispatch groups” |
| `commandWall.meta` | “Drag Devices from the Roster Into Any Panel” | “Drag a device onto a tile to go live.” |
| `displayRoom.step1–4` | Windows installer steps on operator page | Move to admin PDF; one line: “Use extended displays and allow pop-ups.” |
| `lab.proxyHint` | “Server → Reverse proxy” | “Settings → Reverse proxy” |

No raw JSON / `global is not defined` after tonight’s MOBs — keep auditing new APIs.

---

## Stale HTML fallbacks (i18n bypass)

`index.html` had **old English baked in** (e.g. “Go to Operations”, “Open wall window”) while `en.json` was updated — operators with slow i18n load saw **wrong words**.

**Fixed in `mob-vms-tabs-mixed-d`** for Control room block.  
**Still audit:** other views, `command-wall.html` mini cards (still shortened stubs).

---

## What good VMS help looks like (reference, not copy)

| Vendor | Pattern |
|--------|---------|
| Genetec | Short task name + one action verb; deep config in manual |
| Milestone | “Activate layout” / “Send to monitor” — no OS steps in client |
| Avigilon | Monitor role on card; pop-out = “viewing window” |

We aligned **verbs** (Activate layout, Configure monitors, Video wall / Control room). **Help paragraphs** still too technical — next genre trims hints, not renames tabs again.

---

## MOB queue (after sleep — you approve each)

| MOB | Scope |
|-----|--------|
| `mob-ui-nav-path-hints` | Fix “Server →” to “Settings →”; trim PTT/map hints |
| `mob-display-room-live-wall-fallback` | Pop-up blocked → offer Video wall tab |
| `mob-display-room-button-disambiguate` | Rename pop-out buttons vs in-app tab |
| `mob-centre-view-local-label` | Fix or remove “View local” |
| `mob-ui-nav-consolidation` | Settings hub card dedup (Configuration = Server Config) |

**Do not stack** with live video / pool MOBs.

---

## Applied tonight (for your log)

- `mob-vms-tabs-mixed-d` — Option D labels (i18n + fallbacks)
- Earlier session: `mob-ui-zero-raw-api-errors`, `mob-centre-summary-global-ref-fix`, `mob-display-room-popup-feedback`, `mob-a5-labels-enterprise-neutral`

**Bench:** Ctrl+F5 → Command Wall shows **Video wall \| Control room** → Settings → Configure monitors jumps to **Control room** tab.
