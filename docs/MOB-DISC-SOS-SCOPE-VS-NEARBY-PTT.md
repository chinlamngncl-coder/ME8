# MOB DISC — SOS ledger scope vs nearby rescue PTT / HQ view

**Status:** DISC only. Ledger re-test = **PASS** (2026-07-08). This note answers mutual-aid / HQ visibility — not an APPLY.  
**Related:** `mob-me8-sos-ledger-dispatch-scope` (done), live genre `mob-live-sos-ptt-poc` (later, risk 5).

---

## Your scenario

- Operator **A** (Station Alpha) must **not** see Station Bravo’s ledger rows → **PASS = correct.**  
- Cam **B** (Bravo) raises SOS. System draws **nearby circle** and may want Cam **A** (Alpha, geographically near) on the **response PTT team** for rescue.  
- Questions: Does Cam A get PTT? How does Team A’s **operator at HQ** see Bravo’s SOS?

---

## Two different scopes (do not collapse them)

| Scope | What it filters | Habit |
|-------|-----------------|--------|
| **Operator visibility** (dashboard) | Ledger, CSV, folder open, map pins, fleet list, **SOS alarm banner for that session** | Station TOC sees own groups |
| **Device PTT team** (camera talk group) | Which **BWCs** join the SOS response channel | Geometry / explicit add — **not** “same dispatch group” |

Enterprise CAD / VMS / radio does the same split: **who may monitor the incident** ≠ **who may talk on the channel**.

---

## What ME8 does today (honest)

1. **Nearby list** (`computeSosNearby`) is GPS distance around the SOS cam — drawn from pins the **browser session already has**. Scoped Operator A typically **has no Cam-B pin** → may never see Bravo’s SOS UI / circle for that incident.  
2. **Push team / ack helpers** APIs call `assertSessionCanAccessCam` on **alarm cam and every helper**. If Operator A cannot “see” Cam-B (or other helpers), **API 403** — they cannot author that team.  
3. **Device-to-device PTT** after a **super admin / see-all** (or in-scope) operator builds the team is a **radio path** — Cam A can be on the talk group even if Operator A’s dashboard is scoped.  
4. **Ledger** stays group-filtered for Operator A after the fact — history privacy ≠ live mutual aid.

So: **Ledger PASS does not by itself give Operator A PTT control over Bravo SOS.** Nearby rescue for out-of-group cams is intended for **Corporate / see-all / NHQ** desk (or a future “mutual aid” break-glass), not for every station TOC.

---

## How “big software” usually does it

| Pattern | Behaviour |
|---------|-----------|
| **Home station owns the ticket** | Owner sees full incident; others do not by default. |
| **Mutual aid / assist** | Explicit invite, or auto-suggest nearby units to a **higher role** / Incident Commander. Assisting cams get radio; assisting **operators** get **temporary incident ACL**, not forever full ledger of the other station. |
| **NHQ / SOC wall** | See-all role (your super admin / See all groups) — always sees B’s SOS, builds nearby team, can include Cam A on PTT. |
| **Geo ≠ RBAC** | Map distance can **nominate** helpers; **permissions** still decide who may act and who may watch. |

Wrong enterprise pattern: “anyone near on GPS automatically gets full SOS + full ledger of another org unit.” That fails audit and multi-agency tenders.

---

## Recommended product logic for Ubitron (locked for later live MOB — not now)

| Role | Sees B’s SOS live? | Can push nearby PTT including Cam A? | Sees B on ledger later? |
|------|--------------------|--------------------------------------|-------------------------|
| Super admin / See all | Yes | Yes | Yes |
| Station A operator (Alpha only) | **No** by default | **No** by default | **No** |
| Optional later: “Mutual aid” grant | Temporary yes on **that incident** | Yes for that incident | Soft: that incident only (not whole Bravo history) |

**Cam A on PTT:** Yes, when an **authorized** desk (NHQ) includes Cam A in the response team — device radio independent of Operator A’s ledger scope.  
**Team A operator at HQ:** Use **Corporate / See all** account — or sit NHQ on the same see-all role. Station A TOC is not supposed to pilot Bravo SOS unless you add mutual-aid later.

---

## Do **not** “fix” ledger PASS by making Station A see all SOS

That would undo the ship gate you just passed. Any nearby↔PTT↔cross-group visibility belongs in **`mob-live-sos-ptt-poc`** (risk 5) with an explicit mutual-aid rule — separate MOB, checkpoint ritual.

---

## Rejected idea — “Everyone into super-admin tab, then forced logout”

**What was proposed:** During multi-group nearby SOS, all operators use one UI/tab “like super admin”; after the home SOS team acks, they must log out; somehow NHQ sees they “can’t log out.”

**Verdict: do not build this.** Intent (one shared rescue desk) is good; mechanism fights enterprise auth and your ledger PASS.

| Claim | Problem |
|-------|---------|
| Station users “become” / open **super admin** tab | Super admin = site authority (users, SIP, settings). Borrowing that name for SOS = privilege confusion + audit lies |
| Shared elevated UI for A/B/C/D | Fine as a **feature**, not as “you are now global” |
| **Forced logout** after ack | Breaks continuous ops (second SOS, map, PTT still needed); password re-entry mid-shift; training nightmaress |
| Super admin “sees they can’t log out” | Means **session lock / duty mode** — wrong signal. Ops software uses **Incident active / Assist active**, not hostage logout |

Big CAD/VMS/SOC: keep your **same login**; open an **Incident / Mutual-aid** panel; when closed, panel ends — **no logout**, no role rename.

---

## Better pattern (locked preference)

### One UI — rename the concept

| Do | Don’t |
|----|--------|
| One **SOS Command** / **Mutual aid** panel (ops wall) for multi-group nearby | Don’t call it “Super admin tab” |
| NHQ / see-all **or** temporary **incident grant** opens that panel | Don’t make every station operator a super admin |
| Panel shows: alarming cam, nearby from **all groups**, push team, live strip for **this incident** | Don’t dump full Server Config / Users |
| On **ack / team end / clear**: close panel + drop temporary grant | **No forced logout** |
| Optional: banner “Assist active — Bravo SOS” until clear | Optional soft “End assist” — never “you may not log out” |

### Who uses the panel

| Mode | Who | Logout? |
|------|-----|---------|
| **A — NHQ desk** (recommended v1) | Existing super admin / See all — they already have the power | Stay logged in |
| **B — Assist grant** (Phase 2 later) | Station operator invited into **this** SOS only | Stay logged in; grant expires |
| **C — Shared kiosk user** | One physical “Command” PC with see-all — SOP, not product privilege escalation | Stay logged in |

Forced logout is never required for security here: **end the grant** and ledger stays scoped again.

---

## What to think (plain)

- Your instinct for **one shared rescue UI** across A/B/C/D is right.  
- Mapping that UI to **“super admin” + forced logout** is the wrong enterprise habit.  
- Risk if built as proposed: **5** (auth + live SOS + role confusion) and would look amateur next to CAD.  
- Risk if built as **SOS Command panel + see-all nearby (Phase 1)**: **4**, then Phase 2 assist grant **5** — same as prior DISC, without logout games.

Stick with cross-group rescue doc Phases 0→1→2; add UI name **SOS Command / Mutual aid**, not Super admin tab.
