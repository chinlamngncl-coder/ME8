# MOB DISC — Serial dock key + ship OEM hygiene (death penalty) (2026-08-09)

**Status:** Locked. Supersedes customer-facing wording in `MOB-DISC-BWC-IDENTITY-SHIP-HINT-SERIAL-VS-GB-20260809.md` for **any ship / UI / manual / pack path**.  
**Serial plan:** **Go** (design approved). Code still waits for exact `MOB-APPLY BWC-SERIAL-ASSET-REGISTRY-V1` (or renamed APPLY below).  
**Brand / OEM:** **Death-penalty rule** for customer surfaces and packs.

---

## 1. Serial path (approved)

| Customer sees | Meaning |
|---------------|---------|
| **Serial / asset tag** (sticker on camera) | Dock folder + Evidence key + Fleet field |
| **Device ID** (if shown at all) | Internal network id — **never** labeled with banned protocol names |
| **Ubitron** | Manufacturer / company face |
| **ONVIF, SIP, other international standards** | Allowed as technical labels when the UI/manual needs them |

Officers and IT set **serial** in Mobility Axiom. FTP folders use serial. Software maps serial → the camera’s registered device id under the hood.

We do **not** tell customers to “change GB …” or teach any Chinese vendor stack.

---

## 2. Death-penalty ban (ship + product face)

**Forbidden** on anything a customer can open, download, unzip, or read after pack:

| Class | Examples (not exhaustive) |
|-------|---------------------------|
| Protocol brand words | Any **GB** / GB28181-style product naming in UI, manuals, README, folder names, zip names, evidence labels |
| Chinese OEM / BWC vendor names | Any third-party Chinese bodycam brand (past lab slang included) |
| Lab / agent / tool leakage | Cursor, Google Colab, Claude, “ME8 lab”, WSL tips, internal MOB codes as customer docs, personal PC paths |
| Fake manufacturers | Anything that is not **Ubitron** (or allowed **ONVIF** as a standard) |

**Allowed:** Mobility **Axiom**, **Ubitron**, international standards as labels when needed (**ONVIF**, **SIP**, and similar open/industry standards), plain English “device id”, “serial”.

**Lab tree (developer PC):** Internal discs / `.cursor` / engineer notes may still discuss protocol truth for wiring — **must never be zipped into customer pack**. Pack = death-penalty surface.

If found in a customer pack or customer UI: treat as **ship FAIL** — rebuild pack; do not send.

---

## 3. Pack hygiene (why lab junk ships)

| Cause | Lock |
|-------|------|
| Whole-repo zip / copy `docs/` blindly | Pack **allowlist** only (ship desk / Packaging Robot paths) |
| Untracked lab folders next to product | Exclude agent transcripts, Colab guides, weapon finetune dumps, `MOB-DISC-*` engineer discs unless explicitly customer manuals |
| UI strings / i18n with lab words | Grep gate before zip: banned tokens |
| Evidence / FTP sample folders named with protocol slang | Customer storage defaults use serial / date only |

**At pack time** (when user says ship / pack / customer pack): agent must run a **banned-token scan** on the **pack folder only** before “ready to send.” Ordinary MOB sessions: no daily nag — only at pack.

---

## 4. UI / manual wording (serial APPLY)

When `BWC-SERIAL-ASSET-REGISTRY-V1` lands, strings must say:

- “Camera **serial** / asset tag”  
- “Map each camera sticker in Fleet”  
- “Dock uploads use the **serial** folder name”  

Must **not** say: GB…, Chinese OEM names, Colab, Cursor, “lab device id format”, etc.

First-use Evidence/FTP checklist (later APPLY): same vocabulary.

Config Manual IMPORTANT box: Ubitron cameras + serial map — no banned protocol chapter titles.

---

## 5. Internal vs ship (honest split)

| Layer | May know real wire protocol? | Customer-visible? |
|-------|------------------------------|-------------------|
| Server/SIP code, lab discs | Yes (engineers) | No |
| Axiom UI, manuals, README, zip | No banned OEM / lab-tool names | Yes — Ubitron + international standards (SIP, ONVIF, …) + serial |
| Customer FTP tree | Serial folders | Yes |

---

## 6. APPLY names (when you want code)

| APPLY | Does |
|-------|------|
| `BWC-SERIAL-ASSET-REGISTRY-V1` ✅ | Fleet `serialNo` field + unique; UI edit; **clean strings** |
| `DOCK-KEY-RESOLVE-SERIAL-V1` | Watch resolves serial → device id; no GB wording in logs shown to UI |
| `DOCK-IDENTITY-FIRST-SETUP-HINT-V1` | Super-admin checklist — serial language only |
| `SHIP-PACK-OEM-BAN-SCAN-V1` (pack genre) | Pre-zip grep for banned tokens on pack root |

---

## 7. Recommendation

1. **Serial is the go path** for dock identity.  
2. **Death penalty** for GB / Chinese OEM / lab-tool names on ship surfaces and packs.  
3. Manufacturer face = **Ubitron**. International standards (**SIP**, **ONVIF**, etc.) are fine as labels.  
4. Code for serial only after you type the APPLY name — this disc locks the rules so pack does not re-introduce junk.

**Next product code (Cases arc still open):** `MOB-APPLY OPS-CASE-SERVER-STORE-V1`  
**Or serial now:** `MOB-APPLY BWC-SERIAL-ASSET-REGISTRY-V1`
