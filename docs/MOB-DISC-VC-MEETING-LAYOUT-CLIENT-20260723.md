# MOB DISC — Video Conference layouts today · why it feels wrong · client layout options

**Date:** 2026-07-23  
**Status:** PAPER — **no APPLY · no code**  
**Ask:** Document current VC meeting layout; it does not feel like a real video conference; we need proper layout options for clients (speakers, slot schemes, etc.).  
**Code truth:** `public/js/conference-layout.js` + `#vc-stage` in `public/index.html`

---

## Plain English (verdict)

You are right to feel something is off.

What we have is a **hybrid briefing / ops stage** (shared content pane + participant grid, hard cap **8**, poll rotation, BWC/share-first modes) wearing a thin “Layout” toolbar. It is **not** a clean client VC product like Zoom / Teams / Meet (immersive stage, clear speaker vs gallery, filmstrip, predictable slots).

**Recommendation:** treat this as a **UI genre** — redesign **meeting stage layouts** for client ship. Keep LiveKit / join / share / BWC ingress as-is until a named APPLY. First APPLY later = layout chrome + schemes only (not a new VC stack).

---

## A. Where VC lives (page chrome)

```
TOP NAV → Video Conference
  ├─ Live | Recordings | Settings   (hub tabs)
  └─ Live panel
       ├─ LOBBY (room cards + Active Personnel)     ← hidden when in meeting
       └─ IN MEETING
            ├─ thin top row (room / host crumbs)     ← still present, compact
            └─ #vc-stage  ← the meeting “theater”
                 ├─ toolbar: Layout + Share + Leave
                 └─ stage body (spotlight pane | divider | gallery pane)
```

**In meeting** (`vc-in-meeting`): lobby / roster / host tools hide; stage grows.  
**Feeling gap:** stage still reads as a **dashboard card** (border, headers “Shared content” / “Participants”, ops-style tiles with drag grips) — not a full-bleed meeting room.

---

## B. Stage anatomy (what is actually built)

One DOM forever:

| Region | Role |
|--------|------|
| **Spotlight pane** | Large / shared / speaker / top row |
| **Divider** | Drag resize (split / deploy) |
| **Gallery pane** | Equal tiles / filmstrip / poll strip |
| **PiP layer** | Floating overlay tile |

People schemes and share layouts **remap** those panes — they do not swap to a different meeting skin.

**Hard limits (code):**

| Limit | Value |
|-------|--------|
| Max people tiles mounted | **8** (`MAX_PEOPLE`) |
| Max share tiles | **4** |
| Poll window | **4** visible, rotate every **8s** when crowded |
| Gallery grid slots by count | 1→1×1 · 2→2×1 · 3→3×1 · 4→2×2 · 5–6→3×2 · 7–8→4×2 |

---

## C. Layout options we already expose (toolbar)

Toolbar buttons → `setPeopleScheme`:

| Button | Scheme | What it tries to do |
|--------|--------|---------------------|
| **Gallery** | `gallery` | All cameras in equal grid (default). Share can invade grid or force other modes. |
| **Speaker** | `speaker` | Active/pinned speaker in spotlight; others in side gallery (`split`) |
| **Focus** | `focus` | One speaker full stage (`spotlight-full`); others hidden |
| **2-up** | `two-up` | Two large on top; rest below |
| **Briefing** | `briefing` | Share/BWC on main (often **deploy**: share top ~68%, people strip bottom) |
| **Side-by-side** | `sidebyside` | Share left / people right (`split`) |
| **PiP** | `pip` | One tile floating over gallery |

Share submodes (when share/BWC present): `split` · `large` · `people` (+ Expand / Split buttons).

Internal body classes: `vc-mode-gallery` · `vc-mode-split` · `vc-mode-spotlight-full` · `vc-mode-two-up` · `vc-mode-deploy`.

---

## D. Wireframes — what you see today

### D1. Gallery (default — most meetings)

