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

1) Licensing
   - On the TARGET PC, Setup page already shows Hardware ID (no npm).
   - Installer sends that HWID back to Ubitron (new site, temp, migration, or hardware change).
   - Ubitron signs license.lic (HWID + expiry + modules + counts) — license-ui is internal only.
   - Installer uploads the file on Setup, or engineer drops storage/license.lic.
   - Ship env: FM_AIRGAP_LICENSE_REQUIRED=1
   - Never put license-private.pem or tools/generate-license.js in the customer zip
   - Never ship trial_wildcard as a paid commercial license
   - Entitlements: UI grey-out + API limits from .lic (3.4) — smoke if new customer SKU

2) Source protection (3.2)
   - npm run build:ship / build:1pack → me8-server.exe + bin/*-engine.exe (no lib/ / server.js / run.js / raw sidecar .py)
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

## Locked when you say pack / ship (2026-08-18)

**What the customer gets = the release folder `ship-build/protected/`.**  
That is the pack. We zip that. We do not zip live ME8 source.

**Why live ME8 is mentioned:** the build *runs in* this lab tree so the release folder is rebuilt with what you just tested (latest `public/`, compiled `me8-server.exe`, `bin/` engines). Live ME8 is the kitchen. `ship-build/protected/` is the plate we send.

| Do | Do not |
|----|--------|
| Agent runs `npm run build:ship` in ME8 after you say pack / ship | You do not run pack scripts |
| Copy/zip **`ship-build/protected/`** only | Zip the ME8 source tree |
| Leak inspect that folder: no `server.js`, `lib/`, `run.js`, raw `.py`, `license-private.pem` | Send `dist/windows-x64` as the customer pack — it does **not** copy `public/` onto disk |

**Client 1-click (locked):** engines are already in `bin/` (`fr-engine`, `anpr`, `weapon`). Client does **not** drop Python sidecars. Paid modules stay license-gated (grey + API). Redaction stays free; FR engine may still boot for that. No lab IP hardcoded (172 WSL forbidden; dashboard uses real LAN / Setup).

When packing, zip **`ship-build/protected/`** and put **Install + Start** on the zip root if they are not already in that folder — so the client is not left with a bare exe and a lab address.

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
