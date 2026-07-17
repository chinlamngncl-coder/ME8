# MOB DISC — Enterprise no text-select · whole app

**Status:** **APPLIED 2026-07-11** — `mob-ui-no-text-select`  
**Search:** text select, highlight, copy, drag, user-select, enterprise, security, toy  
**APPLY name:** `mob-ui-no-text-select`  
**Related:** `MOB-DISC-FR-SNAP-RAIL-16-METADATA.md` (deliberate **Copy** buttons where needed)

---

## Plain answer

**Yes — the whole app should default to “no drag-to-highlight”.**

| Today | Enterprise norm |
|-------|-----------------|
| Any mouse drag selects hints, labels, SOS/FR text | **Ops chrome is not selectable** |
| Feels like a web page / toy | Feels like a **control-room client** |
| Casual copy of cam IDs, coords, alert text | Copy only via **explicit buttons** or **form fields** |

**How:** One shared CSS guard — `user-select: none` on the app shell, **opt-in allow** on inputs and marked copy zones.

**Honesty:** This is **UX + casual-leak reduction**, not DRM. A determined user can still use devtools. Real secrets stay server-side. The goal is **professional feel** and **no accidental highlight** when dragging tiles, map, roster, or PTT.

---

## What you showed (valid FAIL)

Screenshot: drag across Analytics → Face recognition highlights:

- Toolbar hint (“6 live tiles · up to 32…”)
- Tile labels (“Waiting”)
- Roster meta (“Max 32 · 6 live…”)
- Snap rail header

Same happens on SOS banner, map HUD, evidence hints, settings labels — **nowhere is globally guarded**.

Today `user-select: none` exists only on **a few drag handles** (video grip, command-wall chip, map popup drag) — not the app body.

---

## How industry does it

| Product class | Pattern |
|---------------|---------|
| VMS / PSAP / CAD (Genetec, Milestone, Motorola-style) | Main UI **not selectable**; copy via export or field |
| Bodycam fleet dashboards | Labels and status **not highlightable** on drag |
| Web ops consoles | `user-select: none` on shell + `user-select: text` on inputs only |
| When copy is needed | **Copy** button → clipboard API (we already plan this for FR coords) |

**Not done:** Disabling selection inside `<input>` / `<textarea>` — operators must still edit search, config, passwords, notes.

---

## Locked spec (v1 ship)

### Rule 1 — Default deny

```css
/* public/css/app-select-guard.css */
html, body {
    -webkit-user-select: none;
    user-select: none;
    -webkit-touch-callout: none; /* iOS long-press */
}

/* Optional: kill visible selection flash if browser ignores */
body *::selection {
    background: transparent;
}
```

Apply to **all operator surfaces** (see file list below).

### Rule 2 — Opt-in allow (whitelist)

```css
input, textarea, select, option,
[contenteditable="true"],
.allow-text-select,
.allow-text-select * {
    -webkit-user-select: text;
    user-select: text;
    -webkit-touch-callout: default;
}
```

| Zone | Why allow |
|------|-----------|
| `<input>` / `<textarea>` / `<select>` | Typing, password managers, config edit |
| Evidence / SOS report text areas | Operator may paste/edit narrative |
| Server config JSON/host fields | Admin copy-paste |
| `.allow-text-select` | Future audit log rows, legal notices page body |

**Everything else** — hints, `.hint`, tile labels, FR match %, SOS banner, map popups, roster names — **not selectable**.

### Rule 3 — Images / tiles

```css
img, video, canvas {
    -webkit-user-drag: none;
    user-drag: none;
}
```

Stops dragging a snap thumb or tile grab from ghosting an image. (Video canvas already fine.)

### Rule 4 — Deliberate copy (not drag)

When operator needs an ID or coordinates:

| Data | Pattern |
|------|---------|
| Cam ID | **Copy** icon/button (clipboard) — not drag-select label |
| GPS | **Copy coords** button (FR snap detail MOB) |
| Audit export | Server CSV/PDF — not UI drag |

