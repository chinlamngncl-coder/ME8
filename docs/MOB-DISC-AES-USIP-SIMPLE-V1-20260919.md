# MOB DISC — AES USIP Simple (Type A) — 2026-09-19

**Status:** paper lock only. No product code in this MOB.  
**APPLY:** `MOB-DISC AES-USIP-SIMPLE-V1`  
**Sources (private, not for customer packs):**
- Paid SDK `usip协议_V1.0` §6 AES256 / VideoTag MESSAGE  
- Paid SDK `AES加密格式说明.md` (file header decrypt)

**Not this MOB:** certificate / PKI AES (Type B), AES keys in git, `lib/sipServer.js` / `lib/pttServer.js` edits, live video FLV crypto.

---

## Operator meaning (plain English)

BWC has an **AES on** button. When AES is on, media from the cam is encrypted. Axiom must unlock it so Evidence / play works.

There are **two industry styles**. We only finish the **simple** one first.

| Type | How keys work | Who | Order |
|------|----------------|-----|--------|
| **A — Simple AES (this disc)** | Vendor fixed wrap rules + file format in the paid SDK | Cam AES button + Axiom decrypt | **Now** |
| **B — Certificate AES** | Software installs a cert; pack/keys come from that | Vendor + later MOB | **After A PASS** |

Operator already updated firmware and has the AES button. Type B is optional later — ask vendor only after A works.

---

## Type A = two steps (same feature)

### A1 — SIP VideoTag (key notice)

- SIP **MESSAGE**, `Content-Type: Application/MANSCDP+xml`
- Body: `<Notify><CmdType>VideoTag</CmdType>…<DeviceTag>…</DeviceTag></Notify>`
- `DeviceTag`: 32-char **base64url** = wrapped key (AES-256-CBC / PKCS7 per SDK §6.1)
- Wrap key / IV strings: **only** in private SDK doc + lab secret config — **never** in UI, manuals, or ship packs

Example GB IDs / IPs in the SDK are **examples only** — not our lab numbers.

### A2 — Encrypted media file (`*-AES.*`)

- Name: keep extension; insert `-AES` before it (`foo.mp4` → `foo-AES.mp4`). Same for jpg / wav.
- Layout: fixed **53-byte** header + ciphertext (see `AES加密格式说明.md`)
- Body crypto: **AES/CTR/NoPadding** (file key + data IV from header)
- Master key that unwraps the header: private doc only — not in product source or public discs
- Magic at header start: ASCII hex `48 44 41 31` (`HDA1`), version `1`

Axiom today: **no** VideoTag ingest, **no** `-AES` file decrypt for BWC USIP media. (Court ZIP AES elsewhere is a different product path — do not mix.)

---

## Locked decisions

1. Complete **Type A** (A1 then A2) before any Type B / cert work.  
2. Do **not** invent a second crypto stack or MQTT key channel.  
3. Do **not** put master / wrap keys in `en.json`, HTML, ship README, or git-tracked samples. Lab: env or `storage` secret file (named on code APPLY).  
4. Do **not** touch `lib/sipServer.js` / `lib/pttServer.js` unless a later APPLY names those files. Prefer Fleet / Evidence / small `lib/usipAes*.js` style modules.  
5. Type B = vendor conversation + separate MOB after A PASS.  
6. GPS / DevStatus / FaceUpload stay out of AES MOBs.

---

## PASS when code MOBs are done (not this paper)

| Check | PASS |
|--------|------|
| AES on BWC | Cam produces `*-AES.*` and/or VideoTag MESSAGE |
| A1 | Axiom receives VideoTag; unwraps DeviceTag without crash |
| A2 | Operator can open / play decrypted media in Evidence (or agreed surface) |
| AES off | Normal (non-AES) media still works |

---

## Next APPLY (one at a time)

1. **`AES-USIP-VIDEOTAG-V1`** — ingest VideoTag MESSAGE; unwrap DeviceTag (A1).  
2. **`AES-USIP-FILE-DECRYPT-V1`** — decrypt `*-AES.*` for Evidence / play (A2).  
3. Type B cert — only after 1+2 operator PASS.

---

## Not in this MOB

Code, decrypt helpers, UI toggles, vendor cert ask letter, packing AES into ship.  
