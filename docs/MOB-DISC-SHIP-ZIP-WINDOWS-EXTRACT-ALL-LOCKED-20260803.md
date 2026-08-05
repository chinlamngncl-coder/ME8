# MOB DISC — LOCKED: Customer ship zips MUST Windows Extract All

**Date:** 2026-08-03  
**Status:** **LOCKED** — take note for every future pack  
**Operator anger (fair):** CN/AirGapped zip used a stupid path layout (`./…` prefixes). Partner Windows **Extract All** → only 2 manuals. Lab then pointed at `_extract_test_expand` / 7-Zip workarounds instead of fixing the pack. **Unacceptable for shipping.**

**Related:** `MOB-DISC-AXIOM-PACK-ZIP-TWO-DOCS-2GB-20260803.md`, `MOB-DISC-AXIOM-PARTNER-EXTRACT-SETUP-JIANGSU-20260803.md`, `MOB-DISC-SHIP-PACK-GATHER-REMINDER-20260725.md`

---

## Locked rule (one line)

**Every customer / partner / trial ship zip MUST fully extract with Windows Explorer right-click → Extract All on a clean PC.**  
If it does not → **the pack is FAIL. Do not ship. Do not tell the partner to install 7-Zip as the default path.**

---

## What is forbidden from now on

| Forbidden | Why |
|-----------|-----|
| Zip entries named `./folder/file` (dot-slash prefix) | Windows Extract All drops / skips them → partner sees almost nothing |
| “Just use 7-Zip” as the **normal** customer instruction | Partner is not your lab; shipping UX = Windows |
| Shipping a half `_extract_test_*` folder or re-zip of a partial extract | Incomplete / missing GIS / confusing |
| Any packer that “works on my machine” only under 7-Zip / WSL `unzip` | Not a ship pack |
| Inventing exotic zip tools for customer packs without **explicit operator yes** | You already burned trust once |

---

## Required for ALL packs (PH / KR / CN / trial / air-gap / hotfix)

1. **Build** stage folder with normal Windows paths (`ship-build\…`, `public\…`) — no `./`.  
2. **Zip** with a Windows-safe method (e.g. `Compress-Archive` on **folder contents**, or .NET `ZipFile` with entry names **without** `./`).  
3. **Prove before handoff (desk smoke):**
   - Copy zip to a **new empty folder** on Windows  
   - **Extract All** (Explorer)  
   - Confirm root has Setup / Start bats + `ship-build` / `public` (and GIS if CN offline was promised)  
   - If Extract All ≠ full tree → **delete zip, fix packer, rebuild**  
4. Optional: also test 7-Zip — **never instead of** Extract All.

---

## When is non–Extract-All allowed?

**Almost never for customer ship.**

Only if **you (operator) explicitly order** a special format for a named reason, e.g.:

- Internal lab tarball for Linux servers only (labeled **NOT for Windows partner**)  
- Split volume / encrypted container you personally approve  

Even then: AI must state in plain English **why** Windows Extract All is waived, and the artifact name must say so (e.g. `…_LINUX_TAR_NOT_WIN_EXTRACT`).  
**Default remains: Windows Extract All.**

“Air-gap / big Docker images / Jiangsu map” is **not** a reason to break Extract All. Size is fine; **path layout** was the bug.

---

## Agent duty (take note — every pack session)

When building or advising **any** ship/pack:

1. Assume partner has **only** Windows Explorer Extract All.  
2. After zip: run or describe the Extract All proof — do not skip.  
3. Never recommend 7-Zip as the primary customer step unless Extract All already PASSed and 7-Zip is optional.  
4. Never leave `_extract_test_*` as something that could be mistaken for the release.  
5. Next fix MOB remains: **`PACK-AXIOM-ZIP-OPEN-PROOF-V1`** (strip `./`, gate, prove Extract All) — code only after `MOB-APPLY`.

---

## Pack gather add-on (print when ship/pack)

Add this line to the mental pack checklist:

```
ZIP SMOKE: Windows Extract All on clean folder → full tree (Setup + app). 
If only manuals / empty → FAIL — do not send. No 7-Zip-only customer packs.
```

---

## Why the CN zip broke (so we never repeat)

- Fat zip ~2.85 GB **did** contain the product (~17k entries).  
- **17 380** entries used `./…` prefixes; **2** manuals did not.  
- Explorer Extract All → **only those 2 files**.  
- Root cause = **packer path style**, not “partner can’t unzip.”

**Fix the packer. Do not train the partner to use a different tool.**

---

## Operator next

- This disc is **LOCKED** — no APPLY needed to remember the rule.  
- To repair the bad CN zip: say **`MOB-APPLY PACK-AXIOM-ZIP-OPEN-PROOF-V1`**.  
- Until then: do not ship that broken zip again; if partner must open the old one once, 7-Zip is emergency only — then rebuild.
