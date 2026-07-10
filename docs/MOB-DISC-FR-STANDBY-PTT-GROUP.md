# MOB DISC — `mob-fr-standby-ptt-group`

**Status:** **APPLIED** 2026-07-10 — checkpoint required  
**Date:** 2026-07-10  
**Risk:** **High** (PTT / SOS-adjacent — checkpoint required after APPLY)  
**Search:** FR standby PTT, response team, SOS PTT group, Alert field beep, face hit  
**Related:** `MOB-DISC-FR-SOAK-PASS-PTT-WORDS-STANDBY.md`, `MOB-DISC-FR-ALERT-UX-SOS-VS-FR-REPORT.md`, `MOB-DISC-SOS-SCOPE-VS-NEARBY-PTT.md`

---

## What this MOB is

On a **watchlist face hit**, let the operator **manually** push a **standby PTT response team** — same *radio* behaviour as SOS **PTT team**, **not** the single-BWC **Alert field** beep.

| Control | Meaning |
|---------|---------|
| **Ack** | Close interrupt |
| **Dismiss** | Close without weight |
| **Alert field** | Short beep/cue to the **catching BWC** only (`lib/frFieldAlert.js`) |
| **Standby PTT team** *(new)* | Put catching cam + nearby online units on one **push-to-talk group** (audio) |

**Operator words:** “Standby PTT team” or “Response PTT” — **never** call Alert field “PTT”.

---

## Product flow (locked)

```
FR hit → HQ bar (+ optional modal) → operator reads hit
       → [Standby PTT team]  ← manual, like SOS banner
       → catching BWC + nearby helpers join radio group
       → Ack / Dismiss (no SOS ack form)
       → FR sighting report / snap ledger later (separate MOBs)
```

Parallel to SOS — **separate door**:

```
SOS: distress → banner → PTT team → ack → SOS report
FR:  face hit → bar    → standby PTT → ack → FR report (later)
```

---

## Reuse (do not reinvent PTT wire)

| Piece | Reuse |
|-------|--------|
| Group push | `lib/sosResponseTeam.js` → `buildTeamPttDevices`, `pushPttGroupToTeam` |
| SIP contact | `getContactUriForCam` (same as SOS routes) |
| Session scope | `assertSessionCanAccessCam` on alarm cam + every helper |
| PTT gate | `PTT_ENABLED` → 503 if off |

**Locked — do not edit without explicit user instruction:**

- `lib/pttServer.js`
- `lib/sipServer.js`
- `public/js/ptt-rx.js`

New server routes call **into** `sosResponseTeam`; they do **not** patch PTT core.

---

## APPLY scope (v1 — one MOB)

### Server — `server.js` only (new routes)

**`POST /api/analytics/fr/ptt-standby-team`**

```json
{
  "hitId": "optional-audit",
  "camId": "catching-bwc-id",
  "helperCamIds": ["…"]
}
```

- `camId` required (catching unit).
- `helperCamIds` optional array; server builds `team = unique([camId, ...helpers])`.
- Same push path as `/api/sos-ptt-team` but audit action **`fr.ptt_standby_team`** (not `sos.ptt_team`).
- Log: `log.ptt.info('fr standby ptt team', { hitId, camId, teamSize, pushed })`.
- Response shape mirrors SOS: `{ ok, pttTeam: { team, pushed, skipped, pttOnline } }`.

**Optional same pass (only if strip is in v1 UI):**  
`POST /api/analytics/fr/ptt-standby-team-add` — merge helpers into `existingTeam` (copy SOS add pattern).

**Do not:** create SOS ledger rows, emit SOS banner events, or reuse `/api/sos-ptt-team` (audit + semantics must stay FR).

### Client — `public/js/fr-alarm.js`

- New button handler **`pushFrStandbyPttTeamNow()`**.
- Uses **current hit** `camId` from `current` alarm state.
- Nearby helpers: online units within radius (see below).
- Toast on push (mirror SOS `#sos-ptt-team-toast` pattern — new `#fr-ptt-standby-toast` or reuse styling class).
- On success: show team summary (names + pushed count); keep modal/bar open until Ack.
- **No auto-push on hit** in v1.

### Markup — `public/index.html`

- Add button in `#fr-alarm-actions` (after Alert field):

  `id="fr-alarm-standby-ptt"` · label **Standby PTT team**

