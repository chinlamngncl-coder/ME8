# Mobility Axiom — User Manual (Operator Guide)

**Audience:** Dispatchers, supervisors, evidence staff, control-room operators.  
**Related docs:** **Quick Guide** (install) · **Configuration Manual** (server/BWC setup) · **README.txt** (pack layout)

This guide walks through **every tab**, **every major button**, and **step-by-step workflows** in the dashboard. UI labels match your selected language; this manual uses English names as they appear in the English UI.

---

## Table of contents

1. [What the system does](#1-what-the-system-does)
2. [Sign in, language, sign out](#2-sign-in-language-sign-out)
3. [Header bar (top of every screen)](#3-header-bar)
4. [Main layout — Operations tab](#4-main-layout--operations-tab)
5. [Device Summary (fleet table) — detailed](#5-device-summary-fleet-table)
6. [SOS — banner, log, incident report](#6-sos)
7. [PTT groups and Messages](#7-ptt-groups-and-messages)
8. [Map — pins, panels, toolbar](#8-map)
9. [Geofencing — step by step](#9-geofencing)
10. [Video wall (6 panels) — detailed](#10-video-wall)
11. [Evidence & Docking — all sub-tabs](#11-evidence--docking)
12. [Command Wall — Live wall & Display room](#12-command-wall)
13. [Centre Summary](#13-centre-summary)
14. [Video Conference — Live, Lobby, Recordings, Settings](#14-video-conference)
15. [Settings hub & Audit Trail](#15-settings--audit-trail)
16. [User roles and permissions](#16-user-roles)
17. [Workflow cookbook (shift scenarios)](#17-workflow-cookbook)
18. [Troubleshooting](#18-troubleshooting)

---

## 1. What the system does

| Capability | Where in UI | What you can do |
|------------|-------------|-----------------|
| Live GPS map | Operations → map | See officer location, SOS, recording status |
| Live BWC video | Map pin panel, video wall, Command Wall | Watch up to many streams; 6 on Operations by default |
| Voice / PTT | Fleet table, map pin, PTT groups | One-to-one or group push-to-talk |
| SOS handling | Header banner, SOS log, map | Alarm, report, folder export |
| Text to BWC | Operations → Messages | Send text to online cameras |
| Evidence library | Evidence tab | Search dock uploads, server recordings, case files |
| Video conference | Video Conference tab | Room with phones, PCs, live BWC share |
| Administration | Settings → Server Config | Network, BWC list, operators (super admin) |

---

## 2. Sign in, language, sign out

### 2.1 First login

1. Open browser (Chrome or Edge recommended).
2. Go to `http://<server-ip>:3888` (trial on same PC: `http://localhost:3888`).
3. Enter **Username** and **Password** (trial default: `global` / `global123`).
4. Click **Sign in**.

### 2.2 Change language

- **At login:** use the language dropdown before signing in.
- **After login:** top-right **Language** dropdown in the header.
- APAC trial: English, Korean, Thai, Indonesian, Filipino.

All menus, buttons, and hints switch immediately.

### 2.3 Change your password (super admin)

1. **Settings** tab → **Server Config**.
2. Open **Dashboard Auth** (left nav inside Server Config).
3. Find your user row → set new password → **Save** on that row.

### 2.4 Sign out

1. **Settings** tab.
2. Left panel → **Sign out**.
3. Browser returns to login page. Always sign out on shared PCs.

---

## 3. Header bar

Visible on every tab.

| Control | Location | What it does |
|---------|----------|--------------|
| **Mobility Axiom** logo | Top left | Brand; no action |
| **Voice mute** 🔊 | Top right | Mute/unmute spoken SOS and alert voice prompts |
| **Repeat** | Top right | Replay last voice alert (useful if dispatcher missed it) |
| **Language** | Top right | Change UI language |
| **SOS banner** | Below header (when active) | Red strip: device name, time, acknowledge actions — appears only during open SOS |

**Tip:** If you hear no voice alerts, check voice mute is off (icon not struck through).

---

## 4. Main layout — Operations tab

Operations is the **default home screen** after login.

### 4.1 Three columns

| Area | Contents |
|------|----------|
| **Left sidebar** | Device Summary, SOS log, PTT groups, Messages, Storage shortcuts |
| **Centre** | Interactive map + map toolbar |
| **Right** | Six live video wall panels |

### 4.2 Collapse sidebar

Click **◀** on the narrow gutter between sidebar and map to hide the fleet panel and gain map space. Click again to show.

### 4.3 Top nav (only on Operations)

When **Operations** tab is active, extra controls appear in the top bar:

| Control | Action |
|---------|--------|
| **Auto-rotate** | Checkbox — cycles cameras across the 6 wall panels automatically |
| **Popout Matrix** | Opens full-screen video matrix on another monitor |
| **Config** | Opens video wall assignment dialog |

### 4.4 Command Wall awareness strip

If Command Wall is open elsewhere, a thin bar may appear above the map: **Open Command Wall →** — click to jump to that tab.

---

## 5. Device Summary (fleet table)

**Location:** Operations → left sidebar → **Device Summary**.

**Summary line:** e.g. `3 online · 5 devices` — quick fleet health.

### 5.1 Search and filter

1. **Search** box — type officer name or device ID; table filters live.
2. **Filter** dropdown:
   - **All** — every registered BWC
   - **Online only** — units currently connected
   - **Offline only** — registered but not connected

### 5.2 Table columns — what to click

| Column | How to use | Notes |
|--------|------------|-------|
| **Pin** | Click once | Toggles map pin + floating live video panel. Click again to remove pin. |
| **PTT** | **Press and hold** | Talk to this BWC only. Release to stop. No video on PTT. |
| **Call** | Click | Starts voice call session to BWC (no video). |
| **GPS** | Click | Opens route / GPS track view for historical path. |
| *(checkbox)* | Tick | Used with PTT groups — select 2+ online units. |
| **Device** | — | Shows officer nickname and device ID. |
| **Status** | — | **Online** (green) or **Offline** (grey). |

### 5.3 Bulk pin actions

| Button | When enabled | Action |
|--------|--------------|--------|
| **Open All (Up to 6)** | At least one online | Pins up to six online devices on map simultaneously |
| **Clear map pins** | Pins open | Removes all floating pin panels from map |

### 5.4 Workflow — monitor one officer

1. Find officer in table (search if needed).
2. Confirm **Online**.
3. Click **Pin** → map zooms; floating video opens.
4. To talk: hold **PTT** on row OR on map pin panel.
5. To stop video on map: click **Pin** again or close pin panel.

### 5.5 Workflow — call without video

1. Click **Call** on fleet row.
2. Wait for BWC to answer (device-dependent).
3. End call from BWC or dashboard when done.

### 5.6 Empty table

**No devices yet** — no BWCs registered. Super admin must add devices under **Settings → Server Config → BWCs** (see Configuration Manual).

---

## 6. SOS

### 6.1 Active SOS — header banner

When a BWC triggers SOS:

1. **Red banner** appears under header with device identity and time.
2. Map typically **zooms** to SOS location.
3. Pin shows **SOS** status chip.
4. Voice alert may play (unless muted).

**Dispatcher actions:**

1. Set **response radius** (200–1000 m) if needed — red circle on map shows nearby units.
2. Click **Pin** if not already open — confirm live video on the alarm officer.
3. **Acknowledge** — see §6.1b (forms PTT team from checked nearby units), **or** click **PTT team** on the banner first.
4. **Press and hold PTT** on wall panel or map pin to talk to the **whole team** when **PTT TEAM · ON** is shown.
5. Open **SOS log** row for full report (below).

### 6.1b Response radius and SOS PTT team

| Banner control | Action |
|----------------|--------|
| **Radius chips** | 200 / 300 / 400 / 500 / 1000 m — who counts as “nearby” on the map |
| **Summary line** | Nearby unit names and distances |
| **PTT team** | Push one PTT group now (alarm officer + online units in radius); alarm stays open |
| **Acknowledge** | Close alarm in the log; see steps below |

**Recommended — Acknowledge with auto PTT team:**

1. Click **Acknowledge** on the banner.
2. In the dialog, **nearby units are checked by default** — uncheck any you do not want on the team.
3. Optional note → **Submit / close**.
4. Wait for toast **PTT team ON — …** (needs at least one checked online helper besides the alarm officer).
5. **Press and hold PTT** on the alarm officer’s wall panel or map pin — all checked units hear you (audio only, not a phone call).

**Manual PTT team (alarm still open):** Click **PTT team** on the banner instead of step 1–3 above, then hold PTT as in step 5.

**Notes:**

- Helpers must be **online** and inside the radius (GPS on map).
- Uncheck **all** helpers in Acknowledge if you only want to log the alarm without forming a team.
- Server must have PTT enabled (see Configuration Manual).

### 6.2 SOS log panel

**Location:** Operations → left sidebar → **SOS log**.

| Element | Action |
|---------|--------|
| Chart | Visual count of recent SOS events |
| Event rows | Click row → incident detail dialog + map focus |
| **Open incident files** | Opens Windows folder with SOS packages on server |
| **Download CSV** | Export log for compliance |
| **Clear list** | Clears on-screen list only (not server files) |
| **Reload list** | Refresh from server |

### 6.3 SOS incident detail dialog

After clicking a log row:

| Button | Action |
|--------|--------|
| **Open in new tab** | Full HTML report in browser tab |
| **Close** | Dismiss dialog |
| **Server folder (admin)** | Open raw incident folder on server |

Some incidents require **PIN unlock** before viewing sensitive report content — enter agency PIN → **Unlock**.

### 6.4 Create case file from SOS

From **Evidence → Case Files** → **Create from SOS** links evidence workflow to the alarm (see §11.4).

---

## 7. PTT groups and Messages

### 7.1 PTT groups

**Location:** Operations → **PTT groups** box.

**Purpose:** One push-to-talk channel for multiple BWCs (e.g. all units at a scene).

**Steps:**

1. **Option A — map group:** Select coloured group from dropdown (groups defined in Server Config → Map groups).
2. **Option B — manual pick:** Tick checkboxes on 2+ **online** rows in fleet table.
3. Review **Members** list — click **×** to exclude, **+** to include before joining.
4. Click **Join group PTT** — status line confirms.
5. Hold **PTT** on any grouped device to broadcast to all members.
6. Click **Ungroup all** when incident ends.

### 7.2 Messages

**Location:** Operations → **Messages**.

1. **Online BWCs** list shows who can receive text.
2. Click officer name → chat thread opens.
3. Type in text field → **Send**.
4. Multiple threads: tabs appear for each open chat.
5. **Clear thread** — removes messages from your view (server may retain per policy).

**Retention:** UI shows last 24 hours; server stores up to 30 days.

---

## 8. Map

### 8.1 Map basics

- Pan: click-drag map.
- Zoom: mouse wheel or +/- controls.
- **Pin colours** = map groups (legend appears bottom-left when pins visible).
- **Offline** devices do not show GPS pins.

### 8.2 Floating pin panel

Opened by clicking **Pin** on fleet row or clicking map pin.

| Part | Use |
|------|-----|
| Title bar | Officer name, device ID — **drag** to move panel |
| Live video | Real-time BWC camera |
| **PTT** button | Hold to talk |
| Minimize / Expand | Resize panel |
| Status badges | Online, SOS, REC (SD), SRV REC (server), Fall, Patrol |
| Close (×) | Closes panel — wall video may continue on right |

**Stacked panels:** If multiple pins open, hint says **Stacked — drag panel headers apart**.

### 8.3 Map toolbar (below map)

**Order of use for remote commands:**

1. Select **online BWC** from dropdown (required for snapshot/record).
2. Use action buttons on the right.

| Button | Steps | Result |
|--------|-------|--------|
| **Wall Map** | Click | New window — map only for TV/monitor (display mirror; control stays here) |
| **Snapshot** | Select BWC → Snapshot | Still image captured on device |
| **Start SD record** | Select BWC → Start | Records to BWC SD card |
| **Stop SD record** | Select BWC → Stop | Ends SD recording |
| **Record to server** | Select BWC → Start | Server saves live stream to evidence path |
| **Stop server record** | Click Stop | Ends server recording |
| **Set geofencing** | See §9 | |
| **Clear geofencing** | See §9 | |

**Permission box:** If remote control blocked on BWC, **Permission** button explains — officer may need to grant remote control on device.

---

## 9. Geofencing

### 9.1 Set geofence

1. Map toolbar → enter **radius** in metres (e.g. `200`).
2. Click **Set geofencing**.
3. Dialog: choose target BWC (online).
4. On map: **drag orange centre** or **white edge** to position, or click map to place.
5. Click **Save geofence** on map bar.
6. Toast confirms when BWC enters/leaves zone.

### 9.2 Clear geofence

1. Click **Clear geofencing**.
2. Select BWC in dialog.
3. Confirm **Clear geofencing**.

---

## 10. Video wall

**Location:** Operations → right column (six panels).

### 10.1 Each panel

- Shows one live BWC stream when assigned.
- **Stop** on panel — stops that stream only.
- Empty panel — grey placeholder until device pinned or configured.

### 10.2 Auto-rotate

1. Top nav → tick **Auto-rotate**.
2. System cycles online cameras across panels every few seconds.
3. Untick to stop.

### 10.3 Popout Matrix

Opens dedicated full-screen grid on second monitor — useful for supervisor desk.

### 10.4 Config dialog (assign cameras)

1. Top nav → **Config**.
2. For **each of 6 panels**, choose source:
   - Fixed **device ID**
   - **Map group** (rotates within group)
   - **All online**
   - Custom ID list
3. **Download wall template (CSV)** — edit in Excel → **Import wall CSV**.
4. **Export wall CSV** — backup current layout.
5. **Save** — applies immediately.
6. **Cancel** — discard changes.

**Note:** BWCs must be registered under Server Config → BWCs before they appear in lists.

---

## 11. Evidence & Docking

**Tab:** **Evidence & Docking** (top nav).

**Sub-tabs** (horizontal nav inside Evidence):

| Sub-tab | Purpose |
|---------|---------|
| **Overview** | Stats — how much evidence indexed, guidance |
| **Docking Stations** | Register physical docks, see bay status |
| **Evidence Library** | Searchable table of all files |
| **Case Files** | Investigation case folders linking evidence |
| **Route & GPS** | Replay GPS tracks (evidence context) |
| **Storage** | Super admin — folder paths, FTP, scan (hidden if no permission) |

### 11.1 Evidence Library — daily use

1. Open **Evidence Library** sub-tab.
2. Click **Refresh** to load latest index.
3. Use search/filter toolbar (officer, date, source).
4. Click row **Detail** → preview player opens.
5. **Download** column — save file locally (if permitted).
6. **Secure export** — may prompt for extra confirmation (role-dependent).

**Sources you may see:** FTP dock upload, live capture, SOS auto-record, manual server record.

### 11.2 Docking Stations

1. **Docking Stations** sub-tab.
2. **Register dock** — add dock ID and name (admin).
3. Select dock in list → **bay grid** shows slots and upload status.
4. When officer places BWC in dock, files upload via FTP — appear in Library after scan.

### 11.3 Case Files

1. **Case Files** sub-tab.
2. **New case file** — enter title, officer, narrative.
3. **Create from SOS** — pre-fills from SOS incident.
4. Filter: search, period, open/closed status.
5. Open case → link evidence from Library → write report → close case when done.

### 11.4 Route & GPS

1. **Route & GPS** sub-tab.
2. Select device and time range.
3. Map replays path — use for incident reconstruction reports.

### 11.5 Storage (admin)

1. **Storage** sub-tab (super admin).
2. Set **FTP folder**, **live capture folder**, browse server paths.
3. **Save storage** → **Scan FTP for evidence** to index new files.

---

## 12. Command Wall

**Tab:** **Command Wall**.

**Sub-tabs:** **Live wall** | **Display room**

### 12.1 Live wall

| Step | Action |
|------|--------|
| 1 | Roster on left lists **online** devices — search if needed |
| 2 | **Drag** device chip onto empty **panel** in grid |
| 3 | Live video starts automatically |
| 4 | Choose **layout**: 1, 4, 9, 16, 32, or 1+7 focus |
| 5 | **Rotate** / **Poll** — auto-cycle feeds (set interval, pause/resume) |
| 6 | **Click panel** — spotlight (enlarge); click again for grid |
| 7 | **PTT** on wall toolbar — talk to devices on wall |
| 8 | **Clear wall** — remove all |
| 9 | **Popout Matrix** or ↗ — TV / second monitor |

### 12.2 Display room

Pre-configured **multi-monitor** layouts for Windows extended desktop:

- **4-Monitor SOS Room** preset: Ops on monitor 1, live wall on 2, map mirror on 3, KPIs on 4.
- Follow on-screen **Open** buttons to launch each window to the correct display.

---

## 13. Centre Summary

**Tab:** **Centre Summary** (super admin / managers).

| Section | What you see | Actions |
|---------|--------------|---------|
| KPI rings | Online, offline, open SOS, SOS week, storage, uptime | Hover for detail |
| Period selector | Daily / weekly / monthly / yearly | Change graph range |
| SOS trend chart | Bar/line trend | **Download chart PNG** |
| Storage breakdown | Folder sizes | Identify disk pressure |
| System health | SIP, PTT, fleet link up/down | If red, see Configuration Manual |
| Recent activity | Who did what | Click row for detail |
| AI assistant | Chat box | Ask e.g. "How many devices online?" → **Ask** |

**Refresh** button updates all widgets.

---

## 14. Video Conference

**Tab:** **Video Conference**. Requires **Docker Desktop** running.

**Sub-tabs:** **Live** | **Lobby** | **Recordings** | **Settings**

### 14.1 Join a room (Live)

1. **Live** sub-tab.
2. Enter room name or pick recent room.
3. Click **Join Room**.
4. Allow camera/microphone in browser prompt.
5. Video tiles appear — your self-view and others.

### 14.2 Layout controls (in room)

| Layout | Best for |
|--------|----------|
| **Gallery** | Equal tiles — everyone visible |
| **Speaker** | Active speaker large |
| **Focus** | One speaker full screen |
| **2-up** | Two main feeds |
| **Briefing** | Shared content main stage |
| **Side-by-side** | Share left, people right |
| **PiP** | Picture-in-picture |

### 14.3 Share content

- **Share screen** — show desktop/apps.
- **Share image** — upload still for briefing.

### 14.4 Add BWC live to room

1. In room, find **Body Cameras (BWC)** section.
2. Dropdown → select **online** BWC.
3. **Add to Room** — live body camera appears as participant tile.
4. **Remove BWC Share** when done.

### 14.5 Host tools (super admin / host)

- Mute all, grant/deny speak floor, **End Room**.

### 14.6 Lobby

Schedule or advertise rooms; waiting participants (if configured).

### 14.7 Recordings

List server-recorded conference files — play/download per policy.

### 14.8 Settings

Set **Phone / browser video URL** (WebSocket) if mobile users cannot connect outside LAN.

### 14.9 Android app

1. Install `MobilityConference-1.5.6.apk`.
2. Server URL = dashboard URL.
3. Sign in → join same room name → enable camera.

---

## 15. Settings & Audit Trail

### 15.1 Settings hub

**Tab:** **Settings**.

**Health strip (top):** Fleet count, FTP status, uptime, license.

**Left panel:**

| Field / button | Meaning |
|----------------|---------|
| BWC register IP | IPv4 for cameras — must match camera SIP screen |
| Operator login | URL for read-only operator accounts |
| Deployment | Lab / LAN / Cloud mode |
| Signed in | Your user + role badge |
| **Server Config** | Full admin (network, BWCs, users) |
| **Tech admin** | License tools (super admin) |
| **Audit Trail** | Compliance log |
| **Sign out** | End session |

**Device lifecycle cards:**

| Card | Click **Manage** to |
|------|---------------------|
| Onboarding | Step-by-step first BWC setup wizard |
| Assets | Device inventory |
| Configuration | Jump to Server Config |
| Maintenance | Open storage folders |
| Faults & SOS | Centre Summary |
| Monitoring | Diagnostics |
| Firmware | OTA inventory |

### 15.2 Audit Trail

**Open:** Settings → **Audit Trail**.

1. Set **From** / **To** dates.
2. Filter **Category**, **Action**, **User**, free-text **Search**.
3. **Apply** → table fills.
4. Click row → **Event detail** side panel (JSON details).
5. **Export CSV** (if permitted) for auditors.
6. **Previous** / **Next** pages for long histories.

---

## 16. User roles

| Role | Operations | Evidence | Command Wall | VC | Server Config |
|------|------------|----------|--------------|-----|---------------|
| Super admin | Full | Full + storage | Full | Full + host | Edit all |
| Operator | Full | View/search | Full | Join | Read-only |
| Custom | Per toggle | Per toggle | Per toggle | Per toggle | Per toggle |

Missing tabs or banners like *"access not granted"* = ask super admin to enable under **Dashboard Auth**.

---

## 17. Workflow cookbook

### Shift start (dispatcher)

1. Confirm server running (`Start Mobility.bat`).
2. Login → Operations.
3. Check `N online · M devices`.
4. Settings → verify BWC register IP.
5. Test one **Pin** + **PTT** with field unit.

### Active incident — single officer

1. Search officer → **Pin**.
2. **Record to server** if policy requires.
3. Hold **PTT** for instructions.
4. On close: stop server record.

### Multi-unit scene

1. Tick 3+ online units OR select map group.
2. **Join group PTT**.
3. Optional: **Open All (Up to 6)** for map overview.

### SOS response

1. Read header banner; set **radius** if needed.
2. Pin + live video on alarm officer.
3. **Acknowledge** — leave nearby helpers **checked** → PTT team forms automatically (§6.1b), **or** **PTT team** on banner first.
4. **Press and hold PTT** on wall or pin to brief the team.
5. SOS log → open report.
6. Evidence → **Create from SOS** case file.

### Evidence handover to investigations

1. Evidence → Library → filter by date/officer.
2. Download or secure export.
3. Case Files → link clips to case ID.

### Control room TV

1. Command Wall → 16 layout.
2. Drag all online units.
3. Rotate 30s.
4. Popout to TV HDMI PC.

---

## 18. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| All devices Offline | Wrong server IP on cameras | Configuration Manual → Network + Type on BWC |
| One device Offline | ID/password mismatch | Check BWCs tab vs camera SIP screen |
| Pin works, no video | Firewall 3889 | Open port on server |
| PTT silent | Tapping not holding | Hold PTT; check group not conflicting |
| SOS PTT reaches one unit only | No team formed | Ack with helpers checked or **PTT team**; wait for **PTT team ON** toast |
| No nearby units in Ack list | GPS missing or offline | Wait for map positions; widen radius |
| No GPS pin | GPS off on BWC | Enable GPS; wait 30s |
| VC fails | Docker stopped | Start Docker; re-run Install-Mobility.bat |
| Evidence empty | FTP path wrong or not scanned | Storage tab → Scan FTP |
| Cannot edit server | Operator role | Login as super admin |
| Map blank grey | No tile internet (APAC) | Needs internet for OSM tiles; CN pack uses offline tiles |

---

## Document map

| You need… | Read… |
|-----------|-------|
| Install Docker, bats, first login | **Quick Guide** |
| SIP, firewall, BWC registration, operators | **Configuration Manual** |
| Day-to-day dashboard use | **This User Manual** |
