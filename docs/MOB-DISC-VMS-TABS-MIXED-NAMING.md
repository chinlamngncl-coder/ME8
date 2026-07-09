# MOB DISC — VMS tab names (mix-and-match, not Milestone clone)

**Status:** **APPLIED** 2026-07-09 — Option D mixed VMS labels (i18n + fallbacks).  
**User direction:** We are **not** Milestone. Borrow habits from **Genetec, Milestone, Avigilon, Honeywell/NX** where operators already know them; keep **Ubitron** product identity everywhere else.

**Search:** `tab names`, `Command Wall`, `video wall`, `control room`, `mixed VMS labels`

---

## Plain answer

| Question | Answer |
|----------|--------|
| Are we Milestone? | **No** — we are Ubitron Mobility C2. |
| Should tabs copy Milestone Smart Client? | **No** — no “Smart Client”, “Smart Wall”, “preset” in top-level tabs. |
| What should we do? | **Mix-and-match** one familiar word per concept from the big VMS vendors, then **lock one vocabulary** and use it in nav, Settings, and cards. |

---

## What the big vendors call the same things

| Concept (what we built) | Genetec Security Center | Milestone XProtect | Avigilon ACC | Honeywell / NX |
|-------------------------|-------------------------|--------------------|--------------|----------------|
| Primary operator screen | **Security Desk** | Smart Client / **workstation** | ACC Client | **Operator client** |
| Multi-tile live video | **Video wall**, tile pattern | **Smart Wall**, wall monitor | **Virtual Matrix**, view | **Dynamic situational awareness** / video wall |
| Saved multi-monitor setup | Monitoring **task**, layouts | **Preset**, view **layout** | **View layout**, monitors | Layout / workspace |
| Extra physical screens | Full-screen **monitors** | Floating window, wall monitor | **Viewing window**, matrix display | Monitor / display |
| Map on a screen | Map in task / tile | Map on monitor | Map view | Map workspace |
| KPI / health screen | Alarm monitoring, dashboards | Status views | Health / status | Dashboard |

**Pattern:** Everyone uses **monitor / display + role** (video, map, status) and **layout** for the saved room — nobody puts “SOS” or “4-display” in the default tab title.

---

## What we ship today (after A5 neutral)

| Layer | Current label | Feels like |
|-------|---------------|------------|
| Top nav | Operations | ✓ Genetec-adjacent desk name |
| Top nav | **Command Wall** | ✓ **Ubitron** — keep |
| CW sub-tab | **Live Wall** | Internal / amateur — not a vendor tab name |
| CW sub-tab | **Display layout** | Milestone-heavy — fine for Settings, heavy for a tab |
| Settings (Site readiness) | **Display layout** | OK but same word twice with different jobs |
| Preset card | **Standard control room layout** | Long; repeats “control room” |
| Launch | **Launch layout** | OK — Avigilon/Milestone-ish |

**Gap:** Sub-tabs sound like a Milestone doc fragment (“Live Wall” + “Display layout”) instead of one product voice.

---

## DISC — Option D: Mixed VMS (recommended)

One locked vocabulary. Each label picks the **clearest** industry word, not one vendor.

### Top navigation (unchanged — already correct)

| Tab | Label | Why |
|-----|-------|-----|
| Primary desk | **Operations** | Field ops desk — not “Security Desk” (Genetec trademark habit) |
| Live video area | **Command Wall** | **Ubitron brand** — do not rename to Smart Wall |
| Fleet KPI | **Centre Summary** | Our name — Avigilon/Honeywell use “dashboard” internally; we keep Centre |

### Command Wall — sub-tabs (main fix)

| Current | **Option D** | Borrowed from |
|---------|--------------|---------------|
| Live Wall | **Video wall** | Genetec + Milestone — universal tender word |
| Display layout | **Control room** | Generic enterprise + Genetec control-room docs |

**Why not “Display layout” on the tab?**  
“Layout” is a **Settings / admin** word (Milestone preset editor). The tab is the **room launcher** — operators think “control room”, not “display layout”.

