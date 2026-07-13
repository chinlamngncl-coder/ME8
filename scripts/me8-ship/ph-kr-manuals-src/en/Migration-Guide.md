# Ubitron Mobility C2 — Migration Guide (Old Trial → Mobility Test 2)

**Audience:** IT installer at a site that already tried an earlier Mobility / trial pack  
**Read with:** Installation-Guide.md (after migration) · Quick-Guide.md · Configuration-Manual.md  
**Pack:** Mobility Test 2 — dashboard port **3988** · bundled **Node 22**

This guide is for sites that already installed an older trial (often port **3888**, older Node, or incomplete pack). Follow every step in order. Do **not** skip ahead.

If this is a **brand-new PC** with no previous Mobility install, ignore this document and use **Installation-Guide.md** only.

---

## Table of contents

1. [What you keep and what you replace](#1-what-you-keep-and-what-you-replace)
2. [Stop the old trial completely](#2-stop-the-old-trial-completely)
3. [Retire the old application folder](#3-retire-the-old-application-folder)
4. [Install Mobility Test 2 in a new folder](#4-install-mobility-test-2-in-a-new-folder)
5. [Optional — keep previous camera and user data](#5-optional--keep-previous-camera-and-user-data)
6. [First login on the new pack](#6-first-login-on-the-new-pack)
7. [Fix network IP and body-worn cameras](#7-fix-network-ip-and-body-worn-cameras)
8. [Fix Video Conference (phone app)](#8-fix-video-conference-phone-app)
9. [Verify migration](#9-verify-migration)
10. [If something fails](#10-if-something-fails)

---

## 1. What you keep and what you replace

| Item | Action | Reason |
|------|--------|--------|
| **Docker Desktop** | **Keep** — do not uninstall | Video Conference still uses Docker |
| **Windows Node.js** (if installed from nodejs.org) | **Leave installed** — do not uninstall | The new pack uses its **own** Node inside the folder. System Node is unused. |
| **Old Mobility / Trial folder** | **Stop and rename or delete** | Old packs may use Node 20 and crash (`node:sqlite`) |
| **Old Android VC app** | **Install new APK over it** | Same app name; no need to wipe the phone |
| **Server LAN IP in Settings** | **Set again after login** | New pack uses port **3988**; confirm IPv4 matches this PC |
| **FTP / SIP passwords** | Set again in Settings if storage was wiped | Not shipped as secrets in the pack |

**You do not need to uninstall Docker or uninstall Node from Windows.** That wastes time and does not fix the product.

---

## 2. Stop the old trial completely

1. Close every black console window that says Mobility, Fleet, Axiom, or Ubitron server.
2. If your site installed a Windows service for Mobility, stop it (ask your IT administrator), for example:  
   `net stop UbitronC2`  
   (Only if that service exists. If the command says the service does not exist, continue.)
3. Confirm the old dashboard no longer opens:
   - Old trial URL was often `http://localhost:3888` — it should fail or show nothing useful after stop.
4. If a window or process will not close:
   - Open PowerShell **as Administrator** in the **old** application folder (if it has `kill-fleet-ports.ps1`) and run:  
     `powershell -ExecutionPolicy Bypass -File .\kill-fleet-ports.ps1`

**If this step fails:** Restart the Windows PC once, then continue from Step 3. Do not install the new pack while the old server is still running on the same ports.

---

## 3. Retire the old application folder

1. Locate the old folder on the Desktop or under `C:\` (examples: `Mobility-Axiom`, `Trial June Mobility`, `Mobility-Trial`, an older `Mobility Test` copy).
2. **Rename** it to something like `Mobility-OLD-2026` (safer than delete — you can recover files if needed).
3. Do **not** run `Install-Mobility.bat` or `Start Mobility.bat` from the renamed folder again.

**If this step fails:** If Windows says the folder is in use, return to Step 2 and close all related windows, then rename again.

---

## 4. Install Mobility Test 2 in a new folder

1. Obtain the **Mobility Test 2** zip (file name like `Mobility-Test-2-YYYYMMDD-HHMM.zip`).
2. Extract to a **new** permanent path, for example:  
   `C:\Mobility-Test-2\`  
   Do **not** extract on top of the old renamed folder.
3. Confirm these files exist in the new folder root:
   - `Install-Ubitron.bat`
   - `Start Ubitron.bat`
   - `MobilityConference-1.5.6.apk`
   - `Ubitron-ME8\`
   - `manuals\`
4. Confirm Docker Desktop is running (whale icon steady).
5. Double-click **`Install-Ubitron.bat`** once. Wait until it reports install complete.
6. Double-click **`Start Ubitron.bat`**. Leave the server window open.

**Dashboard URL for this pack:** `http://<server-ip>:3988`  
(Not 3888.)

**If this step fails:** Open `manuals\en\Installation-Guide.md` (or `fil` / `ko`) Section 4 and follow the “If this step fails” table. Common cause: Docker not running, or incomplete zip.

---

## 5. Optional — keep previous camera and user data

Use this **only** if the old trial already had working BWC registrations and dashboard users, and you want to keep them.

1. With the **new** server **stopped** (close the Start Ubitron window), copy from the old folder:  
   `...\storage\` → into  
   `C:\Mobility-Test-2\Ubitron-ME8\storage\`  
   (merge / overwrite files as needed).
2. From the **new** pack only, restore the license file:  
   Copy  
   `Ubitron-ME8\storage\platform-license.json`  
   from a **fresh unzip of Mobility Test 2** (or keep the license that came with the new pack).  
   Do **not** keep an old broken or unsigned license file.
3. Start again with **`Start Ubitron.bat`**.

If the old trial never worked reliably, **skip this section** — use a clean install and re-enter cameras in Settings (cleaner for a trial retest).

---

## 6. First login on the new pack

1. Browser: `http://127.0.0.1:3988` on the server PC, or `http://<LAN-IP>:3988` from another PC on the same network.
2. Username: `global`  
   Password: `global123`  
   (Unless you restored storage that already changed the password — then use the password you set earlier.)
3. Immediately change the password: **Settings → Server Config → My account → Update password**, or use the forced change-password page after first login.
4. **Password reminder:** First install uses `global123`. After you change it, **`global123` will fail** — use your new password. On the change-password page, type a password of at least 12 characters with upper, lower, number, and symbol (example: `Ab12cd34!@#$`). Do not paste; do not rely on a browser-saved password.

**If this step fails:** Confirm the server window is still open. Confirm you are using port **3988**, not 3888. Hard-refresh the browser (Ctrl+F5).

---

## 7. Fix network IP and body-worn cameras

This is where most previous trial complaints happened. Do these steps **after** login succeeds.

1. **Settings → Server Config → Network & deployment**
2. Set **BWC SIP server IP** to this PC’s **IPv4 address** (example: `192.168.1.10`). Do **not** use a hostname. Do **not** use `172.17`–`172.31` (WSL/Docker).
3. Confirm HTTP port shows **3988**.
4. Click **Save server settings**.
5. **Settings → Server Config → BWCs** — add or confirm each Device ID and officer name → **Save BWC list**.
6. On each camera SIP screen, enter the values shown under **Type on BWC** (IPv4 only).
7. Wait about 30 seconds — device status should become **Online**.

**If cameras stay offline:** Same LAN as the server; ping the server IP from the camera network; SIP password must match **Type on BWC**; old trial may still have cameras pointed at port or IP from the previous install — update the camera SIP screen to the new values.

---

## 8. Fix Video Conference (phone app)

1. On the Android phone, install **`MobilityConference-1.5.6.apk`** from the Mobility Test 2 folder (overwrite / update the previous app).
2. Open the app. Set **Server URL** to:  
   `http://<same-LAN-IP-as-dashboard>:3988`  
   Example: if the dashboard is `http://192.168.1.10:3988`, the app must use that exact host and port.
3. Sign in with a dashboard user → open a room → **Join with camera**.
4. Confirm **Docker Desktop** is running on the server.

**If video does not connect:** Wrong URL (still using `:3888`) is the most common mistake. Fix the URL, force-close the app, open again. Confirm LiveKit containers are running in Docker Desktop.

---

## 9. Verify migration

| Check | Expected |
|-------|----------|
| Old trial folder | Renamed or unused — not started |
| New dashboard | Loads on port **3988** |
| Login | Works; password changed |
| Network Settings | SIP IP = this PC IPv4 |
| At least one BWC | **Online** (if cameras are on site) |
| VC app | Same IP and **:3988**; joins room |
| Docker | Still installed and running |

When all checks pass, give operators **User-Manual.md** in their language.

---

## 10. If something fails

| Problem | Next step |
|---------|-----------|
| `No such built-in module: node:sqlite` | You are still running an **old** pack with Node 20. Stop it. Use Mobility Test 2 (Node 22) only. |
| Dashboard on 3888 only | That is the old trial. Migrate to this pack on **3988**. |
| Invalid sign-in with `global123` | If you already changed the password, use **your new password** — `global123` will fail on purpose. Type it; do not use a saved browser password. On change-password, use 12+ chars with upper/lower/number/symbol (example `Ab12cd34!@#$`). |
| Cannot connect after Start | Installation-Guide.md Section 5 |
| VC fails | Installation-Guide.md Section 8 + Docker running |
| Face Analytics offline | Installation-Guide.md Section 6 + `START-FACE-MATCHING.bat` |
| Need full clean install | Delete new folder, unzip again, skip Section 5 (do not copy old storage) |

For first-time install detail on a clean PC, use **Installation-Guide.md**.

---

*Ubitron Mobility C2 — Mobility Test 2. Migration from older trial packs. Support: contact your vendor.*
