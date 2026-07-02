# Mobility Axiom — Panduan Pengguna (Panduan Operator)

**Untuk:** Dispatcher, supervisor, staf bukti, ruang kendali.  
**Dokumen terkait:** **Quick Guide**(instal) · **Panduan Konfigurasi**(server/BWC) · **README.txt**

Panduan ini menjelaskan **setiap tab**, **tombol utama**, dan **alur kerja langkah demi langkah**. Label UI sesuai bahasa yang dipilih.

---

## Daftar isi

1. [Fungsi sistem](#1-fungsi-sistem)
2. [Masuk, bahasa, keluar](#2-masuk-bahasa-keluar)
3. [Bilah header](#3-bilah-header)
4. [Tab Operations](#4-tab-operations)
5. [Device Summary](#5-device-summary)
6. [SOS](#6-sos)
7. [PTT groups & Messages](#7-ptt-groups--messages)
8. [Peta](#8-peta)
9. [Geofencing](#9-geofencing)
10. [Video wall](#10-video-wall)
11. [Evidence & Docking](#11-evidence--docking)
12. [Command Wall](#12-command-wall)
13. [Centre Summary](#13-centre-summary)
14. [Video Conference](#14-video-conference)
15. [Settings & Audit Trail](#15-settings--audit-trail)
16. [Peran pengguna](#16-peran-pengguna)
17. [Contoh alur kerja](#17-contoh-alur-kerja)
18. [Pemecahan masalah](#18-pemecahan-masalah)

---

## 1. Fungsi sistem

| Kemampuan | Di UI | Yang bisa dilakukan |
|-----------|-------|---------------------|
| Peta GPS langsung | Operations → peta | Lokasi petugas, SOS, status rekam |
| Video BWC langsung | Panel pin, video wall, Command Wall | Banyak stream (6 di Operations) |
| Suara/PTT | Tabel armada, pin, grup PTT | Push-to-talk 1:1 atau grup |
| SOS | Banner, log SOS, peta | Alarm, laporan, ekspor folder |
| Teks ke BWC | Operations → Messages | Kirim teks saat online |
| Perpustakaan bukti | Tab Evidence | Cari unggahan dock, rekam server |
| Konferensi video | Video Conference | Ruang, ponsel, PC, share BWC |
| Admin | Settings → Server Config | Jaringan, daftar BWC |

---

## 2. Masuk, bahasa, keluar

### 2.1 Login pertama

1. Buka browser (Chrome/Edge).
2. `http://<ip-server>:3888` (uji coba: `http://localhost:3888`).
3. **Username** / **Password** (`global` / `global123`).
4. Klik **Sign in**.

### 2.2 Ganti bahasa

Dropdown **Language** di login atau header — APAC: EN, KO, TH, ID, FIL.

### 2.3 Ganti kata sandi (super admin)

**Settings** → **Server Config** → **Dashboard Auth** → kata sandi baru → **Save**.

### 2.4 Keluar

**Settings** → **Sign out** — wajib di PC bersama.

---

## 3. Bilah header

| Kontrol | Fungsi |
|---------|--------|
| 🔊 Voice mute | Bisukan suara SOS |
| Repeat | Ulangi peringatan suara |
| Language | Ganti bahasa UI |
| SOS banner | Strip merah saat SOS aktif |

---

## 4. Tab Operations

| Area | Isi |
|------|-----|
| Sidebar kiri | Device Summary, SOS log, PTT, Messages, Storage |
| Tengah | Peta + toolbar |
| Kanan | 6 panel video |

**◀** sembunyikan sidebar · **Auto-rotate** · **Popout Matrix** · **Config**

---

## 5. Device Summary

| Kolom | Tindakan |
|-------|----------|
| Pin | Toggle pin peta + video mengambang |
| PTT | **Tahan** bicara 1:1 |
| Call | Panggilan suara |
| GPS | Lacak rute |

**Open All (Up to 6)** · **Clear map pins** — Online → **Pin** → **PTT**

---

## 6. SOS

Banner merah → atur **radius** (200–1000 m) untuk unit terdekat di peta → **Acknowledge** (unit terdekat **tercentang** default) atau **PTT team** → tunggu toast **PTT team ON** → **tahan PTT** di wall/pin petugas alarm untuk bicara ke **seluruh tim** → baris **SOS log** · **Open incident files** · PIN **Unlock**

---

## 7. PTT groups & Messages

Pilih grup peta atau centang 2+ online → **Join group PTT** · Messages: klik nama → **Send**

---

## 8. Peta

Geser/zoom · pin berwarna · panel: video **PTT** · toolbar: **Wall Map** Snapshot rekam SD/server geofencing

---

## 9. Geofencing

Radius (meter) → **Set geofencing** → tempatkan → **Save geofence** · **Clear geofencing**

---

## 10. Video wall

6 panel · **Auto-rotate** · **Config** (BWC/grup/CSV) · **Stop**

---

## 11. Evidence & Docking

Sub-tab: Overview · Docking Stations · Evidence Library · Case Files · Route & GPS · Storage

Library: **Refresh** cari **Detail** unduh · Case: **New case file** **Create from SOS** · Storage: **Save storage** **Scan FTP**

---

## 12. Command Wall

Seret Roster → panel · layout 1/4/9/16/32 · **Rotate** · **Spotlight** · **Clear wall**

---

## 13. Centre Summary

KPI, grafik SOS, penyimpanan, AI → **Ask** · **Refresh**

---

## 14. Video Conference

Docker wajib · **Join Room** · Gallery/Speaker · **Share screen** · BWC **Add to Room** · APK

---

## 15. Settings & Audit Trail

**Server Config**, kartu lifecycle, **Audit Trail** filter → **Apply** → **Export CSV**, **Sign out**

---

## 16. Peran pengguna

Super admin edit penuh · Operator Server Config baca saja · Custom di Dashboard Auth

---

## 17. Contoh alur kerja

Mulai shift: Start Mobility.bat → cek online · Insiden: Pin+PTT · SOS: banner→radius→Ack(centang terdekat) atau PTT team→tahan PTT tim→log · TV: Command Wall 16 Rotate 30dtk

---

## 18. Pemecahan masalah

| Gejala | Perbaikan |
|--------|-----------|
| Semua Offline | Panduan Konfigurasi jaringan |
| Tanpa video | Firewall 3889, Pin |
| PTT diam | Tahan tombol |
| VC gagal | Docker + Install-Mobility.bat |

---

## Peta dokumen

| Butuh | Baca |
|-------|------|
| Instal | **Quick Guide** |
| Server/BWC | **Panduan Konfigurasi** |
| Operasi harian | **Panduan ini** |
