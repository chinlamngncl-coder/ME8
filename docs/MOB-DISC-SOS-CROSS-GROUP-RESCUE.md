# MOB DISC — Cross-group SOS rescue (mutual aid)

**Status:** DISC locked. **Do not APPLY into live until you name a slice** — this is risk **4–5**.  
**Prerequisite:** Ledger scope **PASS** stays — Station A still must not get full Bravo **history**.  
**Parent:** `MOB-DISC-SOS-SCOPE-VS-NEARBY-PTT.md`

---

## Goal

When Cam **B** (Bravo) SOS’s and Cam **A** (Alpha) is **nearby**, authorized ops can put Cam A on the **response PTT team** for rescue — without giving every Alpha operator full Bravo ledger forever.

---

## How enterprise CAD / radio usually does it

1. **Incident owner** (home station or NHQ) sees the alarm.  
2. **Suggest** nearby units by GPS (any fleet, or mutual-aid fleet).  
3. **Device radio** can join helpers across org units.  
4. Assisting **operators** get **temporary** visibility of **that incident** (live banner / map focus), not whole foreign station history.  
5. Audit: who invited whom, when.

ME8 today ≈ step 3 only when the desk already has see-all; steps 2–4 are incomplete for scoped desks.

---

## Recommended ME8 product (phased)

### Phase 0 — Already works (no MOB)

| Actor | Can build nearby team including Cam A? | Sees Bravo ledger? |
|-------|----------------------------------------|--------------------|
| Super admin / See all groups | Yes | Yes |
| Station Alpha only | No | No |

**Ops SOP until Phase 1:** Mutual-aid / HQ desk uses **See all** (or NHQ account) for cross-group rescue. Cam A still receives PTT if that desk includes them.

### Phase 1 — NHQ / see-all nearby uses **full fleet GPS** (not only pins on map)

**MOB (name):** `mob-sos-nearby-fleet-gps-see-all`  
**Risk: 4** — touches SOS nearby computation / map helpers; **checkpoint ritual** (ME8).  
**Idea:** For see-all sessions only, `computeSosNearby` (or server suggest API) uses fleet GPS for **all** cams, so Bravo SOS can nominate Alpha cams even if pins were lazy.  
**Does not** open ledger for station operators.  
**Bench:** See-all desk, B SOS, A in radius → A listed → Push team → A on PTT; Alpha-only operator still no B ledger.

### Phase 2 — Mutual-aid live visibility (optional, later)

**MOB:** `mob-sos-mutual-aid-live-grant`  
**Risk: 5** — socket `sos-alarm` filter, live strip, maybe map focus; **must not** widen ledger/CSV/folder by default.  
**Idea:** When Cam A is **on the active response team** for incident B, Operator A’s session may receive **live** SOS/UI for **that camera/incident only** until team ended / ack closed. Ledger list stays group-scoped unless you add a separate “assist incidents” row later.  
**Audit:** `sos.mutual_aid.grant` / clear.

### Phase 3 — Station desk may **suggest** only (optional)

**Risk: 5** — usually **skip** for v1. Letting Alpha-only operator open foreign SOS without NHQ is the tender foot-gun. Prefer Phase 0–2.

---

## What we will **not** do

| Anti-pattern | Why |
|--------------|-----|
| Auto-grant all nearby operators full ledger of other stations | Breaks PASS / tender scope |
| Remove `assertSessionCanAccessCam` for helpers with no grant | Cross-group abuse |
| Bundle Phase 1–2 with password MOBs or Settings genre | Wrong risk class |

---

## Risk summary

| Work | Risk | Why |
|------|------|-----|
| Password unify 12 + hint | **1–2** | Auth UI / policy — Settings-safe |
| Phase 1 nearby full GPS (see-all) | **4** | SOS nearby / map path — checkpoint |
| Phase 2 mutual-aid live grant | **5** | Live SOS socket + wall habits — checkpoint + no ledger widen |
| Phase 3 station-initiated foreign SOS | **5** | Avoid until customer asks |

---

## Suggested order (your call)

1. Password genre first (users screaming daily).  
2. Then **Phase 1** only if NHQ cannot see Alpha on nearby today.  
3. Phase 2 only if Station A operators must **see live** Bravo SOS when Cam A is assisting — otherwise Phase 0 SOP is enough.

Reply examples:

- `MOB-APPLY mob-password-unify-12-both-roles`  
- `MOB DISC` already locked for rescue — when live: `MOB-APPLY mob-sos-nearby-fleet-gps-see-all` (Phase 1)

---

## Rejected — “Everyone into super admin tab, then forced logout”

**Proposal:** One shared UI for groups A/B/C/D nearby SOS; all users go to a “super admin” tab; after home team ack they must log out; NHQ somehow sees they “can’t log out.”

**Verdict: no.** Shared rescue desk = good. “Become super admin” + forced logout = wrong.

| Idea | Why it fails |
|------|----------------|
| Station ops open **super admin** chrome | Super admin = Users / Server / SIP — not an SOS room. Privilege + audit mess |
| **Forced logout** after ack | Mid-shift chaos; blocks second SOS / map / PTT; bad training |
| NHQ sees “can’t log out” | Real products use **Incident active / Assist active**, not hostage sessions |

**Enterprise habit:** same login → open **SOS Command / Mutual aid** panel → on clear, panel closes and temporary grant ends → **stay signed in**. Ledger scope stays; no role rename.

Prefer: Phase 0 NHQ see-all, then Phase 1 full-fleet nearby, then optional Phase 2 incident-only assist grant — not a fake super-admin tab.