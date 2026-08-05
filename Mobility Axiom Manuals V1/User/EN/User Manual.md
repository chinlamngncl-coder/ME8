# Mobility Axiom User Manual

**Version:** V1  
**Audience:** Dispatchers, supervisors, control-room operators, evidence staff  
**Language:** English master  
**Purpose:** This manual explains how to use Mobility Axiom step by step in daily operations.

---

## 1. About This Manual

This is the **operator manual** for Mobility Axiom.

Use this manual when you need to:

1. Sign in and start work
2. Watch live body-worn camera video
3. Use PTT or Call
4. Respond to SOS
5. Review evidence
6. Use Command Wall, Centre Summary, Video Conference, Analytics, Tactical, and CAD / RMS

This manual is written for **daily users**.  
It avoids deep technical setup and server engineering detail. Those belong in the **Tech Manual**.

---

## 2. Before You Start

Before using the dashboard, confirm:

1. The Mobility Axiom server is already running
2. You have a valid username and password
3. Your browser can open the dashboard page
4. At least one body-worn camera is online if you want to test live functions

**Recommended browsers**

1. Google Chrome
2. Microsoft Edge

**Expected result**

You can reach the login page and sign in successfully.

**Screenshot placeholder**

`[Insert Screenshot U-01: Login page with username, password, sign in button, and language selector]`

---

## 3. Sign In

### Purpose

Use your operator account to enter the dashboard.

### IMPORTANT — First sign-in (new install only)

1. Your administrator or install pack provides the **first-time** username and password (typically **`global`** / **`global123`** on a new server).
2. Use those credentials **once** to sign in.
3. Mobility Axiom **does not allow** you to keep the default password. After sign-in, you are taken to **Change your password** before you can use the dashboard normally.
4. Choose a **new password** that meets the rules on that screen (at least 12 characters, with upper case, lower case, a number, and a symbol).
5. After you save the new password, sign in again with **`global`** and your **new** password — **not** `global123`.
6. **Do not share or reuse** the factory password. It stops working after the first change.

### Steps (all users)

1. Open Chrome or Edge.
2. Enter the dashboard address provided by your administrator.
3. On the login page, type your **Username**.
4. Type your **Password**.
5. If needed, choose your **Language** before signing in.
6. Click **Sign in**.

### 3.1 First Install — Change Your Password

Use this subsection only on a new server before the install password has been changed.

**Steps**

1. After first sign-in with install credentials, confirm you are on the **Change your password** screen.
2. In **Current password**, type the install password (`global123` on a new server).
3. In **New password**, type a password that meets all rules shown on the screen.
4. In **Confirm new password**, type the same new password again.
5. Type the new password; do not paste into password fields.
6. Click **Save and continue**.

**Expected result**

The new password saves successfully. Sign in again with `global` and your new password. The dashboard then opens normally.

### Expected result (Sign In)

- **Returning site:** You enter the main dashboard and land on the working screen.
- **New install (first time only):** You reach **Change your password** first. After you save a new password and sign in again, the dashboard opens.

### Common problems

- **Stuck on Change your password:** You must pick a new password that meets all rules; you cannot keep `global123`.
- **global123 no longer works:** Normal after first change — use the new password you set.
- **Login page does not show factory hint:** Expected on sites that already changed the install password.
- **Login rejected:** Check spelling, Caps Lock, and saved browser passwords.
- **Page does not open:** Contact your administrator and confirm the server is running.

**Screenshot placeholders**

`[Insert Screenshot U-02: Completed login form before sign in]`

`[Insert Screenshot U-02a: Change your password screen after first sign-in]`

---

## 4. Change Language

### Purpose

Use the dashboard in the language that is most comfortable for the operator.

### Steps

1. On the login page, use the **Language** selector before signing in, or
2. After signing in, open the **Language** selector in the header area.
3. Click the language you want.

### Expected result

The visible labels, buttons, and headings update to the selected language.

### Notes

1. The exact available languages depend on the delivered pack.
2. If some words still appear in English, that section may not yet be translated in your current pack.

**Screenshot placeholder**

`[Insert Screenshot U-03: Language selector in the dashboard header]`

---

## 5. Know the Main Tabs

### Purpose

Understand what each top tab is for before starting work.

### Main tabs

