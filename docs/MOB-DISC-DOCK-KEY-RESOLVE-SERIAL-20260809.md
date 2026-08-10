# MOB DISC — DOCK-KEY-RESOLVE-SERIAL-V1 (2026-08-09)

**Status:** APPLIED.  
**Needs:** `BWC-SERIAL-ASSET-REGISTRY-V1` (Fleet Serial field).

---

## What landed

Dock FTP auto-ingest:

1. Reads folder/file key from path (serial sticker folder **or** legacy long numeric id).  
2. Maps key via Fleet: **serial → Device ID**; if key is already Device ID, keep it.  
3. Evidence + SOS matchback use resolved **Device ID**.  
4. Logs use `folderKey` + `deviceId` — no OEM / banned protocol labels in the watch wording.

Unmapped serial folder still admits with the raw folder string as key until Fleet serial is set.

---

## Code

- `lib/dockFtpIngestWatch.js` — `parseFolderKeyFromRel`, `resolveDeviceKey` hook  
- `server.js` — resolve via `bwcDevices.findBySerial` / `findById`

---

## Operator check

1. Restart Fleet  
2. Set camera **Serial** in BWC list (e.g. `UB8-0042`)  
3. Dock drop under folder `UB8-0042/…`  
4. Evidence row device = that camera’s Device ID (not only the folder name)

---

## Next

`DOCK-IDENTITY-FIRST-SETUP-HINT-V1` — Super-admin once checklist (serial language only).
