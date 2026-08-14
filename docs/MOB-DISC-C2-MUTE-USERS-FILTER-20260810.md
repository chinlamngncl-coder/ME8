# MOB DISC — (1) C2→Axiom UI (2) Where mute (3) Users list search — 2026-08-10

**Status:** Discuss only. **No code until named MOB-APPLY.**  
**Brand lock:** Customer face = **Mobility Axiom**; C2/ME8 = internal unless you order rename (`.cursor/rules/me8-brand-axiom.mdc`).

---

## 1) “C2 STATUS” → Axiom

**What you screenshot:** Settings hub health chip label.

| Key / place | Current EN |
|-------------|------------|
| `settingsHub.strip.uptime` in `public/locales/en.json` | **“C2 status”** |
| Chip DOM | `#settings-chip-uptime` in Settings |

**Not “change every string containing C2 in the whole repo in one blind pass.”** That burns credit and can hit titles, restart messages, auth pages, locales (en/th/id/ko/fil), matrix popouts — and must **not** rename internal project/code IDs without you saying so.

**Recommendation (one APPLY):**

`MOB-APPLY BRAND-C2-UI-STRINGS-AXIOM-V1`

- Scope: **operator-visible** copy in `public/` (locales + hard-coded page titles that still say Mobility C2).  
- Your chip: **“C2 status” → “Axiom status”** (or “Server status” if you prefer uptime-neutral).  
- Out of scope V1: `docs/`, baselines, `ME8` folder name, env keys, logs, GitHub repo name.

Say the APPLY when ready. Prefer one genre pass, not drip edits.

---

## 2) Where is mute?

**Not** in Alerts & voice / Users & authority (your screenshots are correct — no mute there).

| Expected | Detail |
|----------|--------|
| Design | Ops **header** button `#header-voice-mute` — silences speech + desk tones for this browser session |
| Settings hint | “Header mute silences tones” under Alert tones |
| Code today | `voice-alerts.js` still looks for `#header-voice-mute` / `#header-voice-repeat` |
| HTML today | Those buttons are **missing** from `public/index.html` (only leftover CSS `.header-voice-btn`) |

So you cannot find mute because the **header control is not on the page** — not because it moved to Users.

**Later APPLY (if you want it back):** `HEADER-VOICE-MUTE-RESTORE-V1` — put Mute (+ optional Repeat) back in the main header. No invent until you APPLY.

---

## 3) Users & authority — long list → search / filter

**Today:** Dashboard Authentication → **Users & authority** — stacked cards (`global`, `ncl`, …). Fine at ~4; painful at 20+.

**Recommended V1 (one APPLY later):**

`MOB-APPLY USERS-AUTHORITY-FILTER-V1`

| Control | Behavior |
|---------|----------|
| Text search | Filter by login / display name / user id (substring) |
| Role dropdown | All · Super admin · Operator |
| Scope dropdown | All · All stations · Assigned only |
| Optional | Group name filter (e.g. “PP”) if assigned |

No inventing Teams/Authority new product — **filter the existing list**. Keep Save / Set password / Remove as now.

---

## Next step (you pick one APPLY)

1. `BRAND-C2-UI-STRINGS-AXIOM-V1` — chip + other visible C2 strings  
2. `HEADER-VOICE-MUTE-RESTORE-V1` — put mute back in Ops header  
3. `USERS-AUTHORITY-FILTER-V1` — search + role/scope dropdowns  

**Do not** bundle 1+2+3 in one APPLY.
