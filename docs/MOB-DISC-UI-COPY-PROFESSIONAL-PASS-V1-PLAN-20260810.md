# MOB DISC — UI-COPY-PROFESSIONAL-PASS-V1 (replace ledger)

**Status:** PLAN / paper only. **No code until** `MOB-APPLY UI-COPY-PROFESSIONAL-PASS-V1`  
**Extends:** `MOB-DISC-UI-COPY-PROFESSIONAL-NO-ESSAYS-20260810.md`  
**Also obey:** `.cursorrules` — never remove `id` / `data-*` / `onclick`; no freestyle CSS/layout; scrolling rules untouched.  
**Touch:** string values only in `public/locales/en.json` + matching HTML **text defaults** inside existing `data-i18n` nodes. **No UX/UI structure change.**

---

## Hard lock — copy only (why this won’t wreck UI)

This MOB is **string substitution**, not a redesign. Same bet as renaming a button label in Word: the control stays; only the words change.

| Allowed | Forbidden (instant fail) |
|---------|---------------------------|
| Change the **value** of a named i18n key in the V1 table | Edit `global.css` / inline style / spacing / height / overflow |
| Mirror the same shorter text in the HTML default inside the **same** element | Add/remove/reorder DOM nodes, wrappers, cards, grids |
| Shorter text → block naturally shorter → content below **moves up by browser flow** | “Fix” leftover space with padding, min-height, spacer divs |
| | Change `id`, `data-*`, `onclick`, classes, button types |
| | Touch scroll containers, video/map lock, form grids |
| | Change JS logic, show/hide, event handlers |
| | Delete a hint `<p>` / button — **keep the element**, shorten text only |
| | Empty a hint to `""` (empty `<p>` can leave dead gap) — always leave the short **To** line |

**Why space collapses safely:** Retention/Deletion hints are normal block text. Fewer lines = less height. Siblings already sit in normal flow — they rise. No scroll/layout code involved.

**Why buttons don’t shift UX:** `I've done this` → `Mark complete` is the same control (`#dock-identity-setup-done`), same classes, same click path in `dock-identity-setup.js`. Label width may change a few pixels; layout of the button row is unchanged.

**Agent self-check before claiming done:**

1. Diff is **only** `en.json` string values + HTML text defaults for those keys (optional: locale cache query if any — not CSS).  
2. `git diff` shows **zero** lines in `*.css`, scroll/video JS, or structural HTML tags.  
3. Every V1 key still has non-empty **To** text.  
4. No element lost its `id` / `data-i18n` / `data-*`.

If any of 1–4 fails → **revert that file**, do not “also tidy” layout.

---

## Rules (one line each)

| # | Rule |
|---|------|
| 1 | Panel intro ≤ 1 short sentence (**never blank**) |
| 2 | No roadmap / “later steps” / MOB talk on screen |
| 3 | No “Super admin only” essay in hints — gate UI; keep short *errors* |
| 4 | Buttons = verb + object (no “I've…”) |
| 5 | No lab jargon (`LAB CONSOLE`, agent, APPLY) |
| 6 | **Words only** — zero UI/UX/scroll/CSS/DOM structure change |

---

## V1 replace table (do these)

| Key / place | From | To |
|-------------|------|-----|
| `dockIdentity.done` (+ `index.html` button default) | I've done this | **Mark complete** |
| `dockIdentity.remind` (+ HTML default) | Remind next login | **Remind later** |
| `evidenceRetention.hint` (+ HTML default) | …later steps. Super admin only. | **Categories control how long Library files are kept.** |
| `evidenceDeleteQueue.hint` (+ HTML default) | …Super admin only. Not the same as Archive… | **Queued deletes stay recoverable for 7 days, then purge.** |
| `evidenceHub.exportCleanupNeedRestart` | …You are Super admin — no need to call IT for this. | **Restart the server, hard-refresh (Ctrl+F5), then try again.** |
| `tactical.bpNeedRestart` | Restart Fleet (LAB CONSOLE START)… | **Restart Fleet, hard-refresh (Ctrl+F5), then try again.** |
| `usbMaint.hint` | Super admin only. Connect… | **Connect the body-worn camera by USB to this PC, then refresh.** |
| `opsCases.gateAdmin` | Super admin: you may edit or delete past notes. | **You can edit or delete past notes.** |
| `opsCases.gateOps` | Operators may add notes only. Edit/delete needs Super admin. | **Add notes only. Edit or delete needs a Super admin.** |
| `analytics.weapon.caseGateAdmin` | (same as opsCases.gateAdmin) | same **To** as opsCases.gateAdmin |
| `analytics.weapon.caseGateOps` | (same as opsCases.gateOps) | same **To** as opsCases.gateOps |
| `caseFiles.hintSos` | …when you want a report folder tied to an alarm. | **Ack does not open a Case File. Use Create from SOS when needed.** |
| `caseFiles.hint` | Field-report folders: write the narrative… | **Write the report and link Library evidence.** |
| `opsCases.hint` | Cases for SOS and analytics… | **SOS and analytics cases — notes and status.** |
| `authAudit.checklist.hint` | Lab may show amber… | **Amber while testing is OK. Customer ship needs green. Click a row to open settings.** |
| `server.readiness.license.ok` | License optional in this lab install. | **License optional on this install.** |
| `analytics.fr.previewToastLab` | Preview toast (lab) | **Preview alert** |

Whole-product scan + P1 ladder: `docs/MOB-DISC-UI-COPY-WHOLE-PRODUCT-PROFESSIONAL-20260810.md`

---

## Keep as-is (V1)

| Key | Why keep |
|-----|----------|
| `evidenceRetention.needAdmin` / `*.adminRequired` / `*.needAdmin` | Short **permission errors**, not panel essays |
| `analytics.weapon.caseGateDenied` | Short deny |
| `analytics.weapon.caseEditPrompt` / `caseDeleteConfirm` | Role in confirm OK |
| `dockIdentity.step1–3` / title | Setup checklist — factual steps, not chatty |
| `evidenceDeleteQueue.confirm` | Already short + factual |
| Conference / SMTP “Ask your administrator…” | OK ops tone |
| Full `en.json` rewrite / other locales | Out of scope |

---

## Optional follow-up (not V1)

| Key | Issue | Later |
|-----|--------|--------|
| `dockIdentity.title` | “once per site” slightly casual | Site dock setup |
| `evidenceHub.approvalsSuperNote` | Teachy Super-admin note | Shorten if still loud after V1 |
| P1 long hints (`bwc.hint`, `groups.hint`, deploy hints, …) | Teachy length | `UI-COPY-PROFESSIONAL-PASS-V2` |
| `tech.adminPin.hint` | Mentions Lab | Strip “Lab” in V2; Tech panel only |

---

## APPLY

```text
MOB-APPLY UI-COPY-PROFESSIONAL-PASS-V1
```

Agent: apply **only** the V1 table string values → mirror HTML defaults for those keys → **no CSS/DOM/JS logic**. Self-check (diff = words only). Short APPLY disc.

**PASS:** Words look professional; **layout/scroll/controls feel identical** (only shorter hints / renamed dock buttons).

**Next after V1 PASS:** `MOB-APPLY UI-COPY-PROFESSIONAL-PASS-V2` — shorten **every-page teaching sentences**. Before V2, agent **asks** for whole-locale Grep permission (no silent full scan). Manuals stay separate and must **keep teaching** professionally — see whole-product disc.