1. **Operations**  
   Daily live work: fleet list, map, SOS, PTT, live wall, messages

2. **Evidence & Docking**  
   Search and review files, case work, route replay, dock uploads

3. **Command Wall**  
   Large-screen wall and display-room workflows

4. **Centre Summary**  
   Summary panels, health, activity, overview widgets

5. **Video Conference**  
   Room-based browser/phone/video conference features

6. **Settings**  
   Account access, selected admin areas, audit access, and operational settings depending on role

7. **Analytics**  
   Face-related tools and other licensed analytics modules

8. **CAD / RMS**  
   CAD / incident workspace when licensed

9. **Tactical**  
   Tactical planning, overlays, pins, and incident preparation tools

### Expected result

You know which tab to open for each job.

**Screenshot placeholder**

`[Insert Screenshot U-04: Full top navigation with all main tabs highlighted]`

---

## 6. Operations Tab Overview

### Purpose

Operations is the main working screen for live monitoring and dispatch.

### What you will see

1. **Left side**: Device Summary, SOS, PTT groups, messages, and shortcuts
2. **Center**: Live map
3. **Right side**: Live video wall

### Typical uses

1. Check which devices are online
2. Open live video from a unit
3. Respond to SOS
4. Use PTT
5. Monitor multiple active units

### Expected result

You can identify the main working areas without confusion.

**Screenshot placeholder**

`[Insert Screenshot U-05: Operations screen with left panel, map, and live wall labeled]`

---

## 7. Use the Device Summary (Fleet List)

### Purpose

The Device Summary shows body-worn cameras and lets you start the most common actions quickly.

### Step-by-step

1. Open the **Operations** tab.
2. Locate the **Device Summary** list.
3. Use the search box if needed.
4. Look at the device status.
5. Use the row actions:
   - **Pin** to open that unit on the map
   - **PTT** to talk by push-to-talk
   - **Call** to start a voice call
   - **GPS** to inspect route or location history

### Expected result

You can find a unit and start the correct action from one row.

### Important note

Use the **Device Summary** as the fastest way to reach a specific unit during live operations.

**Screenshot placeholder**

`[Insert Screenshot U-06: Device Summary row with Pin, PTT, Call, GPS actions labeled]`

---

## 8. Open Live Video from a Unit

### Purpose

Watch a selected body-worn camera live from the map or wall.

### Method A — from the fleet row

1. Open **Operations**.
2. Find the device in **Device Summary**.
3. Confirm the device is **Online**.
4. Click **Pin**.

### Method B — from the map

1. Find the unit pin on the map.
2. Click the map pin.

### Expected result

A live video panel opens for that unit, or the system focuses the stream for viewing.

### Notes

1. A device must be online before live video can start.
2. If the video does not appear, wait a moment for the stream to connect.

### Common problems

- Device is offline
- Network delay
- Live stream limit already reached

**Screenshot placeholder**

`[Insert Screenshot U-07: Live pin video panel open on the map]`

---

## 9. Use PTT

### Purpose

Talk to one unit or a selected group using push-to-talk.

### Steps for one unit

1. Find the unit in the fleet list or open its pin panel.
2. Press and hold **PTT**.
3. Speak clearly.
4. Release **PTT** when finished.

### Expected result

Your voice is sent to the selected unit while the button is held.

### Important note

PTT is **press-and-hold**.  
Do not tap quickly and expect a full transmission.

**Screenshot placeholder**

`[Insert Screenshot U-08: PTT button on fleet row and map panel]`

---

## 10. Use Call

### Purpose

Start a voice call to a unit when a continuous voice session is needed.

### Steps

1. Open **Operations**.
2. Find the unit in **Device Summary**.
3. Click **Call**.
4. Wait for the unit to answer.
5. End the call when the conversation is finished.

### Expected result

A voice call session starts without changing this into a video control workflow.

### Notes

1. Call behavior may depend on the connected device model and network state.
2. If the device does not answer, retry only after confirming the unit is online.

**Screenshot placeholder**

`[Insert Screenshot U-09: Call action on a fleet row]`

---

## 11. Respond to SOS

### Purpose

Handle an emergency alert quickly and consistently.

### Steps

