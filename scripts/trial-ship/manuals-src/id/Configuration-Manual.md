# Mobility Axiom — Panduan Konfigurasi

**Untuk:** IT, super admin, instalator.  
**Baca bersama:** **Quick Guide** · **Panduan Pengguna**

Menjelaskan pengaturan server, pendaftaran BWC, operator, penyimpanan, firewall, dan video conference langkah demi langkah.

---

## Daftar isi

1. [Sebelum mulai](#1-sebelum-mulai)
2. [Buka Server Config](#2-buka-server-config)
3. [Network & deployment](#3-network--deployment)
4. [Daftarkan BWC](#4-daftarkan-bwc)
5. [Map groups](#5-map-groups)
6. [Dashboard Auth](#6-dashboard-auth)
7. [Penyimpanan bukti](#7-penyimpanan-bukti)
8. [Video Conference](#8-video-conference)
9. [Centre Summary AI](#9-centre-summary-ai)
10. [Firewall & port](#10-firewall--port)
11. [Lisensi uji coba](#11-lisensi-uji-coba)
12. [Kata sandi & audit](#12-kata-sandi--audit)
13. [Daftar periksa](#13-daftar-periksa)

---

## 1. Sebelum mulai

| Item | Persyaratan |
|------|-------------|
| PC server | Windows 10/11 64-bit, IP LAN statis disarankan |
| Paket | Ekstrak; jalankan `Install-Mobility.bat` sekali |
| Docker Desktop | Terpasang & berjalan (untuk VC) |
| BWC | Menyala, jaringan OK, layar SIP dapat diakses |
| Jaringan | Server & BWC di LAN yang sama; **hanya IPv4** di keypad kamera |

Jangan pasang Node.js terpisah — sudah ada di `Mobility-Axiom\tools\node\`.

---

## 2. Buka Server Config

1. Masuk sebagai **super admin** (uji coba: `global`).
2. Tab **Settings** → **Server Config**.
3. Navigasi kiri: **Network & deployment** | **BWCs** | **Map groups** | **Dashboard Auth**.

Akun **Operator** hanya baca.

---

## 3. Network & deployment

### 3.1 Deployment

Pilih **LAN server** → **Save server settings**.

### 3.2 LAN network (penting)

1. **BWC SIP server IP** = **IPv4** PC (mis. `192.168.1.10`) — bukan hostname.
2. Catat port HTTP `3888` dan video WS `3889`.
3. **Save server settings**.

### 3.3 BWC camera register

Atur Platform ID, Realm, Password → salin **Type on BWC** ke layar SIP setiap kamera.

---

## 4. Daftarkan BWC

**Tab:** **BWCs**

1. **Add row** → **Device ID** (sama dengan kamera) → **Officer** → **Map group** (opsional).
2. **Save BWC list**.

**Layar SIP kamera:**

| Field | Isi |
|-------|-----|
| SIP server | IPv4 server |
| Port | 5060 |
| Platform ID / Realm / Password | Sama dengan Server Config |
| Device ID | Sama dengan baris BWC |

Tunggu ~30 detik → **Operations** → **Online**.

Paket uji coba: `FM_SEED_BWC_ID=` kosong — tidak ada perangkat demo.

---

## 5. Map groups

Buat grup dengan nama dan warna → assign di tab BWCs → untuk warna pin, video wall, PTT.

---

## 6. Dashboard Auth

**Operator:** izinkan Operations/Evidence/Command Wall/VC — jangan izinkan edit Server Config → **Save** pada baris.

**Super admin:** tambah baris → **Save**.

---

## 7. Penyimpanan bukti

Folder FTP, live capture, indeks bukti → **Save storage** → **Scan FTP for evidence**.

NAS: mount di Windows dulu.

Opsional: **Auto-record server video on SOS alarm**.

---

## 8. Video Conference

1. Docker Desktop.
2. `Install-Mobility.bat` — layanan konferensi video.
3. **Video Conference → Settings** — URL WebSocket untuk ponsel (mis. `ws://192.168.1.10:7880`).

Distribusikan `MobilityConference-1.5.6.apk`.

---

## 9. Centre Summary AI

- Asisten disertakan dalam installer (~1 GB). Tidak ada unduhan di lokasi. **Ask** pertama 1–2 menit. Hanya super admin.

---

## 10. Firewall & port

| Port | Layanan |
|------|---------|
| 3888 | Dashboard HTTP |
| 3889 | Live video WebSocket |
| 5060 | SIP |
| 7880 | บริการประชุมทางวิดีโอ |
| 40130+ UDP | RTP |

---

## 11. Lisensi uji coba

5 BWC · 10 pengguna dashboard · 1 tahun (sesuai file lisensi).

---

## 12. Kata sandi & audit

**Dashboard Auth** → kata sandi baru → **Save**. **Audit Trail** → filter → **Export CSV**.

---

## 13. Daftar periksa

| Langkah | OK? |
|---------|-----|
| Install-Mobility.bat tanpa error | ☐ |
| Docker berjalan | ☐ |
| `http://localhost:3888` terbuka | ☐ |
| LAN IP = IPv4 PC | ☐ |
| BWC tersimpan | ☐ |
| SIP kamera cocok | ☐ |
| Online dalam 60 detik | ☐ |
| Pin ada video live | ☐ |
| PTT terdengar | ☐ |
| Scan FTP OK | ☐ |
| VC Join Room OK | ☐ |
| Uji Operator read-only | ☐ |

Gagal → Panduan Pengguna §18 dan `VIEW-LOG.bat`.
