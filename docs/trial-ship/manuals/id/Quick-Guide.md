# Mobility Axiom — Panduan Singkat

## Yang dibutuhkan di PC ini

| Item | Wajib? | Catatan |
|------|--------|---------|
| Windows 10/11 (64-bit) | Ya | Hak admin untuk Docker |
| **Node.js** | **Tidak** | **Sudah termasuk** (`Mobility-Axiom\tools\node\`) |
| **Docker Desktop** | Ya (VC) | [Unduh](https://www.docker.com/products/docker-desktop/) |
| Internet | Instal pertama | Unduh image Docker untuk Video Conference |

## Instal (sekali)

1. **Ekstrak** folder pengiriman penuh (mis. `C:\Mobility-Trial\`).
2. Instal **Docker Desktop** dari tautan di atas. Jalankan Docker — tunggu ikon paus stabil.
3. Klik dua kali **`Install-Mobility.bat`** (folder akar paket).
4. Setiap kali pakai, klik dua kali **`Start Mobility.bat**`.

**Jangan** jalankan `npm install` — dependensi sudah ada di paket.

## Login pertama
| Field | Value |
|-------|-------|
| URL | http://<server-ip>:3888 |
| Nama pengguna | global |
| Kata sandi | global123 |

## BWC online (ringkas)
1. **Settings → Server Config → Network** — set server IPv4 → **Save server settings**.
2. **Settings → Server Config → BWCs** — add Device ID + officer name → **Save BWC list**.
3. On each BWC SIP screen — enter values from **Type on BWC** (IPv4 only).
4. Wait ~30s — device shows **Online** in fleet list.

## Video Conference (ponsel)
1. Install **MobilityConference-1.5.6.apk** on Android.
2. Server URL = same as dashboard (http://<server-ip>:3888).
3. Sign in → open room → Join with camera.

## Lisensi uji coba
5 BWC · 10 dashboard users · 1 year.

Full steps: **Configuration Manual** in this folder.