1. Watch for the **red SOS banner**.
2. Read the unit identity and time.
3. Open the unit live view if it is not already open.
4. Check the map location.
5. Adjust the response radius if required.
6. Click **Acknowledge** when your procedure allows it.
7. If needed, create or activate the **PTT team**.
8. Press and hold **PTT** to speak to the response team.
9. Open the SOS record for further detail.

### Expected result

You can locate the alarmed unit, communicate with nearby responders, and record the incident workflow.

### Notes

1. Nearby units depend on online state and GPS availability.
2. Some organizations may require a case file or evidence follow-up after SOS.

### Common problems

- No nearby helpers listed
- GPS missing
- Unit online state changes during the incident

**Screenshot placeholder**

`[Insert Screenshot U-10: Active SOS banner with acknowledge and PTT team controls]`

---

## 12. Send Text Messages

### Purpose

Send short text instructions to online units.

### Steps

1. In **Operations**, open the **Messages** area.
2. Select an online unit.
3. Type the message.
4. Click **Send**.

### Expected result

The message is sent to the selected unit and appears in the conversation thread.

**Screenshot placeholder**

`[Insert Screenshot U-11: Messages panel with recipient list and send box]`

---

## 13. Use the Map

### Purpose

Track unit locations and use map-based actions.

### Steps

1. Open **Operations**.
2. Review device pins on the map.
3. Zoom in or out as needed.
4. Click a pin to inspect the unit.
5. Use the map toolbar for available actions such as:
   - Snapshot
   - Start/stop recording
   - Geofencing
   - Server recording

### Expected result

You can navigate the map and perform location-based actions safely.

### Note

The map is a working tool, not only a display. Operators should use it actively during incidents.

**Screenshot placeholder**

`[Insert Screenshot U-12: Map with toolbar and active device pins]`

---

## 14. Use the Video Wall

### Purpose

Monitor multiple live streams from the Operations tab.

### Steps

1. Open **Operations**.
2. Look at the video wall on the right.
3. Use existing assignments or open streams from the fleet/map.
4. If available in your role, use:
   - **Auto-rotate**
   - **Popout Matrix**
   - **Config**

### Expected result

Multiple live streams can be monitored together from one operator screen.

### Notes

1. The wall layout and total live capacity may differ from the number of visible wall panels.
2. Assigned panels and rotation rules may already be configured by administrators.

**Screenshot placeholder**

`[Insert Screenshot U-13: Operations video wall with multiple live panels]`

---

## 15. Evidence & Docking

### Purpose

Search, inspect, export, and organize evidence files.

### Main workflow

1. Open **Evidence & Docking**.
2. Choose the correct sub-area:
   - Overview
   - Docking Stations
   - Evidence Library
   - Case Files
   - Route & GPS
   - Storage (if permitted)

### Evidence Library steps

1. Open **Evidence Library**.
2. Use filters or search.
3. Open the required file.
4. Review details.
5. Download or export if your role allows it.

### Expected result

You can locate the correct file and continue your evidence workflow.

**Screenshot placeholder**

`[Insert Screenshot U-14: Evidence Library with filters and file list]`

---

## 16. Command Wall

### Purpose

Use a larger wall-oriented workspace for live supervision and control-room displays.

### Steps

1. Open **Command Wall**.
2. Choose the layout or wall mode you need.
3. Drag or assign live sources into the wall as allowed by the interface.
4. Use spotlight, rotation, or display-room functions as needed.

### Expected result

The control room can monitor selected live sources on a larger shared view.

**Screenshot placeholder**

`[Insert Screenshot U-15: Command Wall screen with live layout options]`

---

## 17. Centre Summary

### Purpose

Use the summary screen for management overview, health, and activity review.

### Steps

1. Open **Centre Summary**.
2. Review the summary widgets.
3. Change time range if needed.
4. Refresh the data.

### Expected result

You can see a quick operational summary without opening each individual workspace.

**Screenshot placeholder**

`[Insert Screenshot U-16: Centre Summary with KPI and status panels]`

---

## 18. Video Conference

### Purpose

Use conference rooms for browser/phone video meetings and live media collaboration.

### Steps

1. Open **Video Conference**.
2. Join or open a room.
3. Allow camera and microphone if your browser asks.
4. Use the room controls.
5. If allowed, add a body-worn camera share into the room.

### Expected result

You enter the room and can participate in the conference workflow.

