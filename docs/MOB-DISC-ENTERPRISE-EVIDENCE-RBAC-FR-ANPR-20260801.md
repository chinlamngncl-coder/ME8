# MOB-DISC — Enterprise analytics evidence packaging + Super Admin RBAC (LOCKED 2026-08-01)

**APPLY batch (authorized):**
- `ANALYTICS-EVIDENCE-MKDIR-BOOT-V1`
- `ANALYTICS-DELETE-SUPERADMIN-RBAC-V1`
- `FR-SNAP-DOWNLOAD-EVIDENCE-BTN-V1`
- Stapled: Offline Match UI repair (video ≤38vh, blacklist 180px, Recent Plates 2-col)

## Architecture (applies to trial / user / real on-prem)

| Rule | Lock |
|------|------|
| Evidence roots | Relative `{BASE_DIR}/storage/…` — **not** `/var/mobility_evidence` |
| ANPR crops | `storage/anpr-live-crops` (+ macros, plate-lists, anpr-temp) |
| FR faces | JPEG on disk under FR root (`storage/` or configured `frStorage.rootPath`) — **never** Base64 in Postgres |
| Boot | `lib/analyticsEvidenceDirs.js` + `frStorageWorkspace.ensureManagedLayout` on server start |
| Destructive | No packaging sabotage scripts; mkdir only (`exist_ok` / `recursive: true`) |
| License | External license generator **untouched**; trial baselines (e.g. 20 BWC / 10 cam) remain license-file driven |
| Delete / Clear / Discard | Super Admin (`requireSuperAdmin` / `canManageServer`) only; operators GET/view/download |
| FR Download Evidence | Snap modal button → authenticated crop URL → browser download |

## Inquiry answer (permanent)

FR module stores captured faces as **physical JPEG files** + JSON/JSONL metadata on disk. Base64 is transit-only. Not stuffed into Postgres.

## Key files

- `lib/analyticsEvidenceDirs.js`
- `server.js` (boot mkdir; FR disposition → `requireSuperAdmin`)
- `public/js/analytics-hub.js` (hide Remove for operators)
- `public/js/fr-kept-ui.js` (hide Clear/Discard for operators)
- `public/js/fr-alarm.js` (Download Evidence)
- `public/css/global.css` (Offline Match layout)
