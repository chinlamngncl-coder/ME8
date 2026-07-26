# MOB DISC — Licensing: how to test, what is done, how ship works

**Date:** 2026-07-25  
**Audience:** Operator (plain English) + ship desk  
**Status:** LOCKED MEMORY for Phase 3 licensing story  
**Related:** `MOB-APPLIED-AIRGAP-LICENSE-LIC-ED25519-V1-20260725.md` (Task 3.1)  
**Roadmap:** Phase 3 Tasks 3.1–3.4 in `MOB-DISC-ARCHITECT-MASTER-ROADMAP-20260725.md`

---

## Short answer (read this first)

| Question | Answer |
|----------|--------|
| Are **all** licensing modules done? | **No.** Only **Task 3.1** is built (make `.lic` + check at boot). **3.2 / 3.3 / 3.4** are still paused. |
| Do we create the license **before** packing? | **Yes.** For a real customer ship you create a signed `license.lic` for **that PC’s hardware ID**, put it in the pack, then zip. |
| Do unlicensed features grey out in the UI **today**? | **Not yet.** Grey-out is **Task 3.3**. Today a bad/missing license (when required) **stops the whole server** — it does not half-run with grey buttons. |
| How do I test now without a customer? | Use the **lab smoke** below (print HWID → sign a test `.lic` → restart OK / break it → must die). |

---

## What exists today (two layers — do not mix them up)

ME8 has **two** license ideas. Both matter for ship later; Task 3.1 added the air-gap one.

### A) Air-gap `license.lic` — Task 3.1 (NEW)

| Piece | Status |
|-------|--------|
| Offline generator `tools/generate-license.js` | **Done** |
| Validator `lib/licenseManager.js` (signature + HWID + expiry) | **Done** |
| Boot refuse (`LICENSE EXPIRED OR INVALID`) | **Done** |
| Enforce camera/BWC **counts** from the file | **Not yet** (Task **3.2**) |
| Turn features on/off in API from `features{}` | **Not yet** (Task **3.2**) |
| Grey-out buttons in the UI | **Not yet** (Task **3.3**) |
| Login “valid From/Until” + kick sessions | **Not yet** (Task **3.4**) |

**What it locks today:** “Can this **machine** run Fleet at all?”  
(hardware match + not expired + signature real)

### B) Older `storage/platform-license.json` — already in ME8

| Piece | Status |
|-------|--------|
| Vendor-signed BWC/user caps (`maxBwcDevices`, etc.) | **Already existed** |
| Used by ship desk / `LICENSE-OPERATIONS.md` | **Yes** |
| Same file as `license.lic`? | **No** — different file |

For customer packs you may still bake **platform-license.json** (old path). Task 3.1’s **`license.lic`** is the new hardware-locked air-gap gate. Later tasks will unify “what the UI shows” against entitlements — that is not finished.

**Lab default:** no `license.lic` required (unless you set `FM_AIRGAP_LICENSE_REQUIRED=1`).

---

## How it will work when shipping (target story)

Plain sequence for a **customer pack**:

```
1. Install / run once on TARGET PC (or get HWID from that PC)
       ↓
2. On YOUR offline machine: generate signed license.lic for that HWID
       ↓
3. Copy license.lic into the pack (storage/license.lic)
       ↓
4. Set ship env: FM_AIRGAP_LICENSE_REQUIRED=1
       ↓
5. BUILD / zip customer pack
       ↓
6. Customer starts → server checks license BEFORE Web/SIP/Video
       ↓
   OK  → app runs; later 3.2/3.3 limit counts + grey features
   BAD → prints LICENSE EXPIRED OR INVALID → nothing starts
```

### Who creates the license?

- **You (Ubitron / ship desk)** on an offline PC with the **private key**.  
- Customer **never** gets the private key.  
- Customer only gets the signed `license.lic` + the public key already in the build.

### What about “features we did not license”?

**After Task 3.3 (not built yet):**

- License says e.g. `tacticalOverwatch: false` → Overwatch button **grey / hidden**.  
- License says `maxFixedCameras: 8` → cannot add a 9th (Task **3.2** enforces on server).

**Today (only 3.1):**

- There is **no** grey-out yet.  
- If the `.lic` is missing/wrong/expired (when required), the **whole product refuses to start** — safer than half-open UI.

