# MOB DISC — Commit/push this pile · not done · roadmap · PTT visual alert (parked)

**Date:** 2026-07-23  
**Status:** PAPER — **commit + push DONE**; **product is not “done”**; PTT visual alert = disc only (**no APPLY yet**)  
**Git:** `backup/20260722-tested-genres` @ `5e2f3a0` → `origin` (ME8)  
**Also see:** `MOB-DISC-WHATS-LEFT-SHIP-READY-MAP-20260723.md`

**Operator:** (1) Commit & push more than redaction (CSS + Evidence + FR + security helpers). (2) Keep the big checklist — **do not say finished**. (3) PTT tile pulse when officer presses talk — plan now, build later (prefer after TLS/HTTPS).

---

## 1) What this commit/push is (and is not)

| Is | Is not |
|----|--------|
| Evidence Hub: redact/trim/Prior/Redacted UX + compact CSS | Full product ship |
| FR blacklist / toast / live grab leftovers (yesterday pile) | Customer zip ready |
| S0 safe upload name + lab creds/image pin + non-SIP crypto IDs (code + verify scripts) | TLS / HTTPS / WSS live |
| Docs MOB-APPLIED / MOB-DISC for this pile | Tactical Zone built |
| History backup on GitHub | “We are done” |

**We are not done.** Shipping still needs the tracks below.

---

## 2) Still open — remember these (simple English)

### Cybersecurity / vulns (ship blockers)

| Item | Status | Why still matters |
|------|--------|-------------------|
| **S0** evidence upload safe filename | **APPLIED** in tree (`MOB-APPLIED-SEC-EVIDENCE-UPLOAD-SAFE-NAME-V1`) — operator live verify before zip | Path traversal — ship FAIL if wrong |
| Lab default secrets / image pin | **APPLIED** (`LAB-DEFAULT-CREDS-AND-IMAGE-PIN-V1`) — pack still needs **strong `.env`**, never commit lab passwords | Don’t ship lab passwords |
| Optional non-SIP `Math.random` IDs | **APPLIED** helper (`SEC-NONSIP-ID-CRYPTO-RANDOM`) | Lower priority leftover closed in code |
| TOTP suspended off | **Only at pack time** | Not a daily nag; pack gate only |
| Floating WVP/ZLM image pins (B7) | Still open per lab-creds APPLIED “outside” | Later hardening |

### TLS / HTTPS / WSS

Lab is still **HTTP**. Multi-PC / customer LAN mic needs **HTTPS + WSS + same-origin media proxy** (Track C: `DASHBOARD-HTTPS…` → proxy).  
**AES** in the plan ≈ Tactical export crypto later — **not** the same as HTTPS.

### Tactical Zone (Google — locked, not built)

Separate map → Turf entry/exit → WVP live + PTT → vault → AAR trim → AES export.  
After vuln/creds leftovers you care about + TLS prefer. **No code** until you name a Tactical APPLY.

### Ship pack

Pre-ship gate (Node 22+, multer, bats, license, smoke) + S0 live PASS + prefer TLS + VERIFY + short handover docs. Zip only a **complete** folder.

### Write-ups / translation

- Locales (en/zh/ko/th/id/fil) — sync when strings change  
- Customer install / migration / user manuals for pack  
- TLS/firewall IT write-up with Track C  
- Legal notices re-check at pack  

### Recommended order (locked for planning)

1. Redact / Evidence / FR leftovers — **this pile advanced; live Finalize PASS where tested**  
2. Security morning — **S0 + lab creds APPLIED**; finish any remaining B leftovers you care about, then pack secrets  
3. **TLS / HTTPS / WSS** genre  
4. Pre-ship + manuals / i18n  
5. Tactical modules 1→4  
6. **Then** (optional) PTT visual alert APPLY  

---

## 3) PTT visual alert — plan only (after TLS likely)

**Working name:** `MOB-EXECUTE-PTT-VISUAL-ALERT-FULLSTACK-V1`  
**Status:** **PARKED** — discuss / remember; **do not APPLY** until you say so (prefer after HTTPS/WSS genre).

### What you want (plain English)

Dispatcher watches bodycam video **muted**. Officer presses **physical PTT** on the device. Firmware does **not** send a clean “button down” SIP event — it just starts sending **PTT audio packets** (UDP) with header `dwCMD = 130`.  

HQ must **see** that tile light up (pulse / mic cue) so they know to unmute. When packets stop (~1s), clear the pulse.

### How (when APPLY later)

| Layer | Job |
|-------|-----|
| Backend | On existing PTT UDP receive: if `dwCMD == 130` → emit `ptt_state { deviceId, active: true }`; **800ms debounce** — if no more 130s → `active: false` |
| Frontend | Listen → add/remove `ptt-incoming-alert` on that device’s video tile |
| CSS | High-visibility pulse (border/glow + optional mic cue) |

### Strict boundaries (locked)

- **Do not** break PTT audio routing or recording  
- **Do not** change SIP call logic — passive listen on UDP `130` only  
- **Do not** start coding until you explicitly `MOB-APPLY` this name (or a shorter rename you choose)

---

## 4) Suggested next after this push

**Next genre (plain English):** **TLS / HTTPS / WSS** (Track C) — so multi-PC / customer LAN mic can work safely.  

Or name any leftover security B item you still care about first.  
**Not** PTT visual alert until after TLS (unless you override).  
**Not** Tactical until you name a Tactical APPLY.

---

## One line

**Push `5e2f3a0` saved Evidence/CSS/FR/security-morning code; product not done — next prefer TLS, then ship/manuals, then Tactical; PTT tile pulse is planned and parked until you APPLY it (after TLS preferred).**
