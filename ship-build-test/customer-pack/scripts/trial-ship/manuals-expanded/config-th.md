# Mobility Axiom — คู่มือการตั้งค่า

**สำหรับ:** IT ผู้ดูแลระบบ ติดตั้ง  
**อ่านคู่กับ:** **Quick Guide** · **คู่มือผู้ใช้**

อธิบายการตั้งค่าเซิร์ฟเวอร์ ลงทะเบียน BWC ผู้ใช้ ที่เก็บข้อมูล ไฟร์วอลล์ และ VC ทีละขั้นตอน

---

## สารบัญ

1. [ก่อนเริ่ม](#1-ก่อนเริ่ม)
2. [เปิด Server Config](#2-เปิด-server-config)
3. [Network & deployment](#3-network--deployment)
4. [ลงทะเบียน BWC](#4-ลงทะเบียน-bwc)
5. [Map groups](#5-map-groups)
6. [Dashboard Auth](#6-dashboard-auth)
7. [ที่เก็บหลักฐาน](#7-ที่เก็บหลักฐาน)
8. [Video Conference](#8-video-conference)
9. [Centre Summary AI](#9-centre-summary-ai)
10. [ไฟร์วอลล์และพอร์ต](#10-ไฟร์วอลล์และพอร์ต)
11. [ใบอนุญาตทดลอง](#11-ใบอนุญาตทดลอง)
12. [รหัสผ่านและ audit](#12-รหัสผ่านและ-audit)
13. [รายการตรวจสอบ](#13-รายการตรวจสอบ)

---

## 1. ก่อนเริ่ม

| รายการ | ต้องมี |
|--------|--------|
| PC เซิร์ฟเวอร์ | Windows 10/11 64-bit แนะนำ IP คงที่ |
| แพ็ก | แตกไฟล์ รัน `Install-Mobility.bat` ครั้งเดียว |
| Docker Desktop | ติดตั้งและรัน (สำหรับ VC) |
| BWC | เปิดเครื่อง เครือข่าย SIP เข้าถึงได้ |
| เครือข่าย | LAN เดียวกัน ปุ่มกดกล้องใช้ **IPv4 เท่านั้น** |

ไม่ต้องติดตั้ง Node แยก — มีใน `Mobility-Axiom\tools\node\`

---

## 2. เปิด Server Config

1. เข้า **super admin** (ทดลอง: `global`)
2. แท็บ **Settings** → **Server Config**
3. เมนูซ้าย: **Network & deployment** | **BWCs** | **Map groups** | **Dashboard Auth**

บัญชี **Operator** **อ่านอย่างเดียว**

---

## 3. Network & deployment

### 3.1 Deployment

เลือก **LAN server** → **Save server settings**

### 3.2 LAN network (สำคัญ)

1. **BWC SIP server IP** = **IPv4** ของ PC (เช่น `192.168.1.10`) — ไม่ใช่ชื่อโฮสต์
2. จดพอร์ต HTTP `3888` และวิดีโอ WS `3889`
3. **Save server settings**

### 3.3 BWC camera register

ตั้ง Platform ID, Realm, Password → คัดลอก **Type on BWC** ไปหน้าจอ SIP แต่ละกล้อง

---

## 4. ลงทะเบียน BWC

**แท็บ:** **BWCs**

1. **Add row** → **Device ID** (ตรงกับกล้อง) → **Officer** → **Map group** (ถ้ามี)
2. **Save BWC list**

**หน้าจอ SIP กล้อง:**

| ช่อง | ค่า |
|------|-----|
| SIP server | IPv4 เซิร์ฟเวอร์ |
| Port | 5060 |
| Platform ID / Realm / Password | ตรง Server Config |
| Device ID | ตรงแถวใน BWC list |

รอ ~30 วินาที → **Operations** → **Online**

แพ็กทดลอง: `FM_SEED_BWC_ID=` ว่าง — ไม่มีอุปกรณ์สาธิต

---

## 5. Map groups

สร้างกลุ่มชื่อและสี → กำหนดในแท็บ BWCs → ใช้สีหมุด วิดีโอวอลล์ PTT

---

## 6. Dashboard Auth

**Operator:** อนุญาต Operations/Evidence/Command Wall/VC — ห้ามแก้ Server Config → **Save** ที่แถว

**Super admin:** เพิ่มแถว → **Save**

---

## 7. ที่เก็บหลักฐาน

โฟลเดอร์ FTP บันทึกสด ดัชนีหลักฐาน → **Save storage** → **Scan FTP for evidence**

NAS: ต่อกับ Windows ก่อน

ทางเลือก: **Auto-record server video on SOS alarm**

---

## 8. Video Conference

1. Docker Desktop
2. `Install-Mobility.bat` — LiveKit
3. **Video Conference → Settings** — WebSocket สำหรับมือถือ (เช่น `ws://192.168.1.10:7880`)

แจก `MobilityConference-1.5.6.apk`

---

## 9. Centre Summary AI

โมเดลใน `Mobility-Axiom\vendor\llm\` (~2 GB) ไม่ดาวน์โหลดที่ไซต์ ครั้งแรก **Ask** โหลด 1–2 นาที

---

## 10. ไฟร์วอลล์และพอร์ต

| พอร์ต | บริการ |
|-------|--------|
| 3888 | Dashboard HTTP |
| 3889 | Live video WebSocket |
| 5060 | SIP |
| 7880 | LiveKit |
| 40130+ UDP | RTP |

---

## 11. ใบอนุญาตทดลอง

5 BWC · 10 ผู้ใช้แดชบอร์ด · 1 ปี (ตามไฟล์ใบอนุญาต)

---

## 12. รหัสผ่านและ audit

**Dashboard Auth** → รหัสใหม่ → **Save** · **Audit Trail** → กรอง → **Export CSV**

---

## 13. รายการตรวจสอบ

| ขั้นตอน | ผ่าน |
|---------|------|
| Install-Mobility.bat ไม่มี error | ☐ |
| Docker ทำงาน | ☐ |
| `http://localhost:3888` เปิดได้ | ☐ |
| LAN IP = IPv4 ของ PC | ☐ |
| BWC บันทึกแล้ว | ☐ |
| SIP กล้องตรงกัน | ☐ |
| Online ภายใน 60 วินาที | ☐ |
| หมุดมีวิดีโอสด | ☐ |
| PTT ได้ยินเสียง | ☐ |
| สแกน FTP OK | ☐ |
| VC Join Room OK | ☐ |
| ทดสอบ Operator อ่านอย่างเดียว | ☐ |

ล้มเหลว → คู่มือผู้ใช้ §18 และ `VIEW-LOG.bat`