Do **not** re-enable global select for “convenience”.

---

## Scope — whole software

### v1 MOB (one pass)

| File | Change |
|------|--------|
| **`public/css/app-select-guard.css`** | **New** — rules above |
| **`public/index.html`** | `<link rel="stylesheet" href="/css/app-select-guard.css?v=…">` in `<head>` |
| **`public/command-wall.html`** | Same link |
| **`public/command-centre.html`** | Same link |
| **`public/login.html`** | Same link (inputs still work) |
| **`public/enroll-totp.html`** | Same link |
| **`public/must-change-password.html`** | Same link |
| **`public/legal-notices.html`** | Add link + `class="allow-text-select"` on legal body if operators should read/copy terms |
| **`public/css/centre-summary.css`** | Import guard or link from `command-centre.html` |

### Out of v1 (lab / dev only)

| File | Note |
|------|------|
| `test-zlm.html`, `live.html`, `matrix.html` | Dev harness — link guard if you use them in demos |

### Not in this MOB

| Item | Why |
|------|-----|
| Locked JS (`video-wall.js`, `fleet-ui.js`, …) | CSS-only |
| Removing existing per-widget `user-select: none` | Redundant but harmless |
| Server-side DLP | Separate security genre |

---

## MOB plan

| MOB | Files | Delivers |
|-----|-------|----------|
| **`mob-ui-no-text-select`** | `app-select-guard.css` + HTML `<link>` on operator pages | No drag-highlight on ops UI |
| **Later** `mob-fr-snap-copy-coords` | `fr-alarm.js` | Copy button where select is banned |
| **Later** `mob-sos-ledger-export` | server + UI | Export without drag-select |

**Risk:** Tier **0** — CSS only · no live video logic · no PTT/SOS pipeline · reversible in one file

**Rollback:** Remove `<link>` to `app-select-guard.css` from `index.html`

---

## APPLY command

```text
MOB-APPLY mob-ui-no-text-select
```

---

## PASS checkpoint

Hard refresh → try **click-drag** across text (not on an input):

| # | Surface | Pass |
|---|---------|------|
| 1 | Analytics → FR hints, “Waiting”, snap rail | **No blue highlight** |
| 2 | Ops map + SOS banner (if active) | No highlight |
| 3 | Settings → server host **input** | Can still select/edit text **inside field** |
| 4 | Login username/password | Can still select/edit |
| 5 | FR roster search box | Can type + select inside field |
| 6 | Drag video tile / map pin | No accidental word highlight |
| 7 | Command wall chips | Still draggable (unchanged) |

Reply **PASS** or **FAIL** (+ where select still leaks).

---

## FAQ

**Q: Is this real security?**  
A: **Partial.** Stops casual copy and looks professional. Does **not** stop devtools. Sensitive data must not rely on CSS alone.

**Q: Can we ever copy cam ID?**  
A: Yes — add a **Copy** button on hover or detail panel (explicit action).

**Q: Legal notices page?**  
A: Wrap body in `.allow-text-select` so terms remain copyable if legal requires it.

**Q: Why a separate CSS file?**  
A: One source for **whole software** — `index.html`, login, command wall, centre — not 12 copy-paste blocks.

**Q: Will it break i18n?**  
A: No — only selection behaviour, not text content.

---

## How to tell the agent

| You say | Meaning |
|---------|---------|
| Screenshot with blue highlighted hints | This DISC |
| “Can’t drag-select like enterprise” | Same |
| `MOB-APPLY mob-ui-no-text-select` | Apply |

---

## Order

```text
MOB-APPLY mob-ui-no-text-select
```

Independent of FR video/roster MOBs. Safe to apply anytime.

---

## Bottom line

| Problem | Fix |
|---------|-----|
| Drag highlights everything | **Global `user-select: none`** on app shell |
| Toy / insecure feel | Matches **control-room** UX |
| Still need copy sometimes | **Buttons** + **input fields** only |
| Whole software | Shared **`app-select-guard.css`** linked everywhere |
