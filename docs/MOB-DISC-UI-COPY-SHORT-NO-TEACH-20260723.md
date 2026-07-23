# MOB DISC — UI copy: short labels, not a teaching product

**Date:** 2026-07-23  
**Status:** DISC locked — **no APPLY** until you name the phrase  
**Trigger:** Call Groups box shows a long how-to paragraph. Operator: software is **not** a learning product; user manual comes later; strip this style across the app.

**Also locked today:** Call Groups **PASS** · GPS Lock→Unlock **PASS**

---

## You are right

| Wrong (today) | Right (product) |
|---------------|-----------------|
| In-app essays: “Same pick as PTT Groups — Join starts a discussion…” | Short title + buttons. Maybe one short status line when needed |
| Teach workflows in every `.hint` / `.setup-hint` | Workflow lives in **user manual** (later) |
| Agent invents “helpful” tutorial chrome | Labels only unless you APPLY more |

**Axiom is an ops console** — not training software.

---

## Example (your screenshot)

**Now:**  
`CALL GROUPS`  
`Same pick as PTT Groups — Join starts a discussion call (HQ + units). Mic stays open until you End.`

**Simple (direction):**  
`CALL GROUPS`  
(no paragraph — Join / End speak for themselves)

Same idea for **PTT Groups** long hint and other boxes.

---

## Scope of the problem (agent surveyed)

Teaching-style copy is **widespread**, not only Call Groups:

| Area | Examples (style) |
|------|------------------|
| Left panel | `ptt.groupBox.hint`, `call.groupBox.hint`, members “× exclude · + include…”, Messages retention essay |
| SOS / geofence / kill-switch | Multi-sentence “for the incident report only…”, geofence confirm essays |
| Server Config | Many `setup-hint` blocks (LAN, WAN, users, docking, readiness…) |
| Map / wall | Some HUD/mirror hints |

**Primary home for strings:** `public/locales/en.json` (+ other locales) and hardcoded fallbacks in `public/index.html`.

---

## Locked product rules (for every future MOB)

1. **UI = name it, don’t teach it** — title, button, short error/status only.  
2. **No “how it works” paragraphs** under boxes unless you explicitly APPLY that text.  
3. **User manual later** owns workflows, comparisons (“same as PTT”), and mic behaviour.  
4. **Do not** invent new tutorial chrome “to help operators.”  
5. Errors can stay clear (“Select at least 2”) — that is ops feedback, not a lesson.

---

## Recommended APPLY (when you want the sweep)

**Name:** `UI-COPY-SHORT-NO-TEACH-V1`

| In | Out |
|----|-----|
| Shorten / remove teaching `.hint` and `.setup-hint` strings (start: PTT Groups, Call Groups, then left panel; Server Config second pass if you want) | Rewriting product behaviour |
| Keep i18n keys; change English (and sync locales if required by project) | New features, layout inventing |
| One genre: **copy only** | Bundling Tactical / video / SIP |

**PASS:** Call Groups / PTT Groups / similar boxes show **title + controls**, not tutorial paragraphs. You say it looks like a console, not a textbook.

**Optional later:** `UI-COPY-SHORT-SERVER-CONFIG-V1` if Server Config hints are a second wave.

---

## Phrase when ready

**`MOB-APPLY UI-COPY-SHORT-NO-TEACH-V1`**

Until then: disc only — agent will not freestyle-delete hints.

---

## Agent must understand

You are not asking for fewer features. You are asking for **less in-app teaching**. Manual later. This disc wins over “add a helpful sentence under the button.”
