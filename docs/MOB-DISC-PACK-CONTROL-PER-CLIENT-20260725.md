# MOB DISC — How we pack a finished product (control per client)

**Date:** 2026-07-25  
**Audience:** Operator / ship desk (plain English)  
**Status:** LOCKED MEMORY  
**Trigger:** You ask **ship / pack / customer pack** — not every lab day  

Related:  
- Pre-ship gate: `ME8-INTERNAL\ship-desk\PRE-SHIP-GATE-CHECKLIST.md` (outside product zip)  
- License ops: `docs/LICENSE-OPERATIONS.md`  
- Air-gap `.lic` (3.1): `docs/MOB-DISC-LICENSE-SHIP-TEST-AND-GREYOUT-STORY-20260725.md`  
- Brand: Mobility **Axiom** (not C2 in UI)

---

## Short answer

| Question | Answer |
|----------|--------|
| How do we pack when the product is ready? | Run **customer pack build** on the ship desk → signed license(s) + install folder + Start bats → zip. |
| Do different clients need a different UI rebuild every time? | **Usually no.** One product codebase; **control** = license + env/settings + optional SKU flags. Change later by re-issue license / replace file / re-pack — not a new app. |
| Where is control? | **Contract → license entitlements → pack bake-in → customer Start.** Grey UI (Task 3.3) later reads the same license. |

---

## The control model (one product, many clients)

Think of three layers:

```
┌─────────────────────────────────────────────┐
│ 1. PRODUCT (ME8 code) — same for everyone   │
│    Axiom UI, Tactical, video, SOS, …          │
└───────────────────┬─────────────────────────┘
                    │
┌───────────────────▼─────────────────────────┐
│ 2. ENTITLEMENTS — per client contract         │
│    license.lic (HWID + expiry + features)     │
│    platform-license.json (BWC/user caps)      │
│    Later: grey-out / hard limits (3.2–3.3)    │
└───────────────────┬─────────────────────────┘
                    │
┌───────────────────▼─────────────────────────┐
│ 3. SITE CONFIG — per install                  │
│    .env (LAN IP, ports, WVP flags, …)         │
│    Settings in dashboard (zones, cams, …)     │
│    Optional SKU (e.g. Video Conference pack)  │
└─────────────────────────────────────────────┘
```

**Different clients** = different **layer 2 + 3**, not a fork of the whole UI tree — unless you explicitly order a branded OEM pack later.

What you can change **later** without rewriting the app:

| Change | How |
|--------|-----|
| More BWC / more cams | Re-issue license with higher max → replace file → restart |
| Turn Overwatch on/off | `features` in `license.lic` (after Task **3.3** greys UI) |
| Longer expiry | Re-issue with new date → replace → restart |
| New LAN IP | Site `.env` / Settings — not a new zip every time |
| Add VC module | Pack with `-VideoConference` SKU (existing build flag) |

What needs a **new pack** (new zip):

- New ME8 code version (bugfixes / features you APPLIED after last ship)  
- First delivery to a site  
- Public key / runtime dependency change  

---

## Pack recipe (when you say “ship”)

### Step 0 — Product ready

- Genre / Phase work you care about is **PASS**  
- Lab not mid-broken MOB  
- You explicitly say **ship / pack / customer pack**

### Step 1 — Target server identity

On the **customer server PC** (or staging PC that matches it):

```powershell
cd "C:\Users\user\Desktop\Enterprise Mobility\ME8"
npm run license:print-hwid
```

Keep that HWID for air-gap `license.lic` (Task 3.1).

### Step 2 — Create licenses **offline** (you, not client)

1. **Air-gap** `license.lic` — HWID + expiry + features + max cams/BWC  
2. **Platform** `platform-license.json` — existing vendor LicenseIssuer path (BWC/user caps)  

Private key **never** goes in the zip.

### Step 3 — Build pack

From ME8 (example — adjust paths/names):

```powershell
cd "C:\Users\user\Desktop\Enterprise Mobility\ME8"

.\BUILD-ME8-CUSTOMER.ps1 `
  -OutRoot "C:\ME8-Ship-Staging\Acme" `
  -CustomerName "Acme Security Ltd" `
  -LanIp "192.168.1.38" `
  -LicensePath "…\issued\acme-platform-license.json"
```

Also place **`storage\license.lic`** into the staged pack (air-gap file for that HWID).  
Set customer env **`FM_AIRGAP_LICENSE_REQUIRED=1`** for real ships.

Optional: `-VideoConference` if that client bought VC.

### Step 4 — Pre-ship gate (pack time only)

Enforce `ME8-INTERNAL\ship-desk\PRE-SHIP-GATE-CHECKLIST.md`:

- Bundled Node 22+  
- multer / deps present  
- Zip **root** has Install + Start bats + README (+ APK if VC)  
- Signed license(s), **no** private key  
- Desk smoke: Start → login works (or you say skip)  
- `FM_TOTP_SUSPENDED` **off** for real customer ship  

### Step 5 — Zip and register

- Zip the **complete** folder only (never half-pack)  
- Log row in ship registry (ship desk)  
- Hand to client: Install → Start — they do **not** invent licenses

---

## “Different UI later” — how we control without chaos

| Client wants… | Control knob | When |
|---------------|--------------|------|
| Fewer modules | License `features` + later UI grey (3.3) | Re-issue `.lic` |
| Hard caps | License max fields + server enforce (3.2) | Re-issue `.lic` |
| Different look / logo | Brand / tenant settings (Axiom stays unless you order rename) | Settings or named MOB |
| Extra product (VC) | Pack SKU flag | Rebuild that client’s zip |
| Totally different screens | **Not** “flip a pack switch” — needs named MOB / product work | Discuss first |

**Rule:** Do not maintain ten secret UI forks. One Axiom product; **licenses and config** differentiate clients.

---

## Lab vs customer pack

| | Lab (your ME8 folder) | Customer pack |
|--|----------------------|---------------|
| Purpose | Build & test | Deliver |
| `license.lic` | Optional | Required when `FM_AIRGAP_LICENSE_REQUIRED=1` |
| Daily work | MOB-APPLY one by one | Freeze a known-good tree, then build |
| Client sees `storage\` | N/A | Yes, folder exists; they must not hand-edit license |

---

## Task 3.1 PASS note (2026-07-25)

Operator confirmed automated verify OK (`verify:airgap-license`).  
**Next licensing APPLY:** Task **3.2** (server enforces entitlements) — only when you say Execute / MOB-APPLY 3.2.  
**UI grey-out:** Task **3.3** — after 3.2.

---

## Operator checklist (memorize)

1. Finish features → PASS in lab  
2. Say **ship / pack**  
3. Get **server HWID**  
4. Issue **licenses offline**  
5. **BUILD-ME8-CUSTOMER** + bake `license.lic`  
6. Pre-ship gate → zip → send  
7. Later changes = new license and/or new pack version — not client editing UI code  

---

## What this disc does **not** do

- Does not start Task 3.2/3.3 by itself  
- Does not change brand from Axiom  
- Does not put private keys in customer media  
