# MOB DISC — FR alert drawer · info first · video last · maximize

**Status:** DISC 2026-07-11 — **`mob-fr-alert-drawer-info-first` APPLIED** · **`mob-fr-alert-drawer-expand` APPLIED**  
**Trigger:** Operator PASS on `mob-fr-go-ops-freeze-fix` — drawer forces scroll; placeholder video eats above-the-fold space  
**Search:** alert drawer, info first, maximize, field snap, watchlist, video last, BWC, dock  
**Related:** `MOB-DISC-FR-GENRE-ROADMAP-UI-ENGINE-ALERT.md`, `MOB-DISC-FR-RAIL-SNAP-TO-LIVE-ALERT.md`, `MOB-DISC-FR-GRADE-TIERED-ALERT-URGENCY.md`

---

## Verdict — you are right

Today `#fr-alert-drawer` DOM order is:

```
Header (title · score · close)
  ↓
Video placeholder  ← 16:9, max 200px — empty shell, Act 3
  ↓
Compare (Field snap | Watchlist)  ← must scroll to see
  ↓
Meta grid (name · match · BWC · time · GPS)
  ↓
Actions (Ack · Field · PTT · Map · Dismiss)
```

The **only thing that works on a hit** is the compare + meta. The video block is a striped placeholder (“Live stream connects in a later update”). Putting it **first** wastes ~200px and pushes identity proof below the fold on laptops.

**Operator need:** See **who matched** and **dispatch actions** without scrolling. Live preview is **secondary** — can come from catching **BWC** or **dock RTSP** later.

---

## Locked layout — info first, video last

```mermaid
flowchart TB
    H[Header — title · tier badge · score pill · expand · close]
    C[Compare row — Field snap | Watchlist — tap = lightbox]
    M[Meta grid — name · match · BWC · time · GPS]
    G[Grade + reason line]
    A[Actions — sticky footer]
  V[Video strip — collapsed by default — Act 3 BWC/dock]
    H --> C --> M --> G --> A --> V
```

### Above the fold (no scroll at 520×~480 drawer)

| Zone | Content | Notes |
|------|---------|--------|
| **Header** | Face match · **tier color** (red/amber later) · score % · **⤢ expand** · × | Expand toggles drawer size |
| **Compare** | Two 3:4 portraits, labels FIELD SNAP / WATCHLIST | `object-fit: contain` preferred over `cover` (less face chop) |
| **Meta** | 2-col grid — name, match, BWC, time, GPS | Copy GPS button optional later |
| **Grade** | POI / Monitoring / Suspect / Blacklist + reason | Hidden when empty |
| **Actions** | Ack · Alert field · Standby PTT · Map · Dismiss | Always visible — `flex-shrink: 0` |
| **Video** | **Last** — collapsible footer | Default **collapsed** until Act 3 stream |

### Video strip (bottom, optional)

| State | UI |
|-------|-----|
| **Collapsed (default)** | One line: `▶ Live preview` · source hint `BWC` or `Dock` · chevron expand |
| **Expanded** | 16:9 area max **160px** height (not 200 top) — same placeholder until Act 3 |
| **Act 3 wired** | JSMpeg / ZLM from catching `camId`; fallback RTSP from dock config (`ss-rtsp-url` pattern) |

**Rule:** Video never pushes compare/meta below fold in **compact** mode.

---

## Maximize — two levels

### 1. Drawer expand (header ⤢)

| Mode | Size | Use |
|------|------|-----|
| **Compact** (default) | `min(420px, 94vw)` × auto, max `72vh` | Toast → Detail; fits corner |
| **Expanded** | `min(640px, 96vw)` × `min(88vh, 820px)` | Dispatch review; compare photos taller |

- Toggle: `#fr-alert-drawer-expand` in header (aria-pressed).
- Persist per session in `sessionStorage` key `fr-drawer-expanded` (optional).
- Expanded: compare frames use `min-height: 220px`; body scrolls **only** if meta + grade overflow.

### 2. Photo lightbox (compare tap)

- Tap either portrait → full-screen overlay (z-index above drawer).
- Shows side-by-side or single image with pinch/zoom later.
- Esc / backdrop click closes; drawer stays open underneath.

**MOB split:** lightbox can be phase 2 if expand alone fixes scroll pain.

---

## DOM reorder (implementation sketch)

**File:** `public/js/fr-alarm.js` — `buildAlertDrawerHtml()`  
**File:** `public/index.html` — `#fr-alert-drawer` CSS block

Move `#fr-alert-drawer-video` **after** `.fr-alert-drawer-actions` (or inside a `.fr-alert-drawer-footer`).

Add:

