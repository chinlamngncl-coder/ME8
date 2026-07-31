# MOB DISC — Mobility Axiom manual writing standards (locked)

**Date:** 2026-07-29  
**Status:** **LOCKED PASS** — operator confirmed after Technical Manual v2.1 Chapter 18 PASS  
**Search:** audience isolation, zero developer jargon, UI sync, manual writing standards, Lead Technical Writer  
**Applies to:** All future work under `Mobility Axiom Manuals V1/` and related customer docs  
**Does not replace:** `me8-zero-change-without-apply` (still no file edits without go ahead / MOB-APPLY)

---

## Confirmation (operator required phrase)

Agent acknowledges:

> Confirmed. All future Mobility Axiom manuals will be strictly isolated by audience, free of internal developer jargon, and perfectly synced with the current UI.

---

## Rule 1 — Strict audience isolation

Write for **one** audience per manual. Never mix.

| Manual type | Audience | Allowed | Forbidden |
|-------------|----------|---------|-----------|
| **User Manual / Quick Start** | Everyday operators and dispatchers | UI navigation, viewing streams, actionable clicks, what they see and press | Server architecture, hardware sizing, bare-metal deploy, ports matrices, Master License binding deep-dive, container engine chapters |
| **Installation / Technical / Configuration** | IT administrators | Deployment, network ports, bare-metal/server host, license Hardware ID binding, Server Config, firewall, supporting services | Operator “how to watch live” curricula; filling Tech with dispatcher click-tours |

**Cross-reference only:** IT manuals may say “operators use the Quick Start / User Manual.” Operator manuals may say “ask IT” for server faults — without teaching IT procedure.

---

## Rule 2 — Zero developer jargon

**Forbidden in customer-facing manuals** (non-exhaustive):

| Banned / avoid | Use instead (examples) |
|----------------|-------------------------|
| ZLM latency, buffer tweaks | Plain: live video delay / picture slow to appear — ask IT |
| Smoke tests | Verification checklist / confirm it works |
| Applied PASS, MOB-APPLY, genre, disc | Never in customer body |
| C2, ME8, Glass Fortress (cold dump), 1-Pack, NSSM, Fleet handoff slang | Mobility Axiom; structured how-to-fix log lines; package README |
| Tender / lab slang, “whale icon” as enterprise voice | Container engine / supporting services (Tech only, when required) |

Translate backend behaviour into **what the reader experiences**, not how the code works.

---

## Rule 3 — Exact UI synchronization

- Every feature, tab, and button must match the **finalized July update UI** (live product labels).  
- **Do not invent** feature names.  
- If the dashboard says **Live Dispatch**, write **Live Dispatch** — not a paraphrased engineering nickname.  
- Prefer checking `public/locales/en.json` and the live UI before naming controls.  
- Screenshot placeholders must name the real screen.

---

## Rule 4 — Formatting and scannability

1. **Bold** for **Buttons** and **Tab** names so they stand out (Word/RTF bold).  
2. Procedures = clear **numbered steps** (one action per step).  
3. Avoid dense paragraphs. Prefer short Purpose / Steps / Expected result / Notes blocks.  
4. Clarity first — length is fine when needed for IT depth; padding and mumbling are not.

---

## Role reminder

Agent acts as **Lead Technical Writer** for Mobility Axiom documentation under these rules for **all future manual outputs**, until the operator revises this disc.

---

## Related locks

| Disc / file | Role |
|-------------|------|
| `MOB-DISC-MANUALS-V1-INSTALL-ONPREM-CUSTOMER-VOICE-LOCKED.md` | Installation voice / brand |
| `MOB-DISC-MANUALS-V1-TECH-REFERENCE-V2.md` | Technical Manual structure |
| `MOB-DISC-MANUALS-V1-DOCKER-IN-CUSTOMER-DOCS.md` | Docker only in Tech supporting-services chapter |
| `Mobility Axiom Manuals V1/00 - Manual Format Standard.rtf` | Format / folders (update later if APPLY ordered) |

---

## Record

| Item | Result |
|------|--------|
| Technical Manual Ch.18 Docker | Operator **PASS** |
| Writing standards | **LOCKED** this disc |
| Next manuals | Obey Rules 1–4; still wait for go ahead / MOB-APPLY per item |