So: you do **not** “grey out before packing” as a manual step. You **encode** allowed features and limits **inside the signed license** when you create it; the software (after 3.2/3.3) reads that and greys/blocks. Packing just **includes** the right file.

---

## How to test Task 3.1 now (lab — no customer needed)

### A) Automated (agent already ran)

```powershell
cd "C:\Users\user\Desktop\Enterprise Mobility\ME8"
npm run verify:airgap-license
```

Expect: `[ok] verify-airgap-license-v1`

### B) Operator smoke (you)

**1. Print this PC’s hardware ID**

```powershell
npm run license:print-hwid
```

Copy the 32-character hex line.

**2. One-time: make a test keypair (lab only — keep private key safe)**

```powershell
node tools/generate-license.js --gen-keys --keys-dir .\keys
```

(`keys/` is gitignored — do not commit the private key.)

**3. Sign a license for THIS PC**

```powershell
node tools/generate-license.js `
  --private-key .\keys\license-private.pem `
  --customer "Lab Test" `
  --hardware-id PASTE_HWID_HERE `
  --expiry 2027-12-31 `
  --max-fixed-cams 8 `
  --max-bwc 8 `
  --feature tacticalOverwatch `
  --out .\storage\license.lic
```

**Important:** The public key the **server** uses must match this keypair.  
- Either copy `keys\license-public.pem` into the path the server already loads, **or**  
- For a quick lab test, set env `FM_LICENSE_PUBLIC_KEY` to the PEM contents (newlines as `\n` if needed).  
- Shipping builds use the embedded / exported public key from vendor tooling — private key stays offline.

**4. Restart Fleet**

- With matching HWID + future expiry → should start like normal.  
- Say **PASS** for 3.1 if start works.

**5. Break tests (must die with LICENSE EXPIRED OR INVALID)**

| Break | How |
|-------|-----|
| Wrong machine | Change one character in `hardwareId` inside the file (or resign for another id) |
| Expired | `--expiry 2020-01-01` and replace file |
| Tampered | Edit `customerName` in the JSON without resigning |

Restart → must **not** open Web/SIP/Video; console shows **LICENSE EXPIRED OR INVALID**.

**6. Lab without license again**

- Delete `storage\license.lic`  
- Leave `FM_AIRGAP_LICENSE_REQUIRED` **unset** or `0`  
- Restart → lab should run (optional license).

**Ship-mode test (optional):**

```text
FM_AIRGAP_LICENSE_REQUIRED=1
```

with **no** `license.lic` → must also refuse to start.

---

## Phase 3 checklist (what “done” means)

| Task | What you get | Done? |
|------|----------------|-------|
| **3.1** | Make `.lic` + boot check (sig / HWID / expiry) | **Built — awaiting your PASS** |
| **3.2** | Server enforces max cams / BWC / feature flags from `.lic` | **Not started** |
| **3.3** | UI greys out modules not in `features` | **Not started** |
| **3.4** | Sign-in window From/Until + kick sessions after expiry | **Not started** |

Do **not** expect grey-out or soft limits until **3.2 + 3.3** land and you PASS them.

---

## Ship packing reminder (when you say “ship / pack”)

1. Get **target PC HWID** (`--print-hwid` on that machine).  
2. Offline: create **`license.lic`** for that HWID + contract limits + features.  
3. Bake into pack as `storage/license.lic`.  
4. Set **`FM_AIRGAP_LICENSE_REQUIRED=1`** in customer env.  
5. Keep private key **off** the zip.  
6. Also follow existing pre-ship checklist (Node, multer, bats, etc.) — TOTP remind only at pack time.

Until 3.3 exists: packing does **not** include a separate “grey out” step — only include a correctly signed license. Grey-out comes when 3.3 is APPLIED and PASS.

---

## Operator decisions locked by this disc

1. **Create license first, then pack** — yes, for real customer hardware.  
2. **Grey-out** = future Task 3.3, driven by license `features`, not a manual pack checklist.  
3. **3.1 alone** = hard gate (start or die), not soft UI.  
4. Test 3.1 with lab HWID + break tests above; say **PASS** / **FAIL** before Task 3.2.

---

## Next APPLY (only after you PASS 3.1)

`MOB-APPLY` / Execute **Task 3.2** — enforce entitlements (`maxFixedCameras`, `maxBwcDevices`, `features`) on the backend.