- Optional: same action on `#fr-hq-alert-bar` when modal dismissed (operator can push from any page).
- Minimal CSS (toast / active state) — index.html CSS-only rule OK.
- **Small shared helper** in existing inline script block:

  `window.computeNearbyForCam = function (camId, radiusM) { … }`

  Same maths as `computeSosNearby` but center = GPS of `camId` from `sosDevicePositionsForScan()` (or fleet pin). Export only; do not refactor SOS banner in this MOB.

### i18n — `public/locales/en.json` (text only)

- `analytics.fr.standbyPttTeam` — “Standby PTT team”
- `analytics.fr.standbyPttTeamTitle` — “Push catching unit and nearby online BWCs to one PTT group (audio only)”
- Toast strings for pushing / success / failure / no nearby

### Not in v1

- Auto standby on hit
- Map circle UI (SOS-style radius picker) — use fixed **500 m** default, same as SOS default; nearest-unit confirm if empty inside radius
- “End response team” sidebar (SOS has `#sos-ptt-team-end`) — defer unless operator asks
- FR report form
- Changes to `frFieldAlert.js`

---

## Nearby helpers (v1 behaviour)

Match SOS banner discipline:

1. Center = catching BWC last known GPS (fleet scan).
2. Radius = **500 m** (constant; no FR radius dropdown in v1).
3. Max helpers = same cap as SOS (`SOS_RESPONSE_MAX` if exposed, else 8).
4. Include only **online** helpers in auto list.
5. If none inside radius: confirm push to **nearest online** unit (SOS `computeNearestSosUnit` pattern).
6. If none online: alert — no silent fail.

**Scope:** Every cam in the push list must pass `assertSessionCanAccessCam` — station TOC cannot push Bravo units they cannot see (same as SOS; see `MOB-DISC-SOS-SCOPE-VS-NEARBY-PTT.md`). NHQ / see-all builds cross-group standby.

---

## PTT group identity

- Use same `snid: '77'` and device table builder as SOS unless lab proves a distinct group id is required.
- HQ device row in `buildTeamPttDevices` stays (command can monitor).
- v2 disc if product wants FR standby on a **different** group id from SOS incidents.

---

## Test plan (checkpoint)

After APPLY + `RESTART-FLEET.bat` + hard refresh:

1. **Regression:** Live, Open All, SOS, normal PTT talk, SOS PTT team — still PASS.
2. **FR hit:** HQ bar + modal; **Alert field** still beeps catching BWC only.
3. **Standby PTT team:** With 2+ online BWCs near catching unit → push → all hear same group; operator PTT RX unchanged.
4. **Scope:** Scoped operator cannot push out-of-group helper (403).
5. **No SOS bleed:** FR standby does **not** raise SOS banner or ledger row.
6. **Ack:** Closes FR UI; radio group may persist (same as SOS — document actual device behaviour in checkpoint reply).

Reply **CHECKPOINT PASS** or **CHECKPOINT FAIL** (+ what broke).

---

## Rejected / out of scope

| Idea | Why not |
|------|---------|
| Rename Alert field to “PTT” | Conflicts with standby group meaning |
| Reuse `/api/sos-ptt-team` | Wrong audit + blurs SOS vs FR |
| Auto-push team on every hit | Too noisy; v2 only with grade/rules |
| Patch `pttServer.js` for FR | Locked; reuse `pushPttGroupToTeam` |
| Merge FR into SOS ack form | Already rejected in alert UX disc |
| Stack with half-face / HQ nonblocking / smooth beep | One MOB at a time — user picks order |

---

## Suggested APPLY order (user choice)

| Priority | MOB | Why |
|----------|-----|-----|
| A | `mob-fr-hq-alert-nonblocking` | Ops trapped on FR page during hit |
| B | `mob-fr-snap-half-face-strict` | User already has APPLY string |
| C | **`mob-fr-standby-ptt-group`** | High risk — after A or B if desired |
| D | `mob-fr-field-alert-smooth-cue` | Beep quality |

---

## APPLY command

When ready (one MOB only):

```
MOB-APPLY mob-fr-standby-ptt-group
```

Expected touch: `server.js`, `public/js/fr-alarm.js`, `public/index.html` (button + nearby helper + CSS), `public/locales/en.json`.

**Do not** bundle with crop, beep, or HQ bar MOBs in the same pass.
