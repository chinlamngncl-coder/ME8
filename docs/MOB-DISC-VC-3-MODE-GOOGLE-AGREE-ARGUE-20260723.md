# MOB DISC — Google VC 3-mode proposal · agent agree / argue

**Date:** 2026-07-23  
**Status:** PAPER — **no APPLY · no code**  
**Google:** Phase 1 = three operational layouts; Phase 2 = modern chrome; kickoff `VC-MEETING-LAYOUT-CLIENT-V1`  
**Prior disc:** `MOB-DISC-VC-MEETING-LAYOUT-CLIENT-20260723.md`  
**Keep:** LiveKit + Fleet VC backend. Layout/UI genre only.

---

## One-screen verdict

| Google idea | Agent | Lock |
|-------------|-------|------|
| Collapse 7 buttons → **3 mission modes** | **Agree** | Speaker · Operations · Focus |
| **Speaker + filmstrip** = default | **Agree** | Replaces Gallery-as-default |
| **Operations / Briefing** = content 70–80% + strip | **Agree** | Folds Briefing + Side-by-side |
| **Focus** = full-bleed, chrome on hover | **Agree with guard** | Need always-on chrome for touch / stress |
| Float bottom dock (Teams-like) | **Agree** | Primary meeting chrome |
| Badge overlays, kill “Shared content” headers | **Agree** | Short labels only |
| Smooth tile glide on layout switch | **Argue — defer** | V1 = snap clean; glide = later polish |
| Unified Content (BWC / screen / doc) | **Agree** | Already almost true in code — rename UX |
| Drag grips gone from default | **Agree** | Keep pin / dblclick; grips = advanced or gone |
| Incident **map** inside VC briefing | **Disagree for V1** | Map stays Ops / Tactical — not VC stage |

**Recommendation:** Adopt Google’s **3-mode product face** as the locked client VC layout. Name APPLY later: `VC-MEETING-LAYOUT-CLIENT-V1`. Do **not** invent a fourth primary button in V1; optional **Gallery** only as overflow under Layout menu if Google insists later.

---

## Phase 1 — Three modes (agent map to today)

```
GOOGLE MODE              TODAY (fragment)              V1 BEHAVIOR
─────────────────────    ──────────────────────────    ─────────────────────────
1. Speaker+Filmstrip  ←  Speaker (+ bits of Gallery)   DEFAULT; active/pinned large
                                                     + side or bottom filmstrip
2. Operations         ←  Briefing + Side-by-side       Content primary 70–80%
   / Briefing            + share split/deploy            + command strip
3. Focus              ←  Focus                         One stream full-bleed
                                                     chrome minimal / reveal
```

**Removed from primary chrome (not deleted from engine day-1):**  
Gallery equal-wall · 2-up · PiP · separate Side-by-side / Briefing buttons.

| Mode | Primary stage | Secondary | When |
|------|---------------|-----------|------|
| **Speaker** | Active speaker, pin, or escalating officer | Filmstrip (H or V) | Default calls |
| **Operations** | BWC / screen / doc (**Content**) | Compact people strip | Incident / share / BWC in room |
| **Focus** | Single stream only | None (until chrome reveal) | Pursuit / one feed |

### Auto rules (keep simple)

| Event | Mode behavior |
|-------|----------------|
| Join room, no share | **Speaker** |
| User starts screen / BWC / doc share | Offer or auto-switch **Operations** (one toast or silent — pick at APPLY: **silent auto** if only one content) |
| User picks Focus | Stay until they leave Focus |
| Pin a person in Speaker | That feed stays stage until unpin |
| Pin content | Jump **Operations** with that content on stage |

---

## Where we agree hard (no argument)

1. **Seven buttons = chrome fail** — operator is not tech; mission names beat scheme jargon.  
2. **Gallery-as-default caused the “video wall” feel** — kill that default.  
3. **Operations mode is the honest home for BWC-in-meeting** — not a fake equal face grid.  
4. **Headers “Shared content / Participants” must die** — badges only.  
5. **Bottom dock > top mash** of Layout+Share+Leave.  
6. **Content objects are interchangeable** — our `conference-layout.js` already treats screen/bwc/image/video/doc as share kinds; V1 is **product language + placement**, not a new media stack.

---

## Arguments / pushbacks (tactical)

### A. Gallery should not be a 4th primary mode (V1)

Google omitted Gallery. **We agree for V1.**

Equal grid is what made the product feel like Ops wall. If a client later demands “see everyone equal,” put **Gallery** under Layout ▾ as advanced — not a fourth big mode button.

**Exception:** 1–2 people only → Speaker stage can look like full-bleed without a useless empty strip (auto-hide filmstrip when ≤1 other).

### B. Focus + “chrome hidden until mouse move”

**Agree for desktop.**  
**Guard for lab / touch / high stress:**

