# MOB DISC — Commit/push this pile · not done · roadmap · PTT visual alert (parked)

**Date:** 2026-07-23  
**Status:** PAPER — commit/push of Evidence + CSS work; **product is not “done”**; PTT visual alert = disc only (**no APPLY yet**)  
**Operator:** (1) Commit & push more than redaction (CSS + yesterday’s Evidence work). (2) Keep the big checklist in mind — don’t say finished. (3) PTT tile pulse when officer presses talk — plan now, build later (after TLS/HTTPS likely).

---

## 1) What this commit/push is (and is not)

| Is | Is not |
|----|--------|
| Evidence Hub: redact/trim/Prior exports/Redacted exports UX + compact CSS | Full product ship |
| Related docs (MOB-APPLIED / MOB-DISC for this pile) | Security S0 / lab secrets / TLS / Tactical / ship zip |
| History backup on GitHub | “Customer ready” |

**We are not done.** Shipping still needs the tracks below.

---

## 2) Still open — remember these (simple English)

### Cybersecurity / vulns (ship blockers)

| Still open | Why |
|------------|-----|
| **S0** evidence upload safe filename | Path traversal — must PASS before customer zip |
| Lab default secrets (LiveKit / WVP / ingress:latest) | Don’t ship lab passwords |
| Optional non-SIP `Math.random` IDs | Lower priority |
| TOTP suspended off | Only at **pack** time |

### TLS / HTTPS / WSS

Lab is still **HTTP**. Multi-PC / customer LAN mic needs **HTTPS + WSS + same-origin media proxy** (Track C: `DASHBOARD-HTTPS…` → proxy).  
**AES** in the plan ≈ Tactical export crypto later — **not** the same as HTTPS.

### Tactical Zone (Google — locked, not built)

Separate map → Turf entry/exit → WVP live + PTT → vault → AAR trim → AES export.  
After vuln/creds + leftovers you care about. **No code** until you name a Tactical APPLY.

### Ship pack

Pre-ship gate (Node 22+, multer, bats, license, smoke) + **S0** + prefer TLS + VERIFY + short handover docs. Zip only a **complete** folder.

### Write-ups / translation

- Locales (en/zh/ko/th/id/fil) — sync when strings change  
- Customer install / migration / user manuals for pack  
- TLS/firewall IT write-up with Track C  
- Legal notices re-check at pack  

### Recommended order (locked for planning)

1. Redact finish loop / FR Verify ops *(Evidence pile largely advanced — live Finalize PASS)*  
2. **Security morning:** S0 → lab creds / image pin  
3. **TLS / HTTPS / WSS** genre  
4. Pre-ship + manuals / i18n  
5. Tactical modules 1→4  

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

**`MOB-APPLY` security morning first item** (plain English): evidence upload safe filenames (**S0**) — stop path-traversal risk before any customer zip.  

Then lab secrets pin → TLS genre → … → later PTT visual alert.

---

## One line

**Push saves Evidence/CSS work; product not done — next security S0, then TLS, ship, Tactical; PTT tile pulse is planned and parked until you APPLY it (after TLS preferred).**
