# MOB DISC — Lab git push: analytics / FR / ANPR / Weapon (2026-08-06)

**Status:** operator ordered summary + **commit + push**.  
**Branch:** `backup/20260722-tested-genres`  
**Weapon video test:** tomorrow — not blocking this checkpoint.

---

## Where git was

| | Commit | When |
|--|--------|------|
| **Last on GitHub** | `14c5ae9` docs: mark lab-git-push C-F done | before 2 Aug |
| **Local HEAD (unpushed tip)** | `8fc222e` feat(analytics): UI 50-cap Clear UI + hierarchical audit storage | 2026-08-02 01:39 |
| **Unpushed already** | **9 commits** (ANPR UI + evidence/RBAC + offline match + 50-cap) | local only |
| **Uncommitted** | big working tree since `8fc222e` | 2–6 Aug |

Remote is **0 behind / 9 ahead** before this checkpoint commit.

---

## This checkpoint commit includes

- Global FLV chase / shared player / live factory / wall + CW + matrix cache
- FR chrome: KS / roster / watch-bar L2 / offline isolate / alarm
- ANPR live + offline + sidecar (FastALPR / HyperLPR / dwell / crop / history)
- Weapon shell + RF-DETR stills sidecar (gun/knife → Recent) — **video PASS tomorrow**
- DB migrations `007` / `008`
- Token-lean cursor rules
- MOB DISC / APPLIED paper since 2 Aug
- Manuals V1 (small)

## Excluded on purpose (do not push)

| Path | Why |
|------|-----|
| `master_license.json` | license asset / secret |
| `eng.traineddata` | 5 MB tessdata dump, not product source |
| `Axiom_Enterprise_Setup.bat`, `axiom_setup.sh` | CN one-click (parked) |
| `scripts/PACK-CN-AXIOM-ENTERPRISE.ps1`, `scripts/Set-DeployHostEnv.ps1` | CN pack (parked) |
| `baseline/**/.cursor/` | snapshot copies, not live rules |
| `fr-sidecar-seeta/vendor/seetaFace6Python` | gitlink dirty, not this genre |

---

## Still open after push (not in this commit as “done”)

1. **Weapon video PASS** tomorrow (`WEAPON-DETECT-STILLS-RECENT-V1`)
2. Then **`WEAPON-ALARM-NEARBY-V1`** (HQ WEAPON banner ≠ device SOS)
3. Parked earlier: `ANPR-OFFLINE-READ-HONOR-OCR-PATH-V1`, analytics public notice
4. CN pack / partner zip — still parked until you reopen

---

## After push

Genre checkpoint is on GitHub. Next product edit still needs **MOB-APPLY**. No more commit until the next genre PASS + you say push.
