# MOB DISC — Grade colour toasts · no jump (POI/monitoring/suspect) · Blacklist → map pin takeover + zone PTT

**Date:** 2026-07-23  
**Status:** PAPER — no code until named `MOB-APPLY`  
**Operator ask:**  
1) Colour toasts for **POI / monitoring / suspect**  
2) **No** jumping to map for those  
3) **Blacklist** → go to map; if **8 video pins** already running, **take over one** and **zoom** that pin with location  
4) Then **call / grouping PTT** for zone coverage to catch — *was that the idea?*  
**Genre:** FR alert UX (SOS-parity family)  
**Related:** `MOB-DISC-FR-GRADE-TIERED-ALERT-URGENCY.md`, `MOB-DISC-FR-ALERT-GO-OPS-MAP.md`, `MOB-DISC-FR-6TILE-OFFTILE-ALERT-SOP.md`, `MOB-DISC-FR-STANDBY-PTT-GROUP.md`, `MOB-DISC-FR-HIT-JUMP-MAP-AND-DS-GRADE-20260723.md`

---

## Straight verdict — yes, that was the idea

| Your idea | Locked product truth |
|-----------|----------------------|
| Soft grades ≠ red panic + map steal | **Yes** — grade drives urgency |
| Blacklist = real alert → map + video context | **Yes** — SOS-family FR SOP |
| Full wall (8 live) → steal one slot for catching BWC | **Yes** — pre-empt unpinned patrol / alert channel (see 6-tile / off-tile SOP) |
| Zone radio to catch | **Yes** — **Standby PTT team** (500 m nearby group) already APPLIED as a **button**; not auto on every hit |
| Voice **Call** (conference) vs PTT group | **Related but separate** — Call = VC door; Standby PTT = radio group. Do not mix words |

So: colour soft toasts + stay put for soft grades; **only Blacklist** forces Ops map + live pin takeover; operator then **Standby PTT** (or Call if you later wire that) for zone coverage.

---

## What exists today vs your ask

| Piece | Today | Gap |
|-------|--------|-----|
| Grades in Watchlist | `poi` / `monitoring` / `suspect` / `blacklist` | OK |
| Server interrupt | `poi`/`monitoring` **silent** (rail only); `suspect`+`blacklist` full interrupt | Suspect still **red** like blacklist |
| Colour toast | One red toast shell | No slate / gold / amber by grade |
| Auto jump to Ops | Suspect **and** Blacklist (if score ≥ ~80) | Soft grades should **never** jump; Blacklist yes |
| Map pan + pin pulse | `focusHitOnMap` on go-ops | Works when GPS / last-known |
| Take over 1 of 8 wall/map lives | Partial / incomplete vs SOP | **Not** reliable “full wall → steal one + zoom” |
| Standby PTT (zone radio) | HQ button → 500 m nearby push | Manual; map circle SOS-parity still thin |
| Auto Call (VC) on blacklist | Not the locked FR path | Optional later MOB — not v1 |

---

## Locked behaviour (target)

### Soft grades — colour toast, **no map jump**

| Grade | Toast / HQ colour | Auto → Ops / map | Interrupt |
|-------|-------------------|------------------|-----------|
| **POI** | Cool **slate** | **No** | Soft toast + HQ |
| **Monitoring** | **Teal** (not gold/amber) | **No** | Soft toast + HQ |
| **Suspect** | **Violet** (**not amber** — amber reserved for other UI) | **No** | Soft toast + HQ; soft beep |
| **Blacklist** | **Red** | **Yes** (see below) | Full HQ + chime |

**Phase 1 APPLIED 2026-07-23:** `MOB-APPLIED-FR-GRADE-COLOUR-TOAST-NO-JUMP-V1-20260723.md`


**Explicit Go to map** always allowed on any grade that shows a bar/toast.

### Blacklist — map + video takeover

```
Blacklist hit
  → red HQ + red toast (unless already on Ops)
  → switch to Operations (if not on Ops / wall / VC)
  → pan/zoom map to catching BWC pin (GPS or last-known)
  → if live wall / soft-open already has 8 videos:
       take over ONE unpinned slot with catching cam
       (never steal pinned without confirm — existing SOP)
  → operator: Standby PTT team → 500 m zone radio to catch
  → optional later: Offer Call / group invite (separate MOB)
```

**Analytics Face:** soft grades never leave Face. Blacklist may still jump to Ops (dispatch) — or stay on Face until Go to map if you prefer watch-first; **recommendation = Blacklist still jumps** (catch/dispatch), soft grades never.

---

## Recommended APPLY order (one at a time)

| Phase | Phrase | What |
|-------|--------|------|
| **1** | `FR-GRADE-COLOUR-TOAST-NO-JUMP-V1` | Colour toast/HQ by grade; **no auto go-ops** for poi/monitoring/suspect; blacklist keeps auto go-ops; wire silent grades to optional quiet toast if desired |
| **2** | `FR-BLACKLIST-MAP-PIN-TAKEOVER-V1` | On blacklist go-ops: zoom pin + **steal one of 8** live wall/map video slots for catching cam (unpinned first) | **APPLIED 2026-07-23** |
| **3** | `FR-BLACKLIST-ZONE-PTT-POLISH-V1` | After takeover: ensure Standby PTT + map 500 m cue feel SOS-parity (circle/summary if missing) — **not** new PTT core |

**Do not** bundle Call/VC auto-dial into phase 1–2. Call remains optional phase 4 if you name it.

**Risk pick first:** Phase **1** — you feel colour + no jump immediately; Blacklist still goes to map as today (takeover polish = phase 2).

---

## What we will **not** do

- Make POI/monitoring full red + map steal  
- Auto Standby PTT on every soft grade (noise)  
- Edit `lib/pttServer.js` / `sipServer.js` without you naming those files  
- Turn WVP handoff off  
- One mega-MOB for colour + wall steal + Call  

---

## Operator verify (phase 1)

1. Ctrl+F5.  
2. Hit a **Suspect** (or set **ds** to Suspect temporarily) while on Face → **amber** toast/bar, **stay** on Analytics.  
3. Hit a **Blacklist** → **red** + still **jumps** to Ops (until you ask to change that).  
4. POI/monitoring → quiet/coloured, no jump.

Phase 2 PASS: full 8-slot wall → blacklist hit → one tile becomes catching cam + map zoomed on that pin.

---

## Call vs grouping PTT (words)

| Control | Meaning |
|---------|---------|
| **Alert field** | Beep **one** catching BWC |
| **Standby PTT team** | Catching + **nearby** units → one **PTT group** (zone audio) — **this is the catch net** |
| **Call / VC** | Separate conference door — enhance later if you want “tap Call for zone” |

**Yes — zone coverage to catch = Standby PTT idea.** Button exists; polish after colour + pin takeover.

---

**First phrase when ready:** `MOB-APPLY FR-GRADE-COLOUR-TOAST-NO-JUMP-V1`
