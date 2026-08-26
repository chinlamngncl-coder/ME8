# MOB DISC — Installation Guide rewrite FAIL: wrong reader, wrong brand, wrong voice

**Date:** 2026-07-28  
**Status:** **FAIL / STOP** — enterprise rewrite rejected by operator  
**File:** `Mobility Axiom Manuals V1/Installation/EN/Installation Guide - ENTERPRISE-REWRITE.rtf` (and any overwrite of `Installation Guide.rtf`)  
**MOB name that failed:** `MANUALS-V1-INSTALLATION-GUIDE-ENTERPRISE-REWRITE-V1`  
**Search:** manuals target reader, C2 brand, Glass Fortress jargon, Word-first meta, Linux distro, mumbling, new install only

---

## Plain answer

**You are right. This rewrite failed again.**

The agent wrote an **internal production note / lab diary** and put it in a **customer Installation Guide**. That is not professional. It is not readable. It does not know its audience.

**Do not ship this text.**  
**Do not ask the operator to “read more and PASS.”**  
Next rewrite only after this disc is locked and a **named APPLY** is ordered with a **reader-first outline** approved first (paper only).

---

## Target reader (locked — agent forgot)

| Manual | Who reads it | What they need |
|--------|--------------|----------------|
| **Installation Guide — On-Premises** | **Customer IT** on a **new** site install | Clear numbered steps: install service → Setup → send HWID to Ubitron → upload license → first login → hand portal URL to operators |
| **Not the reader** | Ubitron documentation staff, Cursor agent, lab desk, trial migrators | Their notes belong in Format Standard / internal ship desk — **never** inside the customer guide body |

**One test:** If a sentence helps **only** the person writing the Word file, **delete it** from the customer guide.

---

## Failures the operator named (confirmed in file)

### 1) Meta “Word-first / PHOTO SPACE / Screenshot rule for staff”

**In the guide:** “This is the Word-first working copy… Screenshot rule for staff…”

**Why it fails:** Customer IT does not care how Ubitron staff insert screenshots. That is **mumbling to ourselves**.

**Rule:** Customer manuals may have a short placeholder line only, e.g.  
`[Insert screenshot: Setup page with Hardware ID]`  
No “Word-first”, no “staff paste rules”, no “PDF export” workshop text in the Installation Guide body.

Internal capture checklist → `00 - Manual Format Standard` or a private `Shared Assets` note — **not** customer Section 1 / Section 14.

---

### 2) “Glass Fortress recovery / Glass Fortress message”

**Why it fails:** Internal codename dumped on the customer without being introduced as a plain product feature.

**Customer language (when needed):**  
“If the service log shows a structured fault block with three lines (what happened / why / how to fix), follow the **How to fix** line.”  
Optional one sentence: “Ubitron calls this fault format **Glass Fortress** in the Technical Manual.”

Do **not** open Related manuals with “Glass Fortress recovery” as if every IT reader already knows the nickname.

---

### 3) “Linux?” with no distro

**Why it fails:** “Supported Linux with systemd” is vague. Customer IT asks: Ubuntu? RHEL? What version?

**Honest product status today:** Linux unit file exists (`me8-server.service`); **full supported-distro matrix is not locked in ship docs yet**.

**Until Ubitron locks a matrix, customer Installation Guide must say one of:**

- **Windows Server first** as the primary supported path for this V1 guide, **or**  
- “Linux: only the distribution and version listed in **your Ubitron delivery cover letter / README** for this order.”

**Forbidden:** Vague “a supported Linux server” with no pointer.

**Agent must ask operator (before next APPLY):** Which Linux distros to list for V1? (e.g. Ubuntu 22.04 LTS / RHEL 9 only — operator decides.)

---

### 4) Brand: still “Mobility Axiom”

**In the guide:** “display name similar to Mobility Axiom / Mobility Axiom”

**Locked brand (already):** Product = **Mobility Axiom**. Company = **Ubitron**.  
Say: **Ubitron Mobility Axiom** or **Mobility Axiom**.  
**Never** C2 in customer manuals.

Disc: `MOB-DISC-BRAND-AXIOM-NOT-C2.md`  
Windows service internal name may still be `UbitronC2` in scripts — **customer-facing text must not teach C2**.

---

### 5) Trial / lab asides on a **new installation** manual

**In the guide:** “If a prior trial console was left running, stop it first…”

**Why it fails:** This guide is for **new clients / new installs**. Trial/lab conflict language belongs in **Migration Guide**, not the main Installation Guide.

**Forbidden in Installation Guide body:** trial console, lab Start bat fights, “old ME8 folder”, university zip habits, agent desk war stories.

---

### 6) Overall voice: mumbling

Symptoms of agent-to-self writing:

- Internal MOB / format / ship-desk vocabulary in customer prose  
- Hedging (“similar to”, “example when that flag is provided”) instead of one clear path  
- Stacking meta process on top of install steps  
- Assuming reader shares lab history  

**Voice rule:** Cisco / Milestone / Genetec install guide — **second person, one path, numbered steps, expected result**. No diary.

---

## What the Installation Guide MUST be (next try — outline only)

**Title:** Mobility Axiom — Installation Guide (On-Premises)  
**Brand line:** Ubitron  

**Sections (customer only):**

1. Who this guide is for  
2. What you need before you start (OS list **as operator locked**; network; package; Ubitron contact for license)  
3. Install the server service (Windows path; Linux only if distro locked)  
4. Open Setup on the server (`http://127.0.0.1:13988`) and enter the PIN from the log  
5. Copy Hardware ID → send to Ubitron → receive `license.lic` → upload  
6. Choose LAN-Only or WAN (Public Edge) — point Cloud/Hybrid to other guides  
7. First sign-in and forced password change  
8. Set Operator portal URL; note that SIP/IP/ports can be changed later in Settings (short; detail in Technical Manual)  
9. Smoke check and handoff (portal URL + User/Quick Start)  
10. Common problems (plain language)  

**Placeholders:** `[Insert screenshot I-xx: …]` only — no staff workshop chapter.

**Out of customer guide:** Word-first manifesto, PHOTO SPACE paste height rules, Glass Fortress nickname without intro, C2, trial console, agent Document Control MOB names in the body (Document Control footer OK if short).

---

## Agent must NOT

- Rewrite the Installation Guide again until operator says **MOB-APPLY** with this disc’s voice rules.  
- Put documentation-staff process into customer manuals.  
- Use **C2** in customer-facing manuals.  
- Write “Linux” without a locked distro list or cover-letter pointer.  
- Put trial/lab migration notes in a **new install** guide.  
- Ask the operator to “skim for PASS” on mumbling drafts.

---

## Recommended next (when operator is ready)

1. Operator answers: **Windows-only V1?** or **which Linux distros?**  
2. Paper outline only (sections above) → operator OK.  
3. Then **`MOB-APPLY MANUALS-V1-INSTALL-ONPREM-CUSTOMER-VOICE-V1`** — full replace, short, cold, professional.

Until then: treat ENTERPRISE-REWRITE as **REJECTED**.

---

## Record

| Item | Result |
|------|--------|
| Operator | Cannot read past meta / C2 / trial / vague Linux / Glass Fortress dump |
| Verdict | **FAIL** — wrong reader |
| Root cause | Agent wrote for self + lab, not customer IT on a new install |
| Brand | Must say **Ubitron Mobility Axiom** — never C2 |
| Related | `MOB-DISC-BRAND-AXIOM-NOT-C2.md`, `MOB-DISC-MANUALS-V1-PROFESSIONAL-REPLAN-V1.md` |
