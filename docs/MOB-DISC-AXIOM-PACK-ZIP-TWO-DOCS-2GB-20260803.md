# MOB DISC — Mobility Axiom zip looks like “2 documents / 2GB+”

**Date:** 2026-08-03  
**Status:** DISCUSSION ONLY — no code until `MOB-APPLY …`  
**Operator:** Opened a Mobility Axiom pack zip → appears to be **only 2 documents**, yet size is **~2 GB+**.

---

## Verdict (plain English) — UPDATED after operator extract proof

**You are right about what you see after Extract.**  
Folder `dist/Mobility_Axiom_AirGapped_CN/` = **exactly 2 × 6 KB manuals** (screenshot matches disk).

The zip file itself is still ~**2.85 GB** and contains ~**17 380** other paths — but **Windows Explorer “Extract All” effectively only materializes the 2 entries that do not use a `./` path prefix.**

| Fact (lab 2026-08-03) | Value |
|----------------------|-------|
| Zip | `Mobility_Axiom_AirGapped_CN.zip` ≈ 2.85 GB |
| Zip entries total | ≈ 17 382 |
| Entries with `./` prefix | **17 380** (Setup, `ship-build`, `offline_images`, …) |
| Entries **without** `./` | **exactly 2** = the two `.md` manuals |
| After Explorer extract | Those 2 manuals only (what you see) |

So: **2 GB is inside the zip**, but **broken zip path layout + Windows extract** → partner only gets two docs. Not “two manuals weigh 2 GB.”

---

## What we measured (lab facts, 2026-08-03)

### Fat CN zip — `dist/Mobility_Axiom_AirGapped_CN.zip`

- Size ≈ **2.85 GB**, entries ≈ **17 382** (full product tree is inside).
- Largest bulk:
  - `offline_images/livekit_egress_…tar` ≈ **1076 MB**
  - `offline_images/wvp-pro` / ZLM / ingress / postgres tars ≈ **rest of ~2.3 GB**
  - `@node-llama-cpp` CUDA DLLs ≈ **0.5+ GB**
  - Bundled `runtime/node` ≈ **200 MB**
- Root **documents** only: `Mobility_Axiom_User_Manual_CN.md` + Chinese brief manual (+ small README/setup files).

### Staging folders after the fact

- `dist/Mobility_Axiom_Deploy/` → **2 files only** (the two manuals).  
- `dist/Mobility_Axiom_AirGapped_CN/` → **same 2 manuals**.  

That matches “I opened it and only saw two documents” if the open target was the **folder**, not a re-extract of the zip.

### Earlier thin pack (audit)

- Prior `Mobility_Axiom_Deploy.zip` audit (~**83 MB**) was a **thin** scaffold (no `offline_images/`) — different animal from the 2.85 GB air-gapped zip.

---

## Why this happened (product packing story)

1. **Air-gap / CN partner brief** asked for offline Docker tars + runtime → packer (or a later fat build) stuffed **`offline_images/*.tar`** into the zip → multi‑GB.  
2. **Root still looks “document-ish”** — manuals + bats — so a quick glance in Explorer says “only docs.”  
3. **Stage folder was later replaced** with manuals only → easy to confuse “dist folder” with “the pack.”  
4. **Trial genre** historically bundled a **Centre LLM GGUF** (~2 GB) — another way to get a 2 GB zip that is mostly one blob.

This is a **packaging / layout / verify** failure for operator UX — not an ANPR or FLV bug.

---

## What a correct customer open should show

At zip **root** (after extract), at least:

- `Axiom_Enterprise_Setup.bat` / `axiom_setup.sh`  
- `README-DEPLOY.txt`  
- `ship-build/protected/` (or `run.js` path)  
- `public/`  
- `storage/` (license)  
- `docker/`  
- Optional fat: `offline_images/`, `runtime/`  

If you only see two `.md` files → **wrong folder or incomplete extract.**

---

## What we must not do

- Re-zip the live lab tree “as-is” (secrets, baselines, SOS logs, 3B GGUF by accident).  
- Tell the partner the 2.85 GB zip is “two manuals.”  
- Ship `license-private.pem`.  
- Nag ordinary sessions with full pre-ship gate — only when you say pack again.

---

## Risk pick (one next MOB)

| Option | Verdict |
|--------|---------|
| **A. Pack open-proof + stage hygiene** — after zip: print top-level inventory + size by folder; refuse to leave `dist/…` as manuals-only; optional split: `…_App.zip` + `…_OfflineImages.zip` | **RECOMMENDED** |
| B. Always omit `offline_images` | Only if partner has Docker Hub; breaks true air-gap |
| C. Keep 3B GGUF in every trial zip | **Reject** for normal ship — use smaller Centre model or separate “LLM add-on” zip |
| D. Blame Windows zip UI only | Incomplete — stage folder really was emptied to 2 docs |

### Recommended name: `PACK-AXIOM-ZIP-OPEN-PROOF-V1`

**Scope:**

1. **Root cause fix:** rebuild zip **without `./` entry prefixes** (use `ship-build/…` not `./ship-build/…`). Prove Explorer Extract All yields full tree.  
2. After pack: write `PACK-MANIFEST.txt` at zip root (folder sizes, file counts, “open these first”).  
3. Never leave `dist/Mobility_Axiom_*` as manuals-only without a separate `docs-only` name.  
4. Gate: zip must contain Setup bat + `ship-build/protected/run.js` **and** a post-extract smoke must find them — or **FAIL**.  
5. Optional: split `offline_images` to a second zip so app pack stays smaller.  
6. LLM: no multi‑GB `gguf` in default app zip unless you ask.

**PASS (you):**

1. Windows **Extract All** into a new empty folder.  
2. Root shows Setup + README + `ship-build` / `public` / `offline_images` — **not** only 2 manuals.  
3. Manifest lists sizes; total matches expectation.

---

## Operator next

1. Open **`ME8/dist/Mobility_Axiom_AirGapped_CN.zip`** with 7-Zip / WinRAR (not only the emptied `dist\…` folder).  
2. Confirm folders `offline_images`, `ship-build`, `public` exist.  
3. When you want the fix: say **`MOB-APPLY PACK-AXIOM-ZIP-OPEN-PROOF-V1`**.

Until then: **no code** — this disc only.
