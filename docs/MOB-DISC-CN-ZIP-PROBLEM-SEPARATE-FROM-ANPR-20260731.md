# MOB DISC — China enterprise zip problem (separate from ANPR Live)

**Date:** 2026-07-31  
**Status:** DISC — paper only (**no code in this disc**)  
**Audience:** Operator  
**Hard wall:** This disc is **only** the China partner deploy zip. It has **nothing** to do with ANPR Live tiles/rails. Agents must **not** mix the two.

**Related honesty:** `MOB-DISC-CN-ENTERPRISE-ZIP-83MB-HONESTY-20260731.md`  
**Scaffold pack:** `MOB-APPLIED-CN-AXIOM-ENTERPRISE-PACK-20260731.md`  
**Trial license:** `MOB-APPLIED-CN-TRIAL-WILDCARD-LICENSE-PACK-20260731.md`

---

## Plain English

You asked for a **China partner package**. What left the desk was a **scaffold zip** (~83 MB), not a sealed “Dockers + Node + AI + full maps on USB” appliance.

That is a **packaging problem**. It is **not** fixed by touching ANPR Live CSS.  
ANPR Live APPLY must **never** rewrite `PACK-CN-*`, `dist/Mobility_Axiom_Deploy*`, or trial license files “while we’re here.”

---

## What the current China zip actually is

| In the zip | Meaning |
|------------|---------|
| `Axiom_Enterprise_Setup.bat` / `axiom_setup.sh` | One-click **script** |
| `ship-build/protected/run.js` + `public/` | Axiom UI/runtime **blob** |
| `docker/**` compose YAML | **Recipes only** (~0.3 MB) — **not** images |
| `vendor/ffmpeg-lgpl/ffmpeg.exe` | Big binary (~109 MB unzipped) |
| `data/gis/offline` | ~34 MB starter tiles — **not** full CN basemap |
| `storage/license.lic` | **365-day trial wildcard** (20 BWC / 10 IPC) |
| **Missing** | Docker **images**, bundled **Node 22**, full **`node_modules`**, **ANPR/FR sidecars**, full offline China map, desk smoke PASS |

**83 MB is expected for that thin scope.** It is **wrong** to call it a complete enterprise appliance.

---

## China zip problems (lock the list)

1. **No Docker images in the zip** — partner `compose up` must **pull** (needs network or preloaded images). Air-gap China fails.  
2. **No Node bundled** — Setup assumes `node` on PATH.  
3. **No staged `node_modules`** — protected runtime still needs deps story.  
4. **No ANPR/FR engines in the zip** — license may unlock modules the USB does not ship.  
5. **Thin GIS** — offline map may look empty/weak.  
6. **Trial wildcard** — OK for partner tryout; **must** replace with host-locked `.lic` before long-term production.  
7. **No clean-machine smoke claimed** — zip built ≠ partner PASS.  
8. **Agent confusion** — mixing ANPR Live layout chats with China pack chats wastes the operator. **Stop.**

---

## What must NOT happen

- Do **not** change China zip / packer / license when doing **ANPR Live** MOBs.  
- Do **not** change ANPR Live when doing **China pack** MOBs.  
- Do **not** tell the partner “full ship ready” until a named fat-pack / smoke MOB PASSes.  
- Do **not** zip the live lab `.env` / secrets / private key.

---

## Single next path for China (when you order APPLY)

One MOB at a time — **pick when ready:**

| APPLY (proposed) | Job |
|------------------|-----|
| `CN-PARTNER-SMOKE-DESK-V1` | Clean PC/VM: unzip → Setup → login → zh map → one live — PASS/FAIL **before** USB leaves |
| `CN-PARTNER-FAT-PACK-V1` | Real ship contents: Node story + deps + optional `docker save` / offline image load + explicit ANPR/FR include-or-exclude |

**Recommendation:** smoke first (know what breaks), then fat-pack.  
**Call today’s artifact:** “CN scaffold + 365d trial license” — not “complete China enterprise.”

---

## Lock

- China zip = **packaging genre**. ANPR Live = **Analytics Live UI genre**.  
- This disc does **not** authorize code.  
- No APPLY name in this message is auto-run — operator must type **`MOB-APPLY &lt;exact name&gt;`** for China work separately from ANPR.
