# MOB DISC — Ops SOS strip UI: 2 actions · meta · chart scale (2026-08-09)

**Status:** Design lock. **No code until** named APPLY (fold into `SOS-OPS-STRIP-ACTIONS-V1` or `SOS-OPS-STRIP-UI-COMPACT-V1`).  
**Screenshot:** “SOS LOG · Last 7 days · 1 shown (7 days) · Updated …” + Sunday bar almost full height for **1** alarm.

---

## 1. Your asks → locked answers

| Ask | Lock |
|-----|------|
| Only **Open case** · **Clear strip** — drop Refresh? | **Yes.** Auto push/poll already refreshes the strip; Refresh button wastes space. |
| Drop “Last 7 days”? | **Yes.** Window stays **7 days** under the hood; no hint text. |
| Meta = only **Updated** + date/time? | **Yes.** Drop “1 shown (7 days)”. |
| Why 1 alarm bar so tall? | Bug of **relative scale**: height = count/max×44 → when max=1, one bar = full lane. **Fix scale** (§4). |
| 2-tab box for the two actions? | **Yes** — compact dual control under the list (§3 drawing). |

---

## 2. Target layout (draw)

```text
┌─────────────────────────────────────┐
│  SOS cases                          │  ← rename (not LOG)
│  Updated 09/08/2026, 14:59:44       │  ← only this meta line
│                                     │
│  ▂ ▂ ▂ ▂ ▂ ▂ █                      │  ← week chart (Mon…Sun)
│  M T W T F S S                      │     1 alarm = short stub, not full
│                                     │
│  · TAG SOS · TAG ACK                │
│    09/08/2026, 14:52:06 · Chin      │
│                                     │
│  ┌──────────────┬─────────────────┐ │
│  │  Open case   │  Clear strip    │ │  ← 2-tab / segmented box
│  └──────────────┴─────────────────┘ │
└─────────────────────────────────────┘
```

**Gone from face:** Last 7 days · “N shown (7 days)” · Download CSV · Reload/Refresh · Open incident files (disk).

**Still true under the hood:** 7-day window, auto refresh, dispatch scope (team/assigned BWCs).

---

## 3. Two-tab action box

One segmented control (saves vertical space vs two loose rows of four buttons):

```text
┌──────────────────┬──────────────────┐
│   Open case      │   Clear strip    │
└──────────────────┴──────────────────┘
```

| Action | Behavior |
|--------|----------|
| **Open case** | Selected / latest strip row → Evidence → Cases (`SO-…`) |
| **Clear strip** | Clear Ops strip view only — does **not** delete cases |

No third button.

---

## 4. Chart scale — why 1 alarm looks huge + fix

### Today (no brain)

```text
heightPx = (dayCount / weekMax) * 44
```

| Week | Sunday count | Sunday bar |
|------|--------------|------------|
| Only 1 SOS all week | 1 | **44px = full lane** |
| 4 SOS on Sunday | 4 | 44px full (OK) |
| 1 on Sun, 3 on Sat | 1 | 11px (short) |

So **one lonely alarm always paints the tallest possible bar**. Four alarms on one day still fill the lane — same max — but empty days stay stubs; the “whole long lane” fear is real if we ever used absolute fill without a cap. Relative scale alone makes **1 look like a crisis spike**.

### Locked scale (unit + soft floor + hard cap)

Fixed chart track height (keep ~52px). Bars use **pixels-per-alarm**, not “always fill to max”:

```text
BASE_EMPTY = 4px          # quiet day
PX_PER     = 8px          # each alarm
CAP        = 40px         # never taller than track

barHeight = count === 0
  ? BASE_EMPTY
  : min(CAP, BASE_EMPTY + count * PX_PER)
```

**Visual (same week, 1 SOS on Sunday):**

```text
Before (relative):          After (unit + cap):
M T W T F S S               M T W T F S S
· · · · · · ████            · · · · · · █
            full                        short (~12px)
```

**Visual (4 SOS on Sunday):**

```text
M T W T F S S
· · · · · · ████            ~36px (4×8 + base) — tall, not “mystery full”
```

**Visual (8 SOS on Sunday):**

```text
· · · · · · ████████        hits CAP 40px — lane full only when busy
```

Tooltip on bar still shows exact count (“4 alarms”). Optional tiny count digit above bar later — not required in first APPLY.

---

## 5. Meta line format

| Show | Hide |
|------|------|
| `Updated 09/08/2026, 14:59:44` (site/local desk time) | `Last 7 days` |
| | `1 shown (7 days)` |
| | Encoding junk (`Â·`) — use normal ` · ` or just the Updated line alone |

Empty week: still show `Updated …` (and empty list copy if needed — short, no “7 days” in the title area).

---

## 6. Auto refresh (why no Refresh button)

| Mechanism | Keep |
|-----------|------|
| Socket / poll that already reloads SOS strip | Yes |
| Manual **Reload list** button | **No** on face |

If auto path ever fails in lab, that is a bugfix — not a reason to keep a permanent Refresh button.

---

## 7. APPLY packaging

Prefer one UI APPLY after/with raise:

`MOB-APPLY SOS-OPS-STRIP-ACTIONS-V1` includes:

1. Rename SOS Log → SOS cases  
2. Meta = Updated only; drop Last 7 days / N shown  
3. Two-tab: Open case · Clear strip  
4. Chart unit+cap scale (§4)  
5. Drop CSV + Refresh from Ops  

Case-on-raise stays `SOS-CASE-ON-RAISE-V1` (data). This disc is **face**.

---

## 8. Decision

Keep Ops strip · rename · **two actions only** · lean meta · **fix chart so 1 alarm ≠ full red tower**.  
Drawings in §2–§4 are the operator preview. Code only on APPLY.
