# MOB DISC — Counter-check done manuals vs writing standards

**Date:** 2026-07-29  
**Status:** **APPLIED 2026-07-29** — `MANUALS-V1-USER-QUICKSTART-UI-SYNC-V1`  
**Operator review:** pending PASS / FAIL on User Manual v1.1 + Quick Start v1.1  
**Files:** `User/EN/User Manual.rtf` · `Quick Start/EN/Quick Start Guide.rtf`  
**Standards:** `MOB-DISC-MANUALS-V1-WRITING-STANDARDS-LOCKED.md` (Rules 1–4)  
**Search:** manuals audit, audience isolation, jargon, UI sync, bold buttons, Installation Guide, Technical Manual, User Manual, Quick Start  
**Scope audited:** Installation Guide v1.1 · Technical Manual v2.1 · User Manual V1 · Quick Start V1 · Format Standard (internal)

---

## Plain answer

**Checked.** Installation and Technical (the books we finished this genre) are **mostly compliant** with the new standards. User Manual and Quick Start are **not fully ready** to call PASS under Rules 1–4 — they need a dedicated sync MOB before we treat them as “done.”

Do **not** open Managed Cloud / Hybrid yet until you decide whether to patch the gaps below.

---

## Scorecard (customer manuals)

| Manual | Rule 1 Audience | Rule 2 No jargon | Rule 3 UI sync | Rule 4 Format/scan | Overall |
|--------|-----------------|------------------|----------------|--------------------|---------|
| **Installation Guide** (PASS book) | **PASS** — IT only; operators pointed out | **PASS** — no C2/ME8/ZLM/smoke/PASS slang | **PASS-** — Setup / Settings labels OK; UI bold weak | **PASS-** — numbered steps good; little **bold** on buttons; some long blocks | **PASS with polish later** |
| **Technical Manual** v2.1 (PASS book) | **PASS** — IT reference; operators told not to manage containers | **PASS-** — no banned tender slang; a few IT terms (nginx, RTP, WebSocket, journalctl) are OK for IT if kept plain | **PASS** — six phases + Type on BWC + Trust reverse proxy match product | **PASS-** — procedures clear; button/tab **bold** mostly missing | **PASS with polish later** |
| **User Manual** V1 | **FAIL soft** — staff meta in §1; first-login OK but thin vs July UI depth | **PASS-** | **FAIL soft** — short / incomplete vs July UI; needs label pass | **FAIL soft** — clicks often not bold; thin procedures | **Needs MOB before “done”** |
| **Quick Start** V1 | **FAIL soft** — points operators at Technical Manual for ports/deployment | **PASS-** | **PASS-** — main tab list matches live nav (`Operations`, `Evidence & Docking`, `Command Wall`, … `CAD / RMS`) | **FAIL soft** — bold on buttons incomplete | **Needs MOB before “done”** |
| **Format Standard** | N/A (internal) | Contains “Word-first” / staff — **OK here**, must never leak into customer guides | N/A | N/A | Internal only |

---

## Rule 1 — Audience isolation (detail)

### Installation Guide — PASS
- Written for customer IT.
- Explicitly separates operators (portal URL / User + Quick Start).
- Server Config chapter is **minimum handoff** only — full phases deferred to Technical Manual. Correct.

### Technical Manual — PASS
- IT architecture, ports, Server Config, license, containers, recovery.
- Operators told not to manage Setup or container engine.
- Does not teach dispatcher click-tours. Correct.

### User Manual — gaps
| Issue | Where | Why it fails Rule 1 / standards |
|-------|-------|----------------------------------|
| Staff meta | §1 “This is the working Word copy… Insert screenshots later…” | Mumbling to docs staff — forbidden in customer body |
| Thin day-2 UI | Many tabs are one short list | Not wrong audience, but not July-depth operator manual yet |
| First-login block | §3 | Allowed (operators may hit it once); prefer “ask IT for first-day account” tone for returning sites — already partly there |

### Quick Start — gaps
| Issue | Where | Why |
|-------|-------|-----|
| Points operators to Technical Manual for ports/deployment | Near end | Audience bleed — operators should get “ask your administrator / Installation or Technical manuals are for IT” without inviting them into ports chapters |
| “deployment handoff staff” in Audience | Cover | Mild mix — OK if they only do first sign-in; keep IT setup out of body |

**Recommendation:** Next operator MOB must **strip staff meta** and **stop sending operators into Tech ports chapters**.

---

## Rule 2 — Zero developer jargon (detail)

### Clean (good)
- No: ZLM latency, buffer tweaks, smoke tests, applied PASS, MOB-APPLY, C2, ME8, Glass Fortress cold dump, Fleet handoff slang, whale-icon enterprise voice.