```
┌─────────────────────────────────────────────────────────┐
│ Layout [Gallery] Speaker Focus 2-up Briefing … │ Share… │
├─────────────────────────────────────────────────────────┤
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                    │
│  │ You  │ │ A    │ │ B    │ │ C    │   equal tiles      │
│  └──────┘ └──────┘ └──────┘ └──────┘   (fill grid)      │
│  ┌──────┐ ┌──────┐ … up to 8; if more → poll 4 + ⟳     │
└─────────────────────────────────────────────────────────┘
```

Spotlight pane **hidden**. Feels like a **tile wall / Command Wall cousin**, not “I’m in a meeting.”

### D2. Speaker

```
┌──────────────────────┬──────────────────┐
│                      │  [B] [C] [D]     │
│     ACTIVE SPEAKER   │  small strip     │
│                      │  (scroll/grid)   │
└──────────────────────┴──────────────────┘
```

Closest to real VC — but chrome still says **Shared content** on the left header, and strip styling is ops-grid, not a clean filmstrip.

### D3. Focus

```
┌─────────────────────────────────────────┐
│           ONE PERSON FULL STAGE         │
└─────────────────────────────────────────┘
```

OK idea; others disappear (no filmstrip) — harsh vs Zoom “spotlight + strip.”

### D4. 2-up

```
┌──────────────────┬──────────────────┐
│      Cam 1       │      Cam 2       │
├──────────────────┴──────────────────┤
│  [3] [4] [5] …                      │
└─────────────────────────────────────┘
```

### D5. Briefing / deploy (share or BWC — ops DNA)

```
┌─────────────────────────────────────┐
│     SHARED / BWC  (large top)       │
├─────────────────────────────────────┤
│  people strip (poll if >4)          │
└─────────────────────────────────────┘
```

Useful for **command briefing**. Wrong as the **default meeting language**.

### D6. Side-by-side

```
┌────────────────┬────────────────────┐
│  Share / BWC   │  participant grid  │
└────────────────┴────────────────────┘
```

### D7. PiP

Gallery + floating corner tile — secondary, easy to miss.

---

## E. Why it feels “not video conference”

| Cause | Effect on operator |
|-------|-------------------|
| **Ops / briefing DNA** | Dual pane + “Shared content” / BWC deploy = dispatch theater, not Meet |
| **Default = equal gallery wall** | Looks like video wall bank, not a call |
| **Cap 8 + poll ⟳** | Crowded rooms feel like a slide show, not a meeting |
| **Layout + Share mashed in one toolbar** | Control bar ≠ mic/cam/leave-centered VC chrome |
| **Tile grips / drag / pin** | Feels like a layout editor, not a call UI |
| **Headers always briefing-flavored** | Even Speaker mode reads as “shared pane” |
| **Stage often boxed** | Not full-bleed meeting immersion |
| **Schemes exist but unclear** | Client won’t discover “proper” speaker layouts; default wrong |
| **People vs share logic intertwined** | Auto jumps (e.g. gallery→briefing on share) surprise users |

This is a **layout / product face** problem first — not “LiveKit is broken.”

---

## F. What clients expect (industry baseline)

Ship should expose **clear named layouts** (host or each client can pick):

| Client layout | Visual | When |
|---------------|--------|------|
| **Gallery** | Equal grid, smart columns (not hard 8 wall) | Many peers |
| **Speaker** | Large active speaker + **bottom or side filmstrip** | Default meeting |
| **Spotlight / Focus** | One pinned + optional thin strip | Briefing one person |
| **Sidebar** | Content/share primary + people strip | Screen share |
| **Multi-speaker (2–4 up)** | 2/3/4 large equal | Debate / panel |
| **Floating / PiP** | Optional self-view | Secondary |

Optional later: host-forced layout for all clients; “follow active speaker” toggle.

**Slot schemes (examples):**

