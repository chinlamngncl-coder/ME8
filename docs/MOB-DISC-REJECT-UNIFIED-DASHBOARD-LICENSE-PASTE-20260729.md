# MOB DISC — Reject “Unified Dashboard CSS + license_generator.py + PASS audit” paste as-is

**Date:** 2026-07-29  
**Status:** **STOP / REJECT APPLY** — do not implement this paste into ME8 / Manuals without a corrected, named MOB  
**Search:** unified dashboard CSS, license_generator.py, MOB-102 ZLM buffer, WebRTC Fan-Out, YOLO, tender slang CSS  
**Trigger:** Operator paste titled “lets do this” with CSS + Python license script + “Definitive Applied-But-Unclosed PASS Audit”

---

## Plain answer

**Do not apply this package as written.**

Parts of it sound professional, but large pieces **are not true of Mobility Axiom today** and would **break locked product rules** (WVP/ZLM video base, existing license CRM, existing `global.css` design system, parked ZLM-latency work).

Agent will **not**:

- Replace `public/css/global.css` with this sidebar/WebRTC CSS  
- Add `license_generator.py` as the new license truth  
- Mark ZLM / cloud / RTSP MOBs “DEPRECATED” for reasons that invent a different product  

**Decision:** Treat the paste as a **draft idea dump**. Salvage only after operator picks **one real, named MOB** that matches the live system.

---

## What is wrong (fact check vs our system)

| Claim in the paste | Reality in ME8 / Mobility Axiom |
|--------------------|----------------------------------|
| “We ripped out the old ZLM infrastructure” / WebRTC Fan-Out from edge | **False.** WVP/ZLM handoff remains the locked video base. Do not park or remove it. |
| Close MOB-102 “ZLM Buffer Tweak” as deprecated because ZLM is gone | **Wrong reason.** ZLM latency work is **PARKED** by operator rule — not closed by ripping ZLM out. Do not reopen or close with false architecture. |
| “Cloud Sync superseded by Tri-Modal / AWS VPC / SaaS” | **Not our locked manuals/product story.** We have on-prem + Managed Cloud / Hybrid **manuals planned**, not this Tri-Modal rewrite. |
| “Raw RTSP exposure replaced by WebRTC over 443” as current truth | **Not** how current BWC/SIP + WVP path is documented or locked. |
| Single new Python `license_generator.py` + `/var/log/axiom_license_audit.log` | We already have **Node** license signing + **license-ui CRM** + `license.lic` Ed25519 flow. Do not invent a second master path without a named MOB and operator yes. |
| CSS renames “Left-Nav-ZLM-Tree” / “Matrix-Buffer-Zone” / “Inference-Dump-Queue” | Those slang names are **not** our live class system. Live UI is top tabs (**Operations**, **Command Wall**, …) + existing `global.css` tokens. |
| `.live-dispatch-grid` as the main product surface | Product does **not** currently ship this layout as the Operations dashboard. Inventing it breaks UI↔manual sync. |
| YOLO / PaddleOCR / WebRTC Fan-Out as “finalized architecture” | **Not** locked applied architecture for manuals or ship. Analytics ANPR/weapon are **in progress**; manuals parked until software PASS. |

---

## What is OK to keep as *ideas* (not APPLY)

| Idea | Later use (only if operator orders a real MOB) |
|------|------------------------------------------------|
| Prefer plain English class names over slang | Agree — align with writing standards; rename **only** when touching those files for a named UI MOB |
| Alert badges for weapon / ANPR (plain names) | Useful **after** analytics UI exists — not a full dashboard rewrite now |
| License must have reason + audit trail | Directionally good — map to **existing** CRM/history, do not replace with this Python file blindly |
| 21-day migration license type | Discuss as Migration/license policy MOB — do not silently change generator |

---

## Locked product rules this paste would violate

1. **`me8-wvp-finish-no-park`** — must not say park/remove WVP/ZLM or “ripped out ZLM.”  
2. **`me8-zero-change-without-apply`** — no CSS/product/license rewrite without exact MOB-APPLY.  
3. **ZLM latency user rule** — parked; do not close via false “ZLM gone.”  
4. **Writing / UI standards** — manuals and UI must match live July product, not invented WebRTC fan-out dashboard.  
5. **Analytics park disc** — ANPR/weapon manuals wait for software PASS; do not ship CSS as if modules are finished.

---

## Recommendation (one path)

1. **Ignore this paste for APPLY.**  
2. Continue **ANPR + weapon software** work when you order that genre (product code MOBs — named).  
3. Keep **manuals** on current PASS track; Analytics chapter later.  
4. If you want CSS cleanup: separate MOB later, e.g. `UI-ANALYTICS-ALERT-BADGES-V1`, scoped to Analytics panel only — **not** a full dashboard replacement.  
5. If you want license audit “reason required”: MOB against **existing** `tools/license-ui` / `generate-license.js` — **not** a new Python master key path on Linux `/var/log`.

---

## What to tell the operator (plain)

This package looks like a **different product design** mixed with our brand names. Applying it would break live video, licensing, and manuals.

We already have:

- Dashboard CSS in `public/css/global.css`  
- License signing in the existing Ubitron tools  
- WVP/ZLM live video path (stays)  
- Analytics ANPR/weapon still to finish in software  

---

## Operator choose next

Reply with **one** real item, for example:

- `MOB-APPLY` / go ahead for **ANPR software** (name the exact MOB when ready)  
- or User/Quick Start **PASS** confirmation  
- or a **scoped** UI polish MOB (not this whole paste)

Do **not** say “apply the whole CSS + Python + audit close” unless you explicitly override locked WVP/license facts in a new disc first.

---

## Lock record

| Item | Result |
|------|--------|
| Unified dashboard CSS paste | **REJECT APPLY** |
| license_generator.py paste | **REJECT APPLY** as new source of truth |
| PASS audit closing ZLM/Cloud/RTSP as described | **REJECT** — false architecture |
| Salvage | Plain-English naming + future analytics badges + CRM audit reason — only via later named MOBs |
| Agent action now | Disc only — **no file edits** from this paste |
