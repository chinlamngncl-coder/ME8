# MOB DISC — BWC-SERIAL-ASSET-REGISTRY-V1 (2026-08-09)

**Status:** APPLIED.  
**Parent:** `MOB-DISC-SERIAL-OEM-BAN-SHIP-HYGIENE-20260809.md`

---

## What landed

- Fleet BWC row field **`serialNo`** (UI: **Serial** / “Serial / asset tag”)
- PostgreSQL `bwc_devices.serial_no` + unique index when set (migration `010_bwc_serial_no.sql`)
- CSV import/export column **Serial**
- Duplicate serial → save rejected (`Serial already used on another camera`)
- `bwcDevices.findBySerial` for next dock resolve APPLY
- Customer strings: serial / asset tag / dock folder — **no** banned OEM / protocol slang

Live **Device ID** unchanged (network identity). Serial does **not** rewrite camera SIP id.

---

## Not in this APPLY

| Later | Name |
|-------|------|
| Dock FTP folder → resolve serial → device id | `DOCK-KEY-RESOLVE-SERIAL-V1` |
| Super-admin first-setup checklist | `DOCK-IDENTITY-FIRST-SETUP-HINT-V1` |

---

## Operator check

1. Restart Fleet (so migration `010` runs)  
2. Server Setup → BWC list → set **Serial** from camera sticker → Save  
3. Two cameras cannot share the same serial  