| N people | Gallery slots | Speaker |
|----------|---------------|---------|
| 1 | 1 full | — |
| 2 | 1×2 | large + 1 strip |
| 3–4 | 2×2 | large + strip |
| 5–9 | 3×3 | large + strip |
| 10+ | paginated grid **or** strip overflow (not silent 8-cap poll) |

---

## G. Proposed product direction (UI only — for Google / client)

### G1. Meeting chrome (same LiveKit)

```
┌─ full-bleed stage ─────────────────────────────────────┐
│                                                         │
│              LAYOUT SURFACE (scheme below)              │
│                                                         │
├─ bottom bar: Mic Cam Screen Layout▾ Leave ─────────────┤
└─────────────────────────────────────────────────────────┘
```

- Move **layout picker** to a single **Layout** menu (icons + names).  
- Share actions = separate; Leave/mic/cam = primary VC bar.  
- Drop “Shared content / Participants” uppercase headers in meeting mode (or only when sharing).

### G2. Client layout pack (ship names)

| ID | Label | Behavior |
|----|-------|----------|
| `gallery` | Gallery | Equal grid; raise cap / paginate honestly |
| `speaker` | Speaker | Active/pinned large + filmstrip |
| `spotlight` | Spotlight | One large + optional strip (rename Focus) |
| `sidebar` | Content | Share/BWC large + strip (replace Briefing/Side-by-side mash) |
| `multi-2` / `multi-4` | 2-up / 4-up | Fixed multi-speaker |
| `pip` | PiP | Keep as advanced |

Deprecate or hide **Briefing** / **Side-by-side** as separate primary buttons — fold into **Content** + share detection.

### G3. Default for client

**Speaker** (or Gallery only if 1–2 people) — **not** ops Briefing, **not** equal wall when ≥3.

### G4. Explicitly out of first layout MOB

- New MCU / replacing LiveKit  
- Tactical Zone  
- Ops map wall layouts  
- Inventing purple themes  

---

## H. Risk pick (one path)

| Option | Meaning | Pick? |
|--------|---------|-------|
| **A — Layout genre MOB(s)** | Redesign stage schemes + chrome for client VC feel; keep LiveKit | **Yes** |
| B — Leave as-is; train users on toolbar | Feels wrong forever | No |
| C — Rebuild whole VC app | Huge; against finish-Fleet | No |

**Recommended first APPLY (when you order later):**  
`VC-MEETING-LAYOUT-CLIENT-V1` — Speaker default + filmstrip + Layout menu + full-bleed meeting stage; keep share/BWC as Content mode.  
Optional follow: `VC-GALLERY-SLOT-SCALE-V1` (honest >8 / pagination).

**Do not APPLY from this disc** until you (and Google if needed) say **UI OK** / name the phrase.

---

## I. Google / client checklist

| # | Question | OK? |
|---|----------|-----|
| 1 | Agree today’s default Gallery wall ≠ client VC? | |
| 2 | Default meeting layout = **Speaker** + filmstrip? | |
| 3 | Fold Briefing/Side-by-side into one **Content** layout? | |
| 4 | Raise/paginate beyond hard **8** (or document 8 as lab limit)? | |
| 5 | Bottom meeting bar (mic/cam/layout/leave) vs today’s top mash? | |
| 6 | Keep BWC-in-meeting as Content layout, not separate product? | |

Reply: `VC LAYOUT OK` + notes, or `VC LAYOUT FAIL` + row numbers.

---

## J. Agent must not

- “Quick CSS patch” without named APPLY  
- Mix Tactical / Ops wall into VC layout MOB  
- Claim we “already have proper VC layouts” — schemes exist; **product face does not**  
- Bundle layout redesign with BWC ingress backend  

---

## One line

**Today’s VC stage is a briefing/ops tile theater (8-cap gallery + share pane). Clients need real meeting layouts (Speaker + filmstrip, Gallery slots, Content) — paper locked; code only after named APPLY.**
