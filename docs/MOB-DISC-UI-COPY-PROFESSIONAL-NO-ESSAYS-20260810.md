# MOB DISC — Professional UI copy (no essays, no casual buttons) (2026-08-10)

**Status:** LOCKED paper. **No code this turn.**  
**User:** Retention essay too long / “Super admin only” wrong place; **“I've done this”** unprofessional; want system professional; Mob disc + read `.cursorrules`.  
**Extends:** `MOB-DISC-UI-COPY-NO-LAB-JARGON-DEATH-PENALTY-20260809.md`

---

## Do enterprise products put long explanations on every page?

**No.** Control-room / enterprise admin UIs (Axon-class, SAP Fiori, Microsoft business apps, common SaaS admin) do **not** put a teaching paragraph on every panel.

Industry pattern:

| Pattern | What pros do |
|---------|----------------|
| Page chrome | Short **title** + maybe **one calm line** (optional) |
| Permission | Hide the nav / disable controls — **don’t** end every hint with “Super admin only” |
| Extra help | Tooltip, “?” popover, or docs link — **progressive disclosure** |
| Buttons | Verb + object: **Save**, **Open BWCs**, **Mark complete**, **Remind later** — never chatty first-person |

Walls of “how this works / later steps / what comes next MOB” = **lab leftover**, not ship UI.

---

## Your two screens — verdict

### 1. Dock identity banner buttons

| Bad (today) | Professional |
|-------------|--------------|
| **I've done this** | **Mark complete** (or **Done**) |
| Remind next login | **Remind later** (OK) |
| Open BWCs | **Open BWCs** (OK) |

“I've done this” sounds like a checklist app for kids / chat — **forbidden** on Mobility Axiom.

### 2. Retention hint

| Bad (today) | Professional |
|-------------|--------------|
| Long paragraph: keep how long + assigning later + delete queue later + Super admin only | **One short line:** e.g. *Categories control how long Library files are kept.* |
| “Super admin only” in the body | **Remove from body** — Retention nav already Super-admin-only; if needed, tiny muted hint under Save when non-admin somehow hits it |

Same rule for Deletion queue / Cases / Storage intros: **short or none**.

---

## Locked copy rules (operator-facing)

1. **Max ~1 short sentence** for panel intros (prefer zero if title is enough).  
2. **No roadmap / “later steps” / “come in a later MOB”** on screen.  
3. **No “Super admin only”** as trailing essay — gate the UI; optional one-line error if they lack permission.  
4. **Buttons = professional verbs** — no “I've…”, “Let's…”, “Just…”, “Please click…”.  
5. **No lab / agent / toast / APPLY / Cursor** language (already death-penalty disc).  
6. **Confirm dialogs** stay short and factual (“Queue this file for deletion? Recoverable for 7 days.”) — not tutorials.

---

## System-wide cleanup (not done this turn)

**Do not** freestyle-edit the whole tree without APPLY (`.cursorrules` / zero-change).

**When you want code:**

```text
MOB-APPLY UI-COPY-PROFESSIONAL-PASS-V1
```

**Scope (exact):**

1. Fix dock identity: `I've done this` → **Mark complete** (en.json + any HTML default).  
2. Shorten Retention + Deletion queue + other Evidence `setup-hint` essays to ≤1 sentence; strip “Super admin only” / “later steps”.  
3. Lean pass of `public/locales/en.json` evidence* / dockIdentity* / opsCases* hints for casual or teachy strings (named keys only — **no** giant rewrite of all locales).  
4. Cache-bust touched scripts if any; **no** behavior change.

**Out of scope:** redesign layout; invent new features; rewrite manuals; scan baselines.

Agent may Grep `I've done|later steps|Super admin only` under `public/locales` + known Evidence strings **only after** that APPLY.

---

## Agent fault note

Retention hint with “later steps” + “Super admin only” was agent product-face language — violates professional / no-teach tone. Dock **I've done this** should never have shipped as permanent chrome.

---

## Next product MOB (unchanged queue)

After copy PASS (or in parallel if you prioritize feature):  
`REDACT-LICENSE-GREY-BUTTON-V1` · dock dual-record when dock ready · alert-sound re-PASS.