| Risk | Mitigation (lock for APPLY) |
|------|-----------------------------|
| Operator cannot find Leave / unmute | Focus shows **thin reveal strip** on any key / corner hit target, not mouse-only |
| Touch screens | First tap = reveal dock 3s; second = UI action |
| Panic | **Esc** always exits Focus → Speaker |

Do **not** ship Focus with zero escape hatch.

### C. “Smooth glide” transitions — defer

Google wants tiles that glide. Reality of our stage:

- Layout `remount()` **detaches/re-attaches** LiveKit `<video>` nodes.  
- Fancy CSS glide without remount rewrite = jank or black frames.  
- High-stress monitoring needs **predictable snap**, not animation debt.

**V1:** instantaneous snap + no flash of empty “Waiting”.  
**Later optional:** `VC-LAYOUT-TRANSITION-POLISH-V1` only after snap PASS.

### D. Incident map / evidence inside Operations stage — out of V1

Google listed “incident map or evidence” as primary asset.  

| In V1 Operations | Not in V1 |
|------------------|-----------|
| Screen share, BWC ingress, shared image/video/PDF | Embedding Ops Leaflet map or Evidence Hub inside LiveKit stage |

Map/evidence live in **Operations tab** and future **Tactical**. VC Operations mode = **room content tracks**, not a second Ops dashboard. Mixing map into VC = scope explosion + dual map instances.

### E. Auto-hiding dock vs always-visible

Modern Webex hides chrome. Mission console often wants **always-visible Leave / Mic**.

**Agent pick for V1:**

- Dock **always visible** at bottom (compact, ~48px).  
- Optional later: auto-hide when Focus + idle 3s.  

Do not make auto-hide the default for all three modes on day-1.

### F. Drag / snap content to stage

**Agree on intent** (pin / promote to primary).  
**V1 UX:** click badge **Pin to stage** or dblclick tile — **no visible drag grips** in default.  
Drag-drop can stay in code path but **hidden chrome** until an “Advanced rearrange” if ever needed.

### G. 2-up / multi-speaker panels

Useful for two commanders. **Not** a primary mode in Google’s three.  

**Park:** if client asks after V1 PASS → `multi-2` under Layout ▾, not a 4th mission button.

### H. Hard cap 8 + poll ⟳

Google’s filmstrip still needs an honest overflow story.  

**V1 minimum:** filmstrip shows as many as fit; **+N** badge if more (no silent 8s carousel as the only UX).  
Raising cap / pagination = follow MOB if still needed — do not block 3-mode chrome.

---

## Phase 2 — Chrome rules (locked for APPLY)

| Do | Do not |
|----|--------|
| Full-bleed `#vc-stage` in meeting | Card with fat “Shared content” header |
| Bottom center dock: Mic · Cam · **Layout** (3) · Share ▾ · Leave | Top bar of 7 layout + 4 share buttons |
| Corner badge: `LIVE BWC-…` / `SHARING …` | Teaching essays / uppercase pane titles |
| Filmstrip = quiet thumbnails | Ops wall equal tiles as default |
| Snap layout switch | Glide animation as V1 requirement |
| Keep LiveKit / join / host tools | Rebuild VC app / turn off WVP elsewhere |

**Layout control on dock:** three icons/labels only — **Speaker · Operations · Focus**.

---

## Suggested APPLY scope (when you name it)

**`MOB-APPLY VC-MEETING-LAYOUT-CLIENT-V1`**

| In | Out |
|----|-----|
| Three modes + Speaker default | New LiveKit server |
| Bottom dock + badge overlays | Ops map inside VC |
| Hide grips / kill dual headers | Gallery as 4th primary |
| Content → Operations auto/promote | CSS glide polish |
| Filmstrip + Focus + Esc exit | Tactical / Evidence embed |
| Cache bust | Bundle with BWC ingress backend rewrite |

**PASS (operator):** Join 3+ people → looks like a meeting (Speaker), not a wall; switch Operations when BWC/share up; Focus one feed; Leave always findable.

---

## Reply to Google (short)

We **accept** the 3-mode architecture and chrome modernization as the client face for `VC-MEETING-LAYOUT-CLIENT-V1`.  

We **push back** on: (1) map/evidence inside VC stage in V1, (2) glide transitions as day-1 must, (3) mouse-only chrome in Focus, (4) auto-hide dock as default.  

We **keep** Gallery/2-up/PiP out of primary chrome unless a later client ask.

---

## Agent must not

- APPLY until you say `MOB-APPLY VC-MEETING-LAYOUT-CLIENT-V1` (or go ahead)  
- Add Gallery back as equal default  
- Mix Tactical map into VC Operations  
- “Polish” with purple/glow marketing chrome  

---

## One line

**Google’s 3 modes = locked product face (Speaker default · Operations content · Focus); argue only map-in-VC, glide-first, and hide-chrome-without-escape — V1 is snap + bottom dock + badges.**
