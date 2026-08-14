# MOB DISC — VC no fake online / live online-only BWC — 2026-08-11

**Status:** PAPER ONLY — no code this turn.  
**Read:** `.cursorrules` · zero-change without APPLY · your rule: **no fake online**.

**Symptom (your shot):** Host Tools says **“2 body camera online”** but BWC dropdown is only **—**; Chin/kk show **Online** in personnel / Who can join — you do not trust it; want **only real online**, **no refresh**, no hardcode that blocks other BWCs.

---

## Who broke the rules (root cause)

### 1) Server — fake “online” for group BWCs (main)

`server.js` → `onlineDeviceIdsForGroups()`:

```js
return fleetRegistry.getDashboardFleet().map((d) => d.id).filter(Boolean);
```

That returns **every fleet device id**, **not** devices with `online === true`.

Wired into conference as `getOnlineCamIds` → `conferenceModule.buildLobby` sets `member.online = online.has(camId)`.

**Effect:** Any dispatch-group BWC that exists in the fleet roster can show **Online** even when SIP/registry says offline. That is **fake online**. Violates your locked rule.

**Who:** This helper is product code in `server.js` (conference/dispatch path). Not Firmware Gold. Past conference/dispatch wiring — **agent must not have left “all fleet ids = online”.**

### 2) UI — fake “online” for dashboard operators

`public/js/conference-hub.js` → `renderLobby()` **Who can join** operators:

Every operator row is hard-coded `is-online` / green dot — **no presence check**.

**Effect:** Chin / kk as **dashboard users** always look Online in that list. That is also fake.

### 3) Not the main “hardcode register block”

CSV **template** in `lib/dispatchGroups.js` (Chin / Lee + sample `3402…` ids) is **import sample only** — not a SIP allowlist.  
New BWCs appear in VC **only if** they are in a **dispatch group** with correct `deviceId` **and** truly online. Template does not by itself stop SIP register.

Dropdown empty while count says 2: count uses `online && camId`; options skip cams already in room ingress — or stale lobby. Fixing (1) + live refresh is the path; diagnose ingress after truth-online.

---

## What “correct” means (locked intent)

| Surface | Must show |
|---------|-----------|
| BWC status + dropdown | **Only** cams with **real** fleet online (same truth as Ops) |
| Personnel group dots | Same real online |
| Who can join (operators) | Real session/presence **or** no Online chrome (do not paint all green) |
| New BWC | Register normally; appear when online + in group — **no hardcoded cam list** |
| Refresh | Lobby / BWC select **auto-update** on fleet presence (socket or short poll) — **no manual F5** |

Preserve: Stage/LiveKit, BWC ingress add flow, tracking elsewhere — **do not** invent SIP allowlists.

---

## Recommended fix MOB (one)

**Name:** `VC-ONLINE-TRUTH-LIVE-V1`

| Step | Change |
|------|--------|
| A | `onlineDeviceIdsForGroups` → **only** `d.online === true` (or fleetRegistry online helper) |
| B | Operators: stop hard-coded `is-online`; use real presence or omit Online |
| C | Live update: on `fleet-roster` / heartbeat (or 5–10s lobby poll while VC panel visible) → refresh BWC select + personnel **without** full page reload |
| D | Smoke: offline cam must not say Online; online cam appears in dropdown; third new BWC online appears without hardcode |

**Risk:** Low if filter is online-only. Do not touch Firmware Gold / DeviceControl.

---

## One next step

```text
MOB-APPLY VC-ONLINE-TRUTH-LIVE-V1
```
