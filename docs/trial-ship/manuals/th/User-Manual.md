# Mobility Axiom — คู่มือผู้ใช้ (คู่มือผู้ปฏิบัติการ)

**สำหรับ:** ผู้จัดจ่าย หัวหน้างาน เจ้าหน้าที่หลักฐาน ห้องควบคุม  
**เอกสารที่เกี่ยวข้อง:** **Quick Guide**(ติดตั้ง) · **Configuration Manual**(เซิร์ฟเวอร์/BWC) · **README.txt**

คู่มือนี้อธิบาย **ทุกแท็บ ปุ่มหลัก และขั้นตอนการทำงาน** บนแดชบอร์ด ป้าย UI ตรงกับภาษาที่เลือก

---

## สารบัญ

1. [ระบบทำอะไร](#1-ระบบทำอะไร)
2. [เข้าสู่ระบบ ภาษา ออกจากระบบ](#2-เข้าสู่ระบบ-ภาษา-ออกจากระบบ)
3. [แถบหัวจอ](#3-แถบหัวจอ)
4. [แท็บ Operations](#4-แท็บ-operations)
5. [Device Summary](#5-device-summary)
6. [SOS](#6-sos)
7. [PTT groups และ Messages](#7-ptt-groups-และ-messages)
8. [แผนที่](#8-แผนที่)
9. [Geofencing](#9-geofencing)
10. [Video wall](#10-video-wall)
11. [Evidence & Docking](#11-evidence--docking)
12. [Command Wall](#12-command-wall)
13. [Centre Summary](#13-centre-summary)
14. [Video Conference](#14-video-conference)
15. [Settings และ Audit Trail](#15-settings-และ-audit-trail)
16. [บทบาทผู้ใช้](#16-บทบาทผู้ใช้)
17. [ตัวอย่าง workflow](#17-ตัวอย่าง-workflow)
18. [แก้ปัญหา](#18-แก้ปัญหา)

---

## 1. ระบบทำอะไร

| ความสามารถ | ตำแหน่งใน UI | การใช้งาน |
|------------|--------------|-----------|
| แผนที่ GPS สด | Operations → แผนที่ | ตำแหน่งเจ้าหน้าที่ SOS สถานะบันทึก |
| วิดีโอ BWC สด | แผง pin วิดีโอวอลล์ Command Wall | หลายสตรีม (Operations 6 จอ) |
| เสียง/PTT | ตาราง fleet pin กลุ่ม PTT | พูดคุย 1:1 หรือกลุ่ม |
| SOS | แบนเนอร์ SOS log แผนที่ | แจ้งเตือน รายงาน ส่งออกโฟลเดอร์ |
| ข้อความถึง BWC | Operations → Messages | ส่งข้อความเมื่อออนไลน์ |
| หลักฐาน | แท็บ Evidence | ค้นหาไฟล์จาก dock บันทึกเซิร์ฟเวอร์ |
| ประชุมวิดีโอ | Video Conference | ห้อง โทรศัพท์ PC แชร์ BWC |
| ผู้ดูแล | Settings → Server Config | เครือข่าย รายการ BWC |

---

## 2. เข้าสู่ระบบ ภาษา ออกจากระบบ

### 2.1 เข้าครั้งแรก

1. เปิดเบราว์เซอร์ (Chrome/Edge)
2. ไปที่ `http://<server-ip>:3888` (ทดลอง: `http://localhost:3888`)
3. ใส่ **Username** / **Password** (ทดลอง: `global` / `global123`)
4. คลิก **Sign in**

### 2.2 เปลี่ยนภาษา

หน้า login หรือ **Language** มุมขวาบน — APAC: อังกฤษ เกาหลี ไทย อินโดนีเซีย ฟิลิปปินส์

### 2.3 เปลี่ยนรหัสผ่าน (super admin)

**Settings** → **Server Config** → **Dashboard Auth** → แก้รหัส → **Save**

### 2.4 ออกจากระบบ

**Settings** → **Sign out** — ใช้ PC ร่วมต้องออกเสมอ

---

## 3. แถบหัวจอ

| ปุ่ม | หน้าที่ |
|------|---------|
| 🔊 Voice mute | ปิด/เปิดเสียง SOS |
| Repeat | เล่นเสียงแจ้งเตือนซ้ำ |
| Language | เปลี่ยนภาษา UI |
| SOS banner | แถบแดงเมื่อมี SOS |

---

## 4. แท็บ Operations

| ส่วน | เนื้อหา |
|------|---------|
| แถบซ้าย | Device Summary SOS log PTT Messages Storage |
| กลาง | แผนที่ + toolbar |
| ขวา | วิดีโอ 6 ช่อง |

**◀** ซ่อน/แสดงแถบซ้าย | **Auto-rotate** **Popout Matrix** **Config**

---

## 5. Device Summary

| คอลัมน์ | การกระทำ |
|--------|----------|
| Pin | เปิด pin แผนที่ + วิดีโอ |
| PTT | **กดค้าง** พูด 1:1 |
| Call | โทรเสียง |
| GPS | ดูเส้นทาง |

**Open All (Up to 6)** · **Clear map pins**

ขั้นตอน: ตรวจ **Online** → **Pin** → **PTT**

---

## 6. SOS

แบนเนอร์แดง → ตั้ง **radius** (200–1000 m) ดูหน่วยใกล้เคียงบนแผนที่ → **Acknowledge** (ติ๊กหน่วยใกล้เคียงเป็นค่าเริ่มต้น) หรือ **PTT team** → รอ toast **PTT team ON** → **กดค้าง PTT** ที่ wall/pin ของเจ้าหน้าที่แจ้งเหตุเพื่อพูดกับ**ทั้งทีม** → **SOS log** · **Open incident files** · PIN **Unlock**

---

## 7. PTT groups และ Messages

เลือกกลุ่มแผนที่หรือติ๊ก 2+ ออนไลน์ → **Join group PTT** · Messages: คลิกชื่อ → **Send**

---

## 8. แผนที่

ลากซูม · pin สีตามกลุ่ม · แผงลอย: วิดีโอ **PTT** · toolbar: **Wall Map** Snapshot บันทึก SD/เซิร์ฟเวอร์ geofencing

---

## 9. Geofencing

ใส่รัศมี(เมตร) → **Set geofencing** → วางบนแผนที่ → **Save geofence** · **Clear geofencing** ลบ

---

## 10. Video wall

6 ช่อง · **Auto-rotate** · **Config**(กำหนด BWC/กลุ่ม/CSV) · **Stop** ต่อช่อง

---

## 11. Evidence & Docking

แท็บย่อย: Overview · Docking Stations · Evidence Library · Case Files · Route & GPS · Storage

Library: **Refresh** ค้นหา **Detail** **Download** · Case: **New case file** **Create from SOS** · Storage(admin): **Save storage** **Scan FTP**

---

## 12. Command Wall

ลากจาก Roster → panel · เลย์เอาต์ 1/4/9/16/32 · **Rotate** · **Spotlight** · **Clear wall** · Display room: 4 จอ SOS Room

---

## 13. Centre Summary

KPI SOS กราฟ ที่เก็บข้อมูล สุขภาพระบบ AI → **Ask** · **Refresh**

---

## 14. Video Conference

ต้องมี Docker · **Join Room** · Gallery/Speaker/Focus · **Share screen** · BWC **Add to Room** · APK MobilityConference-1.5.6.apk

---

## 15. Settings และ Audit Trail

**Server Config** การ์ด lifecycle **Audit Trail** กรองวันที่ → **Apply** → **Export CSV** · **Sign out**

---

## 16. บทบาทผู้ใช้

Super admin แก้ Server Config ได้ · Operator อ่านอย่างเดียว · Custom ตั้งที่ Dashboard Auth

---

## 17. ตัวอย่าง workflow

เริ่มกะ: Start Mobility.bat → Operations ตรวจออนไลน์ · เหตุการณ์: Pin+PTT · SOS: แบนเนอร์→ตั้ง radius→Ack(ติ๊กหน่วยใกล้)หรือ PTT team→กดค้าง PTT ทีม→log · TV: Command Wall 16 Rotate 30วินาที

---

## 18. แก้ปัญหา

| อาการ | แก้ |
|-------|-----|
| Offline ทั้งหมด | Configuration Manual เครือข่าย |
| ไม่มีวิดีโอ | ไฟร์วอลล์ 3889 Pin |
| PTT เงียบ | กดค้าง |
| VC ล้มเหลว | Docker + Install-Mobility.bat |

---

## แผนที่เอกสาร

| ต้องการ | อ่าน |
|---------|------|
| ติดตั้ง | **Quick Guide** |
| เซิร์ฟเวอร์/BWC | **Configuration Manual** |
| ใช้งานประจำวัน | **คู่มือนี้** |
