# MOB DISC — Whole-product professional UI copy (2026-08-10)

**Status:** LOCKED paper.  
**Scan:** `public/locales/en.json` (~44+ flagged). **Whole product**, not Evidence-only.  
**Copy-only on UI:** words only — no CSS/DOM/scroll/UX.  
**Cursor:** `.cursor/rules/me8-ui-copy-professional.mdc` + `.cursorrules`.

**Extends:** lab-jargon death-penalty · no-essays · PASS-V1 plan.

---

## Scan / Grep permission (locked)

Standing rules (`.cursorrules` CREDIT-LEAN · `token-lean` · `me8-credit-lean-hard`): **no autonomous whole-repo scan**.

| Need | Agent must |
|------|------------|
| Full `en.json` Grep / whole-UI copy scan / P1 length sweep | **Ask first** — e.g. “Need whole-locale Grep for PASS-V2 — OK?” |
| User says scan / grep whole / “you may scan” | Allowed **for that turn’s stated scope** only |
| `CREDIT-LEAN-HARD` / `NO-SCAN-THIS-TURN` | Hard stop — no Grep/Glob explore |
| Named APPLY with known keys (V1 table) | Touch listed keys only — **no** extra scan |

**Never** “just Grep everything to be helpful” without asking.

---

## Split (locked) — UI vs manuals

| Surface | Teach? | Rule |
|---------|--------|------|
| **On-screen UI** (hints, intros, `setup-hint`, buttons) | **No essays** | Title + ≤1 short calm line. Detail lives in manuals. |
| **Customer manuals** (User / Config / Install / Quick / Migration, ship guides) | **Yes — teach** | Step-by-step, professional, so a non-tech user **understands**. Clear, calm, complete. Not lab slang / not agent chat. |

**Never** dump a manual chapter into every Ops page.  
**Never** strip manuals down to one-liners — manuals are where teaching belongs.

---

## Teaching sentences on every page (UI) — IN SCOPE

These are the grey/muted **panel intros** under titles (`*.hint`, `*.intro`, `setup-hint`, rail notes). Enterprise UIs do **not** teach the whole feature on every page.

| Pass | What | APPLY |
|------|------|--------|
| **P0** | Bombs: I've done… / later steps / LAB CONSOLE / lab install / Super-admin essays | `UI-COPY-PROFESSIONAL-PASS-V1` |
| **P1** | **Every-page teaching lines** — shorten all long `hint`/`intro`/`Note` (≥~140 chars) to ≤1 sentence | `UI-COPY-PROFESSIONAL-PASS-V2` |

### P1 must cover (every page class — not a “maybe”)

| Area | Example keys (shorten, don’t delete element) |
|------|-----------------------------------------------|
| Settings / BWCs / Groups | `bwc.hint` · `groups.hint` · `server.bwcTabHint` · `server.deploymentHint.*` |
| Evidence | `evidence.pathsHint` · `evidence.ftpCredentialsHint` · `evidenceHub.trimHint` · `evidenceHub.approvalsHint` · `evidenceHub.priorExportsHint` · Retention/Delete already in P0 |
| Live / Wall / Conference | `video.wall.hint` · `conference.layoutHint` · `displayRoom.streamNote` |
| Analytics | `analytics.bl.hint` · quality hints |
| Firmware / Cloud / Audit | `firmware.hint` · `cloud.intro` · `auditTrail.introKillSwitch` |
| Login / Tech | `login.hintPassword` (keep gate meaning) · `tech.adminPin.hint` (strip Lab from Ops-facing if shown) |

V2 = full Grep of `hint|intro|Note|setupHint` in `en.json` with length ≥140 — **all of them**, not Evidence only. Same hard lock: words only; natural height shrink.

---

## P0 bombs (table)

See `MOB-DISC-UI-COPY-PROFESSIONAL-PASS-V1-PLAN-20260810.md` — dock, Retention, Delete queue, LAB CONSOLE, lab install, gates, case hints.

---

## Manuals (separate genre — teach professionally)

| Do | Don’t |
|----|--------|
| Explain what / why / how in order | Lab nicknames, MOB, Cursor, toast-as-product |
| Screenshots + numbered steps | Dump same wall of text into UI hints |
| Install / Migration / User / Config / Quick | Copy-paste agent standup into customer PDF |

Manual rewrites = **named manuals APPLY** (existing Manuals V1 discs). **Not** part of UI PASS-V1/V2 string swap.  
When writing manuals: professional teacher voice — clear enough for site admin / dispatcher who never saw the lab.

---

## APPLY ladder

1. `MOB-APPLY UI-COPY-PROFESSIONAL-PASS-V1` — P0 bombs  
2. `MOB-APPLY UI-COPY-PROFESSIONAL-PASS-V2` — **all every-page teaching sentences** (P1)  
3. Manuals: only when you name a manuals APPLY — **keep teaching**, polish professional

---

## Agent forever

- **UI** = short label. **Manual** = teach properly.  
- Never move a manual essay onto every page “to help.”  
- Never gut manuals to match UI one-liners.