### Notes

1. Some conference features depend on deployment and role permissions.
2. Device and browser permissions can affect microphone or camera access.

**Screenshot placeholder**

`[Insert Screenshot U-17: Video Conference room with participant tiles and controls]`

---

## 19. Analytics

### Purpose

Use licensed analytics tools for matching, review, and related alert workflows.

### Steps

1. Open **Analytics**.
2. Confirm the module is licensed and available.
3. Open the required analytics area.
4. Follow the on-screen workflow for that tool.

### Expected result

You can access the licensed analytics features that are enabled on your server.

### Note

Analytics availability may differ by license and deployment.

**Screenshot placeholder**

`[Insert Screenshot U-18: Analytics screen with module navigation]`

---

## 20. Tactical

### Purpose

Use tactical planning features such as layout preparation, incident preparation, and overlay tools.

### Steps

1. Open **Tactical**.
2. Review the active tactical workspace.
3. Open the incident or planning area required by your workflow.
4. Follow the task-specific controls shown in the workspace.

### Expected result

You can prepare or review tactical information without leaving the main product.

### Note

Some tactical features may be role-restricted or license-dependent.

**Screenshot placeholder**

`[Insert Screenshot U-19: Tactical workspace overview]`

---

## 21. CAD / RMS

### Purpose

Use CAD / RMS functions when the premium module is licensed.

### Steps

1. Open **CAD / RMS**.
2. If the screen is unlocked, review available incident or dispatch data.
3. If the screen shows a premium lock message, contact the administrator or license desk.

### Expected result

Licensed sites can use the CAD / RMS workspace. Unlicensed sites will see the protected state instead.

### Note

The CAD / RMS tab may be visible before full licensing is enabled, but the functions remain locked until the required license is present.

**Screenshot placeholder**

`[Insert Screenshot U-20: CAD / RMS tab in licensed or locked state]`

---

## 22. Settings for Operators

### Purpose

Use operator-safe settings and account actions.

### Steps

1. Open **Settings**.
2. Review the visible options your role allows.
3. Use account-related items such as:
   - Sign out
   - Language
   - Read-only views your role is permitted to access

### Expected result

You can use your allowed account and review tools without entering deep server configuration.

**Screenshot placeholder**

`[Insert Screenshot U-21: Settings screen for an operator-level account]`

---

## 23. Troubleshooting

### 23.1 Cannot sign in or stuck on Change your password

1. On first install, you must change the default password — you cannot keep `global123`.
2. If `global123` no longer works, use the new password you set during first sign-in.
3. Recheck username and password.
4. Confirm the correct server address.
5. Ask the administrator whether your account is active.

### 23.2 Device is offline

1. Check whether the unit is powered on.
2. Confirm the unit has network coverage.
3. Ask the administrator to confirm server-side registration.

### 23.3 No live video

1. Confirm the device is online.
2. Retry from the fleet row.
3. Wait briefly for stream setup.
4. If still unavailable, report the exact unit and time to the administrator.

### 23.4 PTT not heard

1. Press and hold the PTT button.
2. Confirm you are targeting the correct unit or group.
3. Ask another user to confirm audio reception.

### 23.5 SOS response list looks incomplete

1. Confirm GPS is updating.
2. Increase the radius if needed.
3. Check whether nearby units are online.

### 23.6 Evidence file not found

1. Search again using device, time, or source.
2. Check whether the file has finished uploading.
3. Ask the administrator to verify indexing or storage path health.

---

## 24. Good Daily Workflow

### Start of shift

1. Sign in
2. Check which units are online
3. Test one live view if required by your SOP
4. Confirm you can hear or use PTT if needed

### During an incident

1. Find the unit
2. Open video
3. Check map position
4. Use PTT or Call
5. Record the event if policy requires

### During SOS

1. Read the banner
2. Open the unit
3. Confirm location
4. Acknowledge
5. Build or confirm the response team
6. Coordinate with PTT

### End of shift

1. Close active work
2. Confirm any required evidence actions are complete
3. Sign out

---

## 25. Document Control

**Manual family:** Mobility Axiom Manuals V1  
**Manual type:** User  
**Language master:** EN  
**Next planned related manuals:**

1. Tech Manual
2. Quick Start Guide
3. Later language versions

