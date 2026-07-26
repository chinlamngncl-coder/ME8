# MOB-DISC — When you say ship / pack: AI gathers the full checklist (you don't chase it)

**Date:** 2026-07-25  
**Status:** LOCKED  
**Audience:** Operator (designer) — AI must remind; operator does not have to remember the list  
**Related:** `MOB-DISC-SHIP-REMINDERS-NO-NAG.md` (still: **no daily nag**), `me8-pre-ship-gate.mdc`

---

## Problem you called out

You are designer + operator. Licensing, source protection, and packaging robot smoke are **easy to forget**.  
You should **not** have to tell the AI “remember packing smoke.”  
When you say **ship / pack / customer pack / packing checklist / CREATE ship**, the AI must **gather and remind** the full Phase 3 + pack story in one place — then you test, confirm, finish, ship.

---

## Locked behavior

| When | AI does |
|------|---------|
| Ordinary MOB / FR / live | **Silent** on this list (no nag) |
| You say **ship**, **pack**, **customer pack**, **packing checklist**, **CREATE ship**, **send to client** | Print **Section A — Pack gather reminder** below (plus pre-ship gate Section A if packing zip) |

You do **not** need to recall HWID steps, `build:ship`, or GitHub robot smoke. AI owns the reminder.

---

## Section A — Pack gather reminder (print when ship/pack)

Copy this block into the reply (plain English):

```
PACK GATHER (Phase 3 + release) — do with me, then ship:

1) Licensing (3.1 + 3.4)
   - On CUSTOMER SERVER: npm run license:print-hwid
   - Offline: sign license.lic (features + maxFixedCameras + maxBwcDevices)
   - Ship env: FM_AIRGAP_LICENSE_REQUIRED=1
   - Drop storage/license.lic into pack
   - Entitlements: UI grey-out + API limits from .lic (3.4) — smoke if new customer SKU

2) Source protection (3.2)
   - npm run build:ship  → ship-build/protected/run.js (no lib/ / server.js)
   - Optional: FM_SHIP_OBFUSCATE=1
   - Never ship license-private.pem or tools with private key

3) Packaging Robot smoke (3.3) — if not done yet
   - Push .github/workflows if needed
   - Publish a GitHub Release (test tag OK) → Actions green → three assets on Release
   - Disc: MOB-DISC-PACKAGING-ROBOT-SMOKE-PARK-UNTIL-SHIP-20260725.md

4) Classic pack gate (still)
   - PRE-SHIP-GATE checklist Section A
   - FM_TOTP_SUSPENDED off for real customer
   - SOS ledger = PASS (do not re-test unless asked)

Then: you PASS each smoke → we finish → zip / send.
```

---

## Docs map (AI opens these when packing)

| Topic | Doc |
|-------|-----|
| License test + grey story | `MOB-DISC-LICENSE-SHIP-TEST-AND-GREYOUT-STORY-20260725.md` |
| Per-client pack control | `MOB-DISC-PACK-CONTROL-PER-CLIENT-20260725.md` |
| Air-gap license APPLIED | `MOB-APPLIED-AIRGAP-LICENSE-LIC-ED25519-V1-20260725.md` |
| Code protection APPLIED | `MOB-APPLIED-CODE-PROTECTION-SHIP-PACKAGING-V1-20260725.md` |
| Packaging robot APPLIED | `MOB-APPLIED-PACKAGING-ROBOT-ISSUE-TEMPLATES-V1-20260725.md` |
| Entitlements APPLIED | `MOB-APPLIED-LICENSE-ENTITLEMENTS-ENFORCE-V1-20260725.md` |
| Release how-to | `docs/RELEASE_GUIDE.md` |
| Robot smoke park | `MOB-DISC-PACKAGING-ROBOT-SMOKE-PARK-UNTIL-SHIP-20260725.md` |
| Pre-ship gate | `ME8-INTERNAL/ship-desk/PRE-SHIP-GATE-CHECKLIST.md` |

---

## Explicit non-goals

- Do **not** open ordinary chats with this gather list  
- Do **not** re-nag SOS ledger  
- Do **not** mention TOTP except inside this pack gather / pre-ship gate  

---

## Lock phrase

**On ship/pack keywords: AI gathers licensing + source protection + packaging robot + pre-ship gate. Operator confirms smokes; AI does not wait for operator to remember.**
