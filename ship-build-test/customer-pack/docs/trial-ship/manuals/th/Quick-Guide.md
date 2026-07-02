# Mobility Axiom — คู่มือเริ่มต้นอย่างรวดเร็ว

## สิ่งที่ต้องมีบน PC นี้

| รายการ | จำเป็น? | หมายเหตุ |
|--------|---------|----------|
| Windows 10/11 (64-bit) | ใช่ | สิทธิ์ผู้ดูแลระบบสำหรับ Docker |
| **Node.js** | **ไม่** | **รวมอยู่ในแพ็ก** (`Mobility-Axiom\tools\node\`) |
| **Docker Desktop** | ใช่ (VC) | [ดาวน์โหลด](https://www.docker.com/products/docker-desktop/) |
| อินเทอร์เน็ต | ติดตั้งครั้งแรก | ดึง Docker image สำหรับ Video Conference |

## ติดตั้ง (ครั้งเดียว)

1. **แตกไฟล์** โฟลเดอร์ทั้งหมด (เช่น `C:\Mobility-Trial\`).
2. ติดตั้ง **Docker Desktop** จากลิงก์ด้านบน เปิด Docker — รอจนไอคอนวาฬคงที่.
3. ดับเบิลคลิก **`Install-Mobility.bat`** (โฟลเดอร์รากของแพ็ก).
4. ทุกครั้งที่ใช้งาน ดับเบิลคลิก **`Start Mobility.bat**`.

**อย่า** รัน `npm install` — ไลบรารีถูกสร้างไว้ในแพ็กแล้ว.

## เข้าสู่ระบบครั้งแรก
| Field | Value |
|-------|-------|
| URL | http://<server-ip>:3888 |
| ชื่อผู้ใช้ | global |
| รหัสผ่าน | global123 |

## BWC ออนไลน์ (สรุป)
1. **Settings → Server Config → Network** — set server IPv4 → **Save server settings**.
2. **Settings → Server Config → BWCs** — add Device ID + officer name → **Save BWC list**.
3. On each BWC SIP screen — enter values from **Type on BWC** (IPv4 only).
4. Wait ~30s — device shows **Online** in fleet list.

## Video Conference (โทรศัพท์)
1. Install **MobilityConference-1.5.6.apk** on Android.
2. Server URL = same as dashboard (http://<server-ip>:3888).
3. Sign in → open room → Join with camera.

## ใบอนุญาตทดลอง
5 BWC · 10 dashboard users · 1 year.

Full steps: **Configuration Manual** in this folder.
