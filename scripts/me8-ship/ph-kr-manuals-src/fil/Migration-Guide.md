# Ubitron Mobility C2 — Gabay sa Paglipat (Lumang Trial → Mobility Test 2)

**Para sa:** IT installer sa site na may dating trial pack  
**Basahin kasama:** Installation-Guide.md (pagkatapos ng migration) · Quick-Guide.md · Configuration-Manual.md  
**Pack:** Mobility Test 2 — port **3988** · bundled **Node 22**

Para sa mga site na may nakaraang trial (madalas port **3888**, lumang Node, o hindi kumpletong pack). Sundin ang bawat hakbang nang sunud-sunod.

Kung **bagong PC** at walang dating Mobility, huwag gamitin ang dokumentong ito — gamitin ang **Installation-Guide.md** lamang.

---

## Talaan ng nilalaman

1. [Ano ang panatilihin at ano ang papalitan](#1-ano-ang-panatilihin-at-ano-ang-papalitan)
2. [Itigil nang tuluyan ang lumang trial](#2-itigil-nang-tuluyan-ang-lumang-trial)
3. [I-retire ang lumang application folder](#3-i-retire-ang-lumang-application-folder)
4. [I-install ang Mobility Test 2 sa bagong folder](#4-i-install-ang-mobility-test-2-sa-bagong-folder)
5. [Opsyonal — panatilihin ang dating data](#5-opsyonal--panatilihin-ang-dating-data)
6. [Unang login sa bagong pack](#6-unang-login-sa-bagong-pack)
7. [Ayusin ang network IP at mga BWC](#7-ayusin-ang-network-ip-at-mga-bwc)
8. [Ayusin ang Video Conference (telepono)](#8-ayusin-ang-video-conference-telepono)
9. [I-verify ang migration](#9-i-verify-ang-migration)
10. [Kung may nabigo](#10-kung-may-nabigo)

---

## 1. Ano ang panatilihin at ano ang papalitan

| Item | Aksyon | Dahilan |
|------|--------|---------|
| **Docker Desktop** | **Panatilihin** — huwag i-uninstall | Kailangan pa rin ng Video Conference |
| **Windows Node.js** (mula sa nodejs.org) | **Iwan** — huwag i-uninstall | Gumagamit ang bagong pack ng sariling Node sa loob ng folder |
| **Lumang Mobility / Trial folder** | **Itigil at i-rename o burahin** | Maaaring Node 20 at mag-crash (`node:sqlite`) |
| **Lumang Android VC app** | **I-install ang bagong APK sa ibabaw** | Hindi kailangang i-wipe ang telepono |
| **LAN IP sa Settings** | **Itakda ulit pagkatapos mag-login** | Port **3988**; kumpirmahin ang IPv4 |
| **FTP / SIP passwords** | Itakda ulit sa Settings kung na-wipe ang storage | Walang secret sa pack |

**Hindi kailangan i-uninstall ang Docker o ang Node sa Windows.**

---

## 2. Itigil nang tuluyan ang lumang trial

1. Isara ang lahat ng itim na console (Mobility, Fleet, Axiom, Ubitron).
2. Kung may Windows service: `net stop UbitronC2` (kung umiiral).
3. Subukan ang lumang URL `http://localhost:3888` — dapat hindi na gumagana ang dating server.
4. Kung hindi maisara: PowerShell bilang Administrator sa lumang folder →  
   `powershell -ExecutionPolicy Bypass -File .\kill-fleet-ports.ps1`

**Kung nabigo:** I-restart ang PC isang beses, pagkatapos magpatuloy sa Hakbang 3.

---

## 3. I-retire ang lumang application folder

1. Hanapin ang lumang folder (hal. `Mobility-Axiom`, `Trial June Mobility`, `Mobility-Trial`).
2. **I-rename** bilang `Mobility-OLD-2026` (mas ligtas kaysa burahin agad).
3. Huwag nang patakbuhin ang `Install-Mobility.bat` / `Start Mobility.bat` mula rito.

**Kung nabigo:** May prosesong gumagamit pa ng folder — bumalik sa Hakbang 2.

---

## 4. I-install ang Mobility Test 2 sa bagong folder

1. Kunin ang zip: `Mobility-Test-2-YYYYMMDD-HHMM.zip`.
2. I-extract sa **bagong** path, hal. `C:\Mobility-Test-2\` — huwag sa ibabaw ng lumang folder.
3. Kumpirmahin: `Install-Ubitron.bat`, `Start Ubitron.bat`, `MobilityConference-1.5.6.apk`, `Ubitron-ME8\`, `manuals\`.
4. Tumatakbo ang Docker Desktop (matatag ang whale icon).
5. I-double-click ang **`Install-Ubitron.bat`** isang beses.
6. I-double-click ang **`Start Ubitron.bat`**. Huwag isara ang server window.

**URL:** `http://<server-ip>:3988` (hindi 3888).

**Kung nabigo:** Tingnan ang Installation-Guide.md Seksyon 4.

---

## 5. Opsyonal — panatilihin ang dating data

Gamitin **lamang** kung gumagana na ang dating BWC at users.

1. Itigil ang bagong server. Kopyahin ang lumang `storage\` papunta sa  
   `C:\Mobility-Test-2\Ubitron-ME8\storage\`.
2. Panatilihin ang **`platform-license.json`** mula sa **bagong** Mobility Test 2 pack.
3. Simulan ulit ang **`Start Ubitron.bat`**.

Kung hindi matatag ang lumang trial, **laktawan** ang seksyong ito — malinis na install at i-rehistro ulit ang mga camera.

---

## 6. Unang login sa bagong pack

1. Browser: `http://127.0.0.1:3988` o `http://<LAN-IP>:3988`.
2. `global` / `global123` (o dating password kung na-restore ang storage).
3. Palitan agad ang password: **Settings → Server Config → My account → Update password**, o ang forced change-password page pagkatapos ng unang login.
4. **Paalala sa password:** Unang install ay `global123`. Kapag napalitan na, **hindi na gagana ang `global123`** — gamitin ang bagong password. Sa change-password page, mag-type ng hindi bababa sa 12 character na may upper, lower, numero, at simbolo (hal. `Ab12cd34!@#$`). Huwag mag-paste; huwag umasa sa naka-save na browser password.

**Kung nabigo:** Bukas ba ang server window? Port **3988** ba? Ctrl+F5.

---

## 7. Ayusin ang network IP at mga BWC

1. **Settings → Server Config → Network & deployment**
2. **BWC SIP server IP** = IPv4 ng PC (hindi hostname). **Huwag** `172.17`–`172.31` (WSL/Docker).
3. HTTP port **3988** → **Save server settings**.
4. **BWCs** — Device ID + Officer → **Save BWC list**.
5. Sa SIP screen ng camera — **Type on BWC** (IPv4 lamang).
6. Maghintay ~30 segundo — dapat **Online**.

**Kung offline pa:** Parehong LAN; i-update ang SIP screen (maaaring nakaturo pa sa lumang IP/port).

---

## 8. Ayusin ang Video Conference (telepono)

1. I-install ang **`MobilityConference-1.5.6.apk`** (overwrite).
2. Server URL: `http://<parehong-LAN-IP>:3988`
3. Mag-sign in → Join with camera.
4. Tumatakbo ang Docker.

**Kung walang video:** Madalas mali ang URL (nakasulat pa ang `:3888`).

---

## 9. I-verify ang migration

| Check | Inaasahan |
|-------|-----------|
| Lumang folder | Na-rename / hindi ginagamit |
| Dashboard | Port **3988** |
| Login | Gumagana; napalitan ang password |
| Network | SIP IP = IPv4 ng PC |
| BWC | Online (kung may camera) |
| VC app | Parehong IP + **:3988** |
| Docker | Naka-install at tumatakbo |

---

## 10. Kung may nabigo

| Problema | Susunod |
|----------|---------|
| `node:sqlite` error | Lumang pack pa (Node 20) — gamitin ang Mobility Test 2 (Node 22) |
| Dashboard sa 3888 | Lumang trial — lumipat sa **3988** |
| Invalid sign-in gamit ang `global123` | Kung napalitan mo na ang password, gamitin ang **bagong password** — sadyang hindi gagana ang `global123`. I-type; huwag gamitin ang naka-save na browser password. |
| Hindi makakonekta | Installation-Guide.md Seksyon 5 |
| Nabigo ang VC | Installation-Guide.md Seksyon 8 |
| Offline ang Face | Installation-Guide.md Seksyon 6 |

---

*Ubitron Mobility C2 — Mobility Test 2. Paglipat mula sa lumang trial. Suporta: kontakin ang vendor.*