```html
<button type="button" id="fr-alert-drawer-expand" class="fr-alert-drawer-expand" aria-pressed="false" title="Expand">⤢</button>
<button type="button" id="fr-alert-drawer-video-toggle" class="fr-alert-drawer-video-toggle" aria-expanded="false">▶ Live preview</button>
```

CSS classes:

- `#fr-alert-drawer.fr-drawer-expanded` — width/height bump
- `#fr-alert-drawer.fr-video-collapsed .fr-alert-drawer-video` — `max-height: 0` or single-line bar
- `.fr-alert-drawer-actions` — `position: sticky; bottom: 0` inside scroll container **or** keep outside body scroll (preferred: actions **below** scrollable compare+meta only)

**Preferred scroll model:**

```
header (fixed)
body-scroll: compare + meta + grade  ← only this scrolls if needed
actions (fixed)
video-footer (collapsible)
standby line
```

---

## Tiered alert alignment

When `mob-fr-amber-toast-suspect` lands, drawer header border/gradient follows tier:

| Grade | Header accent |
|-------|----------------|
| blacklist | Red (today) |
| suspect | Amber |
| monitoring | Slate + subtle border |
| poi | No auto drawer (ledger only) |

Same drawer shell — CSS modifier `fr-drawer-tier-suspect` etc.

---

## What we are NOT doing in this MOB

| Out of scope | Where |
|--------------|--------|
| Real live video in drawer | Act 3 — `mob-fr-alert-drawer-live` |
| Engine / crop quality | `MOB-DISC-FR-ENGINE-LAB-TO-PORT.md` |
| Map circle / nearby | `mob-fr-hit-map-sos-parity` |
| Retire `#fr-alarm-backdrop` modal | Phase 2 — drawer is primary from toast Detail |

---

## MOB plan

| # | MOB | Delivers | Risk |
|---|-----|----------|------|
| **1** | **`mob-fr-alert-drawer-info-first`** | DOM reorder; video collapsed footer; sticky actions; compact fits compare+meta without scroll | Low — layout/CSS + `buildAlertDrawerHtml` only |
| **2** | **`mob-fr-alert-drawer-expand`** | Header expand toggle; `fr-drawer-expanded` CSS; session persist | Low |
| **3** | **`mob-fr-alert-drawer-photo-lightbox`** | Tap compare → fullscreen zoom | Low |
| **4** | **`mob-fr-alert-drawer-live`** | Wire BWC/dock video into expanded footer only | Medium — stream reuse policy |

**One MOB at a time.** Checkpoint after **#1**.

---

## PASS checkpoint — `mob-fr-alert-drawer-info-first`

1. Hard refresh C2 → Analytics → **Lab: preview FR alert drawer** (or real hit → Detail).
2. **Without scrolling:** Field snap + Watchlist + name + score + BWC visible.
3. Actions row visible at bottom of drawer (not buried).
4. Video area is **one collapsed line** at the very bottom (or hidden until expand chevron).
5. Ops map / toast still work (no regression from freeze fix).

Reply **PASS** or **FAIL** (+ screenshot if layout wrong).

---

## Apply command

```
MOB-APPLY mob-fr-alert-drawer-info-first
```

Then when ready:

```
MOB-APPLY mob-fr-alert-drawer-expand
```

---

## ASCII — before vs after

**Before (today):**

```
┌─ Face match alert ──────────────── 87% ─×┐
│ ░░░░░ LIVE VIDEO PLACEHOLDER ░░░░░░░░░░ │  ← wastes space
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
├─────────────────────────────────────────┤
│ FIELD SNAP    │ WATCHLIST               │  ← scroll to here
│ [crop]        │ [mugshot]               │
│ Name · Match · BWC · Time · GPS         │
│ [Ack] [Field] [PTT] [Map] [Dismiss]     │
└─────────────────────────────────────────┘
```

**After (locked):**

```
┌─ Face match alert ─────── 87% ─ ⤢ ─×┐
│ FIELD SNAP    │ WATCHLIST            │  ← first
│ [crop]        │ [mugshot]            │
│ Name · Match · BWC · Time · GPS      │
│ Grade · Reason                       │
│ [Ack] [Field] [PTT] [Map] [Dismiss]    │  ← always visible
│ ▶ Live preview (BWC)            [▼]  │  ← last, collapsed
└──────────────────────────────────────┘
```

---

## Roadmap hook

Insert in **Act 1b polish** (after `mob-fr-go-ops-freeze-fix` PASS):

| MOB | Status |
|-----|--------|
| `mob-fr-alert-drawer-info-first` | DISC — **next UI MOB** |
| `mob-fr-alert-drawer-expand` | DISC |
| `mob-fr-alert-tier-server` | separate DISC — urgency |
