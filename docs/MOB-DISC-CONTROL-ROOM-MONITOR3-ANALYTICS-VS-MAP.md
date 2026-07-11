# MOB DISC — Control room Monitor 3: Analytics vs map

**Status:** DISC 2026-07-11 — **no APPLY** until you name MOB  
**Trigger:** On Command Wall → **Control room**, consider changing **Monitor 3 (map)** to **Analytics** — Ops already has map + pop-out for multi-monitor sites; single-monitor users get Analytics via license/rights.  
**Search:** control room, monitor 3, map popout, analytics popout, PNP tender, POC-6, S4-10  
**Related:** `MOB-DISC-DISPLAY-ROOM-POPOUT-VS-TAB.md`, `MOB-DISC-ANALYTICS-LICENSE-HUB.md`, `MOB-DISC-ENTERPRISE-VMS-SIX-DOMAINS.md`, `MOB-DISC-FR-MAP-AUTO-GATE-80-AND-ANALYTICS-ESCAPE.md`

---

## Plain answer

| Question | Answer |
|----------|--------|
| Good idea to put **Analytics** on Monitor 3? | **Yes for FR-heavy / POC-6 demo rooms** — not as a blind swap for every customer |
| Was **control room** required by PNP tender? | **Multi-monitor VMS / control room story — yes (Domain A, industry norm).** **Monitor 3 = map specifically — product convention, not a quoted PNP line in repo docs** |
| Was **map on a dedicated display** required? | **Implied by live-ops + SOS on map (Domain D), not “Monitor 3” by number** |
| Was **Analytics on Monitor 3** required? | **POC-6 / S4-10 requires face watchlist demo — yes as capability; dedicated HDMI slot is our layout choice** |
| Safe to remove map from control room? | **No** — keep map on **Monitor 1 (Operations)** + **map pop-out**; only change what Monitor 3 **opens** |

---

## Part A — What exists today (code)

### Command Wall → Control room (4 monitor cards)

| Monitor | Label today | Button action | Pop-out URL |
|---------|-------------|---------------|-------------|
| **1** | Operator desk | Use this window for **Operations** | Tab switch (same window) |
| **2** | Wall monitor | Open video wall on monitor 2 | `/command-wall.html` |
| **3** | **Map monitor** | Open map on monitor 3 | `/?popout=map` |
| **4** | Status board | Open on monitor 4 | `/command-centre.html` |

**Open all monitors** → pop-outs for 2–4 + this window switches to **Operations** (`cw-display-room.js`).

### Map is not “only” on Monitor 3

| Path | Map access |
|------|------------|
| **Monitor 1 — Operations** | Full map, SOS, PTT, fleet, pin popups |
| **Ops toolbar** | **Map pop-out** (`?popout=map`) — mirror mode for 2nd/3rd screen |
| **Monitor 3 card** | Same map pop-out launcher |
| **FR Go to map** | Switches to Ops + focus (or explicit from Analytics) |

So Monitor 3 is a **launcher**, not the only map in the product.

### Analytics today

| Path | Behaviour |
|------|-----------|
| Top nav **Analytics** | In-app tab `#app-view-analytics` |
| **No** `?popout=analytics` | Does not exist yet |
| License | Server `analytics.face_fr` / `isFrLicensed()` |
| Per-operator | Super-admin + dashboard auth (module gate in hub) |

---

## Part B — PNP / tender check (repo evidence)

Source in tree: `MOB-DISC-ENTERPRISE-VMS-SIX-DOMAINS.md` (from `BWC_PostQual_Reference_v3.docx` — docx not in repo).

| Tender ref | What it asks (software) | Control room link |
|------------|-------------------------|-------------------|
| **S4-1, S1-VMS, POC-3** | Browser VMS, deployment, hierarchy | Domain **A** — “multi-monitor command wall SOP” listed as MOB work |
| **S4-11, S4-12, S1-SOS, S1-PTT, POC-1/2/4/5** | Live ops, SOS, PTT | Map on **Operations** — dispatch truth |
| **S4-10, POC-6** | Face detect + watchlist + alerts | Domain **E** — **Analytics hub**, not “Monitor 3” |
| **S4-6** | Audit / scope | Operator permissions — fits “super admin grants Analytics” |

### What PNP tender does **not** say (in our DISC corpus)

- “Monitor 3 shall display map”
- “Replace map with face recognition”
- “PNP-specific control room” (org names are **banned** from UI — generic **control room** only)

### What tender **does** need you to demo

1. **Live ops + SOS + map** (Domain D) — typically **Monitor 1 = Operations**  
2. **Video wall** (Domain A/D) — **Monitor 2**  
3. **Face watchlist / alert** (POC-6) — **Analytics** surface (today: in-app tab; tomorrow: optional pop-out)  
4. **Supervisor KPIs** — **Monitor 4** status board  

**Verdict:** Swapping Monitor 3 to Analytics is **aligned with POC-6 storytelling**, not a tender **mandate** to drop map from the room layout. Map remains required **somewhere** (Ops + pop-out).

---

## Part C — Your proposal (assessed)

> Multi-monitor: use map pop-out from Operations.  
> Single monitor: super admin grants Analytics.  
> Control room Monitor 3 → **Analytics** instead of map.

### Pros

| Point | Why |
|-------|-----|
| Map duplicated on M1 + M3 | M3 card is redundant when Ops + pop-out already exist |
| FR watch is **Analytics** work | Dedicated HDMI for 6-tile + snap rail matches control-room VMS pattern |
| POC-6 rehearsal | Evaluators see **face watch on big screen** without tab hunting |
| License story | Analytics module = purchasable; map stays in base VMS |