**Why not “Live Wall”?**  
No major VMS product tab is called “Live Wall”. They say **video wall** or **monitoring**.

### Settings → Site readiness block (match tab vocabulary)

| Current | **Option D** | Borrowed from |
|---------|--------------|---------------|
| Display layout | **Control room** | Same as sub-tab |
| Hint (long) | **Assign monitors for the control room — operator desk, video wall, map, and status board.** | Mix: Avigilon monitors + Genetec map + our status board |
| Set up displays | **Configure monitors** | Milestone/Avigilon “monitor” habit |

### Control room panel — preset + cards

| Element | Current | **Option D** | Borrowed from |
|---------|---------|--------------|---------------|
| Preset title | Standard control room layout | **Default room layout** | Milestone layout + Avigilon view layout (shorter) |
| Preset subtitle | Workstation, video wall… | *(unchanged)* | Already neutral |
| Launch button | Launch layout | **Activate layout** | Milestone **Activate preset** — tender-known verb |
| Display 1 title | Operator workstation | **Operator desk** | Genetec Security **Desk** (shorter) |
| Display 2 title | Video wall display | **Wall monitor** | Milestone **wall monitor** |
| Display 3 title | Map display | **Map monitor** | Genetec full-screen monitor role |
| Display 4 title | Status display | **Status board** | Our “status board” button already — align card title |
| Display N label | Display 1…4 | **Monitor 1…4** | Genetec/Avigilon **monitor** numbering |

### Buttons (keep — already mixed well)

| Button | Keep? | Note |
|--------|-------|------|
| Show Operations | ✓ | Desk action |
| Open video wall | ✓ | Genetec wording |
| Open map | ✓ | Short |
| Open status board | ✓ | Aligns with Display 4 rename |

Do **not** add “window” to buttons (rejected earlier).

---

## Option E — Slightly more Avigilon (matrix sites)

Use only if customer brief says “video wall / matrix”.

| CW sub-tab 1 | **Video wall** |
| CW sub-tab 2 | **Monitor matrix** |
| Display 2 card | **Matrix — video** |

Heavier. Default ship = **Option D**, not E.

---

## Option F — Minimal tab-only (smallest MOB)

Only rename the two Command Wall sub-tabs; leave A5 neutral strings elsewhere.

| Key | New |
|-----|-----|
| `commandWall.tabLive` | **Video wall** |
| `commandWall.tabDisplayRoom` | **Control room** |

Risk: Settings still says “Display layout” — **vocabulary split**. Prefer D (one pass).

---

## What we deliberately do NOT ship

| Banned in customer UI | Why |
|----------------------|-----|
| Smart Client, Smart Wall, XProtect | Milestone product names |
| Security Center, Security Desk | Genetec product names |
| Virtual Matrix | Avigilon product name |
| Preset, 4-display, SOS preset | Tender/internal |
| Live Wall | Not industry tab language |
| (optional) on section titles | See `MOB-DISC-DISPLAY-LAYOUT-NO-OPTIONAL.md` |

---

## One-screen story (Option D)

```
Operations  →  Command Wall  →  Video wall | Control room
Settings  →  Site readiness  →  Control room  →  Configure monitors
```

Same words in nav, sub-tabs, and Settings — no Milestone cosplay.

---

## MOB when you approve

| MOB | Scope | Risk |
|-----|-------|------|
| `mob-vms-tabs-mixed-d` | Option D full table — i18n + `index.html` / `command-wall.html` fallbacks | 1 |
| `mob-vms-tabs-mixed-f` | Sub-tabs only | 1 |

**Files:** `public/locales/*.json`, `public/index.html` fallbacks, `public/command-wall.html` fallbacks.  
**No** `video-wall.js`, `command-wall.js` logic, pool, or live engine.

---

## Your call

Reply with one line:

- **`MOB-APPLY mob-vms-tabs-mixed-d`** (recommended — full mixed vocabulary)  
- **`MOB-APPLY mob-vms-tabs-mixed-f`** (tabs only)  
- **`MOB-APPLY mob-vms-tabs-mixed-e`** (matrix wording)  
- Or edit the Option D table in this doc first.
