# MOB DISC — Customer UI copy: no lab jargon (death penalty) (2026-08-09)

**Status:** LOCKED. Death-penalty rule for Mobility Axiom **operator-facing** UI, i18n strings, manuals that ship, and on-screen hints.  
**Trigger:** Ops Cases hint showed “toast / banners / filing cabinet” — unacceptable product face.  
**Related:** `MOB-DISC-SERIAL-OEM-BAN-SHIP-HYGIENE-20260809.md` (OEM / lab leakage). This disc covers **tone + jargon**, not OEM names.

---

## Death penalty

If an operator can read it on screen (or in a customer pack), it must sound like a **control-room product**, not a uni project, not an engineer standup, not Cursor chat.

**Ship FAIL / product FAIL** when customer UI contains lab / implementation slang below.

---

## Forbidden on operator UI (examples — not exhaustive)

| Class | Banned examples |
|-------|-----------------|
| Implementation nicknames | **toast**, “banner” as the product word for alerts, “filing cabinet”, “office vs toast” |
| Meta / agent talk | “wire APPLY”, “MOB”, “sessionStorage”, “deep-link”, “sidecar”, “Colab”, “Cursor” |
| Raw code / status tokens | `ack_only`, `has_notes`, `ops-cases`, JSON keys, API paths, env vars (`FM_…`) as operator copy |
| Student / cute metaphor | “this is the filing cabinet”, “rehearsal only”, “lab preview” as permanent chrome (lab gates stay server-side) |
| Explaining architecture to the officer | “Live alerts stay on toast and banners — …” |

Internal **code comments**, **MOB DISC**, `.cursor` rules may still say toast / Ack path for engineers. **Never** paste that into `en.json`, `index.html` visible text, or customer README.

---

## Required tone

| Surface | How it should read |
|---------|---------------------|
| Evidence → Cases hint | Short, plain: what this list is for (SOS and analytics cases). No metaphor. No “where alerts live”. |
| Status badges | Human words already locked: **Ack only**, **Has notes**, **Amended**, **Reviewed** — never show `ack_only` |
| Empty state | “No cases in this period.” + one calm next step if needed — not “wire APPLYs” |
| Errors | Operator English (“Could not load cases”) — never dump HTML/JSON parse stack into the panel |

---

## Fixed strings (OPS-CASE-UI-COPY-PLAIN-V1)

| Key | Copy |
|-----|------|
| `opsCases.hint` | Cases for SOS and analytics events (face, plate, weapon). Add notes and review status here. |
| `opsCases.empty` | No cases in this period. |
| `opsCases.emptyHint` | Acknowledged SOS and analytics alerts appear here. |

---

## Agent must

1. Before any new UI string: ask “would a police dispatcher understand this without knowing our code?” If no → rewrite.  
2. Never put internal architecture explanations in hints.  
3. Treat violations of this disc like OEM ban — **stop and fix**, do not “leave for later” on customer face.

---

## APPLY

`OPS-CASE-UI-COPY-PLAIN-V1` ✅ (2026-08-09)  
- Rewrote `opsCases.hint`, `opsCases.empty`, `opsCases.emptyHint` + HTML fallbacks  
- Cases load errors no longer dump raw JSON/HTML parse text — show **Could not load cases**