### Cons / risks

| Risk | Detail |
|------|--------|
| **No analytics pop-out yet** | MOB must add `/?popout=analytics` or `analytics.html` shell |
| **SOS dispatcher habit** | Some sites train “map = monitor 3”; changing default confuses without config |
| **FR alert escape** | We just wired **Go to map → Ops**; FR desk on M3 still needs **Go to map** or split role (watch vs dispatch) |
| **8-live budget** | Analytics 6-tile + Ops pins + wall = shared cap (unchanged) |
| **Locked surfaces** | Pop-out mode must not touch `video-wall.js` / SOS / PTT core |

---

## Part D — Locked recommendation (do not hard-swap)

### Rule 1 — Map stays in base product

- **Monitor 1** = Operations (map, SOS, PTT) — **unchanged**  
- **Map pop-out** on Ops — **unchanged**  
- Tender live-ops story intact  

### Rule 2 — Monitor 3 = **configurable role**

| Profile | Monitor 3 opens | Default |
|---------|-----------------|---------|
| **`map`** | `/?popout=map` (today) | **Ship default** — generic VMS / SOS sites |
| **`analytics`** | `/?popout=analytics` (new) | **Lab / POC-6 / FR-licensed sites** |

Env sketch:

```env
FM_DISPLAY_MONITOR3=map          # or analytics
```

Settings → Control room: dropdown **Monitor 3: Map mirror | Face watch (Analytics)** — super-admin only.

### Rule 3 — Rights (your super-admin point)

| Layer | Today | Target |
|-------|-------|--------|
| Server license | `analytics.face_fr` | Must be on for Analytics monitor |
| Operator | Dashboard auth / role | Optional **`analytics` permission** — hide tab + block pop-out if denied |
| Single-monitor user | Nav → Analytics | Same gate; no second HDMI needed |

**Do not** use Monitor 3 as a substitute for license — unlicensed server shows grey gate message in pop-out.

### Rule 4 — FR + map dispatch (recent MOBs)

| Role | Screen | FR hit behaviour |
|------|--------|------------------|
| **Watch officer** | Analytics (M3 or tab) | Toast, rail, optional auto @ 80% |
| **Dispatch officer** | Operations (M1) | Map focus, SOS, PTT |
| **Same person, one monitor** | Analytics | **Go to map** / HQ **Go to map** (applied MOBs) |

Monitor 3 = Analytics does **not** remove need for Ops map — it clarifies **roles in 4-head rooms**.

---

## Part E — Proposed MOB sequence (when approved)

| # | MOB | Delivers | Risk |
|---|-----|----------|------|
| **1** | **`mob-analytics-popout-shell`** | `?popout=analytics` — chromeless Analytics view (like map pop-out) | Low |
| **2** | **`mob-display-monitor3-profile`** | Control room card label + button follow `FM_DISPLAY_MONITOR3`; i18n Map vs Analytics | Low |
| **3** | **`mob-display-launch-all-profile`** | Open all monitors respects M3 profile | Low |
| **4** | Later | Per-operator `analytics` permission on pop-out | Med |

**Do not bundle** with FR map MOBs or wall changes.

### UI copy (locked direction)

| Today | Analytics profile |
|-------|-------------------|
| Monitor 3 title: **Map monitor** | **Face watch monitor** (or **Analytics monitor**) |
| Button: **Open map on monitor 3** | **Open face watch on monitor 3** |
| Hint: Map mirror | Analytics pop-out — FR watch tiles; map stays on Operations |

Keep **Monitor 2 = wall**, **Monitor 4 = status board**, **Monitor 1 = Ops**.

---

## Part F — What we should **not** do

| Idea | Why not |
|------|---------|
| Remove map pop-out from Ops | Tender + SOS need it |
| Rename Operations to Analytics | Ops is dispatch truth |
| Put Analytics only on M3 with no in-app tab | Breaks single-monitor users |
| Auto-open Analytics on every FR hit on all monitors | Escape MOBs already gate auto @ 80% |
| Change Monitor 1 to Analytics | Breaks step 3: “SOS acknowledge on Operations” |

---

## Part G — PASS checkpoint (after MOBs)

| # | Test |
|---|------|
| 1 | `FM_DISPLAY_MONITOR3=map` — behaviour identical to today |
| 2 | `FM_DISPLAY_MONITOR3=analytics` — M3 opens FR watch pop-out; M1 Ops map + SOS OK |
| 3 | Unlicensed FR — M3 shows license gate, not blank |
| 4 | Open all monitors — 2=wall, 3=profile, 4=centre, this window→Ops |
| 5 | Map pop-out from Ops still works when M3=analytics |
| 6 | PTT / SOS / VC / command wall video — smoke unchanged |

---

## Bottom line

| Topic | Locked |
|-------|--------|
| PNP asked for control room? | **Yes** (generic multi-monitor VMS story) |
| PNP asked for Monitor 3 = map? | **Not explicitly** in repo tender DISC |
| PNP asked for face watch / POC-6? | **Yes** (S4-10) — Analytics capability |
| Your idea | **Good as optional Monitor 3 profile**, not global replacement |
| Next APPLY | **`mob-analytics-popout-shell`** then **`mob-display-monitor3-profile`** — only when you say MOB |

Hard refresh + fleet restart not needed for this DISC; implementation MOBs are mostly client shell + display-room launcher.