### Acceptable in Technical Manual (IT audience)
These are **not** banned tender slang; they are normal IT words. Keep them, but prefer plain gloss on first use:

| Term in Tech today | Keep? | Note |
|--------------------|-------|------|
| nginx / Caddy / IIS | Yes | Common reverse-proxy names |
| RTP / WebSocket | Yes | Match firewall checklist language; optional plain gloss once |
| journalctl | Yes | Linux IT standard |
| Docker Engine / Docker Desktop / container | Yes | Chapter 18 by design |
| environment / package setting | Soften later? | Prefer “package README settings” only |

### Installation / User / Quick Start
- Factory credentials `global` / `global123` — **allowed** (product fact + first-login lock). Not developer jargon.

---

## Rule 3 — Exact UI synchronization (detail)

### Matches live UI (good)
- Nav tabs in User / Quick Start align with `nav.*` / index: **Operations**, **Evidence & Docking**, **Command Wall**, **Centre Summary**, **Video Conference**, **Settings**, **Analytics**, **CAD / RMS**, **Tactical**.
- Tech phases: **Identity**, **Networking**, **Access & Security**, **Storage & Devices**, **Resiliency**, **Diagnostics**.
- **Type on BWC**, **Device registration IPv4**, **Operator portal URL**, **Trust reverse proxy**, **SIP port** — match `en.json`.

### Gaps / risks
| Item | Manual | Risk |
|------|--------|------|
| Full July Settings / Evidence Hub depth | User Manual | Still outline-level — not invented names, but **incomplete sync** |
| Button labels (Pin, PTT, Call, Sign in, Save and continue) | User / Quick Start / Install / Tech | Names look right; Rule 4 wants them **bold** consistently |
| “Video Wall” vs Operations wall | User §14 | OK if describing Operations live wall — verify wording against on-screen labels in next User MOB |
| “Live Dispatch” | None of the PASS books invent alternate names | Good — do not introduce nicknames later |

---

## Rule 4 — Formatting and scannability (detail)

| Book | Numbered steps | Dense paragraphs | Bold Buttons/Tabs |
|------|----------------|------------------|-------------------|
| Installation | Strong | Some long planning paragraphs (acceptable for IT; can tighten later) | **Weak** — Settings / Install license / Sign in rarely bolded as UI chrome |
| Technical | Strong (Purpose / Steps / Expected) | Medium — IT depth OK | **Weak** — phase names bold as headings; in-step UI names often plain |
| User / Quick Start | Short steps | Sparse (sometimes too thin) | **Weak** — Sign in / Pin / PTT often not bold |

**Standards gap shared by all four customer RTFs:** Rule 4 bold-for-UI was locked **after** these drafts. Treat as **polish MOB**, not a rewrite of Installation/Tech substance.

---

## Verdict by book

### Keep as PASS (substance)
1. **Installation Guide v1.1** — audience + jargon + install path OK.  
2. **Technical Manual v2.1** — audience + 6-phase + Docker chapter OK.

### Do not call “standards PASS” yet
3. **User Manual V1** — remove staff meta; deepen July UI; bold UI; audience-pure.  
4. **Quick Start V1** — stop pointing operators into Tech ports; bold UI; keep short.

### Internal only
5. **Format Standard** — may keep Word-first for staff; never copy that sentence into User/Install/Tech customer body.

---

## Recommended next APPLYs (one at a time — after you order)

| Order | MOB name | Why first |
|-------|----------|-----------|
| 1 | `MANUALS-V1-STANDARDS-POLISH-INSTALL-TECH-V1` | Light polish only: bold UI labels in Installation + Technical; optional one-line gloss for RTP/WebSocket; **no** chapter rewrite |
| 2 | `MANUALS-V1-USER-QUICKSTART-UI-SYNC-V1` | Full Rule 1–4 pass on User + Quick Start (strip meta, July UI, bold, no Tech ports invitation) |
| 3 | Managed Cloud / Hybrid guides | Only after operator books are standards-clean |

**Single recommendation:** Do **#2 User/Quick Start UI sync** next if the goal is “finish audience isolation.” Do **#1 polish** first if you want Installation/Tech visually compliant with Rule 4 before touching operators.

**Risk pick:** Prefer **#2 next** — Installation/Tech are already usable; User/Quick Start are the standards gap that will embarrass us in front of operators.

---

## What this disc is NOT

- Not an APPLY  
- Not a rewrite order  
- Not a FAIL of Installation/Tech PASS substance  

---

## Lock record

| Item | Result |
|------|--------|
| Standards disc | Already LOCKED |
| Counter-check | This disc |
| Installation / Tech substance | PASS stands |
| User / Quick Start | Must sync before genre “operator manuals done” |
| Operator | Read → choose polish Install/Tech first, or User/Quick Start sync first, then go ahead |
