# Ubitron Mobility C2 — Gabay sa Pag-install

**Para sa:** IT installer, system administrator  
**Basahin kasama:** Quick-Guide.md · Configuration-Manual.md · User-Manual.md · Migration-Guide.md  
**Pack:** Mobility Test 2 (English, Filipino, Korean)

Inilalakad ng gabay na ito ang buong proseso mula sa na-unzip na folder hanggang gumaganang dashboard, Video Conference, at Face Analytics. Sundin ang bawat hakbang nang sunud-sunod. Kung may nabigo, basahin ang **Kung nabigo ang hakbang na ito** bago magpatuloy.

**May dating trial na** (port 3888, lumang folder, o Node crash)? Basahin muna ang **Migration-Guide.md**, pagkatapos bumalik dito kung kailangan ng malinis na install sa bagong PC.

---

## Talaan ng nilalaman

1. [Ano ang kailangan bago magsimula](#1-ano-ang-kailangan-bago-magsimula)
2. [I-unzip ang delivery folder](#2-i-unzip-ang-delivery-folder)
3. [I-install ang Docker Desktop](#3-i-install-ang-docker-desktop)
4. [Patakbuhin ang one-time installer](#4-patakbuhin-ang-one-time-installer)
5. [Simulan ang server at mag-sign in](#5-simulan-ang-server-at-mag-sign-in)
6. [I-install ang Python para sa Face Analytics](#6-i-install-ang-python-para-sa-face-analytics)
7. [I-configure ang server (pagkatapos ng unang login)](#7-i-configure-ang-server-pagkatapos-ng-unang-login)
8. [I-install ang Android Video Conference app](#8-i-install-ang-android-video-conference-app)
9. [I-verify ang installation](#9-i-verify-ang-installation)
10. [Pag-troubleshoot](#10-pag-troubleshoot)

---

## 1. Ano ang kailangan bago magsimula

| Item | Kailangan? | Tala |
|------|------------|------|
| Windows 10 o 11 (64-bit) | Oo | Administrator rights para sa Docker at firewall |
| Delivery pack na ito | Oo | Buong folder — huwag burahin ang `Ubitron-ME8\` |
| **Node.js** | **Hindi** | Kasama sa `Ubitron-ME8\tools\node\` |
| **Docker Desktop** | Oo | Kailangan para sa Video Conference (LiveKit) |
| **Python 3.11+** | Oo (Face Analytics) | I-install sa [Seksyon 6](#6-i-install-ang-python-para-sa-face-analytics) |
| Internet | Unang install lamang | Docker image; Python packages para sa Face Analytics |
| LAN network | Oo | Server PC at body-worn cameras sa parehong network |

**Lisensyang kasama sa pack na ito**

| Item | Limit |
|------|-------|
| Body-worn cameras | 5 |
| Dashboard users | 10 |
| Face Analytics sources | 5 |
| Video Conference | Naka-enable |
| Valid hanggang | 2036-07-12 |

Hindi kailangan maglagay ng license key — ang naka-sign na lisensya ay nasa `Ubitron-ME8\storage\platform-license.json`.

---

## 2. I-unzip ang delivery folder

1. Hanapin ang zip sa Desktop (hal. `Mobility-Test-2-YYYYMMDD-HHMM.zip`).
2. Right-click → **Extract All…**
3. Pumili ng permanenteng path, hal. `C:\Mobility-Test-2\`
4. Kumpirmahin ang mga sumusunod sa extracted folder:

| Path | Layunin |
|------|---------|
| `Install-Ubitron.bat` | One-time installer |
| `Start Ubitron.bat` | Simulan ang server araw-araw |
| `Ubitron-ME8\` | Application (huwag burahin) |
| `MobilityConference-1.5.6.apk` | Android Video Conference app |
| `manuals\en\` · `manuals\fil\` · `manuals\ko\` | Gabay sa tatlong wika |

**Kung nabigo ang hakbang na ito:** Siguraduhing kumpleto ang extract (disk space ≥ 8 GB). I-extract ulit sa maikling path na walang special characters (hal. `C:\Mobility-Test-2\`).

---

## 3. I-install ang Docker Desktop

Gumagamit ang Video Conference ng LiveKit sa loob ng Docker.

1. I-download ang Docker Desktop: https://www.docker.com/products/docker-desktop/
2. Patakbuhin ang installer — tanggapin ang default maliban kung may IT policy.
3. I-restart ang PC kung hiningi ng installer.
4. Simulan ang **Docker Desktop** mula sa Start menu.
5. Hintayin hanggang **matatag** ang whale icon sa system tray (hindi umaandar).

**Kung nabigo ang hakbang na ito**

| Sintomas | Susunod na gagawin |
|----------|-------------------|
| Hindi magsimula ang Docker | I-enable ang virtualization (BIOS/UEFI). Kumpirmahin sa IT ang Hyper-V o WSL2. |
| “Docker daemon not running” | Buksan manually ang Docker Desktop; maghintay 2 minuto; ulitin ang [Seksyon 4](#4-patakbuhin-ang-one-time-installer). |
| Na-block ng proxy ang download | Hilingin sa IT na payagan ang `docker.io` at `registry-1.docker.io`. |

---

## 4. Patakbuhin ang one-time installer

1. Buksan ang extracted folder (hal. `C:\Mobility-Test-2\`).
2. I-double-click ang **`Install-Ubitron.bat`**.
3. Gagawin ng script ang:
   - **Hakbang 1/4** — I-verify ang bundled Node.js at libraries
   - **Hakbang 2/4** — Gumawa ng `.env` gamit ang LAN IP ng PC
   - **Hakbang 3/4** — Simulan ang LiveKit sa Docker
   - **Hakbang 4/4** — Ihanda ang Face Analytics (kung naka-install na ang Python)

4. Basahin ang output. Kapag **Install complete**, pindutin ang anumang key para isara.

**Huwag** patakbuhin ang `npm install` — naka-bundle na ang dependencies.

**Kung nabigo ang hakbang na ito**

| Sintomas | Susunod na gagawin |
|----------|-------------------|
| “Docker Desktop is required” | Tapusin ang [Seksyon 3](#3-i-install-ang-docker-desktop); ulitin ang `Install-Ubitron.bat`. |
| “Bundled Node runtime missing” | I-extract ulit ang buong zip; huwag kopyahin nang pira-piraso. |
| Nabigo ang LiveKit | Docker Desktop → **Containers** — alisin ang stuck na `livekit` → ulitin ang installer. |
| Paalala lang tungkol sa Python | Magpatuloy sa [Seksyon 6](#6-i-install-ang-python-para-sa-face-analytics) pagkatapos ng unang login. |

---

## 5. Simulan ang server at mag-sign in

1. I-double-click ang **`Start Ubitron.bat`** sa root ng pack.
2. May bubukas na itim na console — **huwag isara**.
3. Awtomatikong bubuksan ang browser (hal. `http://192.168.1.10:3988/`).

**Huwag gumamit ng `172.17`–`172.31`** (WSL / Docker). Mamamatay ang camera at PTT. Gamitin ang totoong Wi‑Fi o Ethernet IPv4 (madalas `192.168.x.x`).
4. Mag-sign in:

| Field | Value |
|-------|-------|
| URL | `http://<server-ip>:3988` |
| Username | `global` |
| Password | `global123` |

5. Agad palitan ang password: **Settings → Server Config → My account → Update password**.

**Kung nabigo ang hakbang na ito**

| Sintomas | Susunod na gagawin |
|----------|-------------------|
| “Cannot connect” sa browser | Bukas pa ang server window? Maghintay 10 segundo; refresh. Subukan `http://127.0.0.1:3988` sa server PC. |
| “Run Install-Ubitron.bat once first” | Tapusin muna ang [Seksyon 4](#4-patakbuhin-ang-one-time-installer). |
| Tinanggihan ang login | Gamitin eksaktong `global` / `global123` sa unang install. |
| Port already in use | Isara ang ibang Mobility/Ubitron window. Patakbuhin ang `kill-fleet-ports.ps1`, pagkatapos `Start Ubitron.bat`. |

---

## 6. I-install ang Python para sa Face Analytics

Kailangan ang Python 3.11+ para sa Face Analytics. Isang beses lang i-install sa server PC.

1. I-download: https://www.python.org/downloads/
2. Patakbuhin ang installer.
3. Lagyan ng check ang **Add python.exe to PATH**.
4. **Install Now** — hintayin hanggang tapos.
5. Sa bagong Command Prompt: `py --version` — dapat Python 3.11+.
6. Ulitin ang **`Install-Ubitron.bat`** (hakbang 4/4 — maaaring 5–15 minuto).
7. O i-double-click ang **`START-FACE-MATCHING.bat`** at huwag isara habang gumagamit ng Face watch.

**Kung nabigo ang hakbang na ito**

| Sintomas | Susunod na gagawin |
|----------|-------------------|
| Hindi kilala ang `py` | Ulitin ang Python installer na may **Add to PATH**; i-reboot. |
| Error sa pip install | Kumpirmahin ang internet; ulitin ang installer; suriin ang antivirus. |
| Offline ang Face watch | Patakbuhin ang **START-FACE-MATCHING.bat**; hard-refresh (Ctrl+F5). |

---

## 7. I-configure ang server (pagkatapos ng unang login)

Tapusin **pagkatapos** makapag-sign in. Buong detalye sa **Configuration-Manual.md**.

### 7.1 Network

1. **Settings → Server Config → Network & deployment**
2. Itakda ang **BWC SIP server IP** sa IPv4 ng PC (hindi hostname). **Huwag** `172.17`–`172.31` (WSL/Docker).
3. **Save server settings**.

### 7.2 Irehistro ang body-worn cameras

1. **Settings → Server Config → BWCs**
2. **Add row** → **Device ID** (eksakto sa camera) at **Officer**.
3. **Save BWC list**.
4. Sa SIP screen ng camera, ilagay ang **Type on BWC** (IPv4 lamang).
5. Maghintay ~30 segundo — dapat **Online**.

### 7.3 FTP docking (opsyonal)

1. **Settings → Server Config → Evidence / FTP**
2. Itakda ang FTP username at password.
3. Parehong port (`2121`) at credentials sa bawat docking station.

**Kung offline pa ang BWC:** Parehong LAN; i-ping ang server IP; tumugma ang SIP password sa **Type on BWC**.

---

## 8. I-install ang Android Video Conference app

1. Kopyahin ang **`MobilityConference-1.5.6.apk`** sa Android device.
2. Payagan ang **Install unknown apps** kung hiningi.
3. I-install ang APK.
4. Buksan ang **Mobility Conference**.
5. Server URL = dashboard URL (hal. `http://192.168.1.10:3988`).
6. Mag-sign in → buksan ang room → **Join with camera**.

**Kung walang video:** Tumatakbo ba ang Docker? Parehong LAN? Payagan ang ports 7880 at 7881 sa firewall (tingnan ang Configuration-Manual §10).

---

## 9. I-verify ang installation

| Check | Inaasahang resulta |
|-------|-------------------|
| Dashboard | `http://<server-ip>:3988` — map o login |
| Super admin login | Gumagana ang `global` (o bagong password) |
| Docker | May tumatakbong LiveKit containers |
| BWC online | Kahit isang camera **Online** pagkatapos ng SIP |
| Video Conference | Nakakonekta ang Android app na may video |
| Face Analytics | Bukas ang **START-FACE-MATCHING.bat**; healthy ang Face watch |

Kapag pumasa ang lahat, ibigay ang **User-Manual.md** sa mga operator.

---

## 10. Pag-troubleshoot

| Problema | Malamang na sanhi | Susunod na hakbang |
|----------|-------------------|-------------------|
| Hindi maabot ang dashboard | Sarado ang server o na-block ang port | `Start Ubitron.bat`; firewall port 3988 |
| Nabigo ang Video Conference | Huminto ang Docker | Simulan ang Docker; ulitin ang installer hakbang 2 |
| License error | Nawala o na-edit ang `platform-license.json` | I-restore ang orihinal na pack; kontakin ang vendor |
| Hindi handa ang face match | Walang Python o huminto ang sidecar | [Seksyon 6](#6-i-install-ang-python-para-sa-face-analytics); START-FACE-MATCHING.bat |
| Nabigo ang FTP | Mali ang port o password | Port 2121; tumugma sa Settings → FTP |
| EADDRINUSE | May lumang server pa | `Ubitron-ME8\kill-fleet-ports.ps1` bilang Administrator |

Para sa firewall at ports, tingnan ang **Configuration-Manual.md**. Para sa araw-araw na operasyon, **User-Manual.md**.

---

*Ubitron Mobility C2 — Mobility Test 2 delivery pack. Suporta: kontakin ang inyong vendor.*
