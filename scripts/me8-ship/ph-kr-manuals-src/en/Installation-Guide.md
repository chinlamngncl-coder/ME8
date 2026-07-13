# Ubitron Mobility C2 — Installation Guide

**Audience:** IT installer, system administrator  
**Read with:** Quick-Guide.md · Configuration-Manual.md · User-Manual.md · Migration-Guide.md  
**Pack:** Mobility Test 2 (English, Filipino, Korean)

This guide walks you from an unzipped folder to a working dashboard, Video Conference, and Face Analytics. Follow every step in order. If a step fails, use the **If this step fails** note before continuing.

**Already installed an older trial** (port 3888, older folder, or Node crash)? Use **Migration-Guide.md** first, then return here only if you need a full clean-PC install.

---

## Table of contents

1. [What you need before you start](#1-what-you-need-before-you-start)
2. [Unzip the delivery folder](#2-unzip-the-delivery-folder)
3. [Install Docker Desktop](#3-install-docker-desktop)
4. [Run the one-time installer](#4-run-the-one-time-installer)
5. [Start the server and sign in](#5-start-the-server-and-sign-in)
6. [Install Python for Face Analytics](#6-install-python-for-face-analytics)
7. [Configure the server (after first login)](#7-configure-the-server-after-first-login)
8. [Install the Android Video Conference app](#8-install-the-android-video-conference-app)
9. [Verify the installation](#9-verify-the-installation)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. What you need before you start

| Item | Required? | Notes |
|------|-----------|-------|
| Windows 10 or 11 (64-bit) | Yes | Administrator rights for Docker and firewall rules |
| This delivery pack | Yes | Full folder — do not delete `Ubitron-ME8\` |
| **Node.js** | **No** | Included in `Ubitron-ME8\tools\node\` |
| **Docker Desktop** | Yes | Required for Video Conference (LiveKit) |
| **Python 3.11+** | Yes (Face Analytics) | Install in [Section 6](#6-install-python-for-face-analytics) |
| Internet | First install only | Docker image download; Python packages for Face Analytics |
| LAN network | Yes | Server PC and body-worn cameras on the same network |

**License included in this pack**

| Item | Limit |
|------|-------|
| Body-worn cameras | 5 |
| Dashboard users | 10 |
| Face Analytics sources | 5 |
| Video Conference | Enabled |
| Valid until | 2036-07-12 |

No license key entry is required — the signed license is already in `Ubitron-ME8\storage\platform-license.json`.

---

## 2. Unzip the delivery folder

1. Locate the zip file on your Desktop (for example `Mobility-Test-2-YYYYMMDD-HHMM.zip`).
2. Right-click → **Extract All…**
3. Choose a permanent path, for example `C:\Mobility-Test-2\`
4. Confirm these items exist in the extracted folder:

| Path | Purpose |
|------|---------|
| `Install-Ubitron.bat` | One-time installer |
| `Start Ubitron.bat` | Start server every day |
| `Ubitron-ME8\` | Application (do not delete) |
| `MobilityConference-1.5.6.apk` | Android Video Conference app |
| `manuals\en\` · `manuals\fil\` · `manuals\ko\` | Guides in three languages |

**If this step fails:** Ensure the zip extracted completely (free disk space ≥ 8 GB). Re-extract to a short path without special characters (for example `C:\Mobility-Test-2\`).

---

## 3. Install Docker Desktop

Video Conference uses LiveKit inside Docker. The dashboard will not start a conference until Docker is running.

1. Download Docker Desktop: https://www.docker.com/products/docker-desktop/
2. Run the installer — accept defaults unless your IT policy requires changes.
3. Restart the PC if the installer requests it.
4. Start **Docker Desktop** from the Start menu.
5. Wait until the whale icon in the system tray is **steady** (not animating).

**If this step fails**

| Symptom | What to do next |
|---------|-----------------|
| Docker will not start | Enable virtualization (BIOS/UEFI). Ask IT to confirm Hyper-V or WSL2 is available. |
| “Docker daemon not running” | Open Docker Desktop manually; wait 2 minutes; retry [Section 4](#4-run-the-one-time-installer). |
| Corporate proxy blocks download | Ask IT to allow `docker.io` and `registry-1.docker.io`, or pre-load the LiveKit image per vendor instructions. |

---

## 4. Run the one-time installer

1. Open the extracted folder (for example `C:\Mobility-Test-2\`).
2. Double-click **`Install-Ubitron.bat`**.
3. The script will:
   - **Step 1/4** — Verify bundled Node.js and application libraries
   - **Step 2/4** — Create `.env` with your PC’s LAN IP address
   - **Step 3/4** — Start LiveKit (Video Conference) in Docker
   - **Step 4/4** — Prepare Face Analytics (if Python is already installed)

4. Read the window output. When you see **Install complete**, press any key to close.

**Do not** run `npm install` — all Node dependencies are pre-built in the pack.

**If this step fails**

| Symptom | What to do next |
|---------|-----------------|
| “Docker Desktop is required” | Complete [Section 3](#3-install-docker-desktop); run `Install-Ubitron.bat` again. |
| “Bundled Node runtime missing” | Re-extract the full zip; do not copy files individually. |
| LiveKit start failed | Open Docker Desktop → **Containers** — remove stuck `livekit` containers → run `Install-Ubitron.bat` again. |
| Python note only (not an error) | Continue to [Section 6](#6-install-python-for-face-analytics) after first login. |

---

## 5. Start the server and sign in

1. Double-click **`Start Ubitron.bat`** in the pack root.
2. A black console window titled **Ubitron ME8 Server** opens — **leave it open**.
3. Your browser opens automatically to the dashboard (for example `http://192.168.1.10:3988/`).

**Never use a `172.17`–`172.31` address** (WSL / Docker virtual network). Cameras and PTT will fail. Use the PC’s real Wi‑Fi or Ethernet IPv4 (usually `192.168.x.x` or `10.x.x.x`).
4. Sign in:

| Field | Value |
|-------|-------|
| URL | `http://<server-ip>:3988` |
| Username | `global` |
| Password | `global123` |

5. Immediately change the password: **Settings → Server Config → My account → Update password**.

**If this step fails**

| Symptom | What to do next |
|---------|-----------------|
| Browser shows “cannot connect” | Confirm the server window is still open. Wait 10 seconds; refresh. Try `http://127.0.0.1:3988` on the server PC. |
| “Run Install-Ubitron.bat once first” | Complete [Section 4](#4-run-the-one-time-installer) before starting. |
| Login rejected | Use exactly `global` / `global123` on first install. Check Caps Lock. |
| Port already in use | Close other Mobility/Ubitron windows. In the server folder run `kill-fleet-ports.ps1` (PowerShell), then `Start Ubitron.bat` again. |

---

## 6. Install Python for Face Analytics

Face Analytics (watchlist matching) requires Python 3.11 or newer. Install once on the server PC.

1. Download Python: https://www.python.org/downloads/
2. Run the installer.
3. On the first screen, check **Add python.exe to PATH**.
4. Click **Install Now** and wait until finished.
5. Open a **new** Command Prompt and type: `py --version` — you should see Python 3.11 or higher.
6. Return to the pack folder and double-click **`Install-Ubitron.bat`** again (step 4/4 will install face packages — may take 5–15 minutes).
7. Alternatively, double-click **`START-FACE-MATCHING.bat`** in the pack root and leave the window open while using Face watch.

**If this step fails**

| Symptom | What to do next |
|---------|-----------------|
| `py` not recognized | Re-run Python installer with **Add to PATH** checked; reboot the PC. |
| pip install errors | Confirm internet access. Retry `Install-Ubitron.bat`. Check antivirus is not blocking `Ubitron-ME8\fr-sidecar\`. |
| Face watch shows offline | Run **START-FACE-MATCHING.bat**; leave window open; hard-refresh browser (Ctrl+F5). |

---

## 7. Configure the server (after first login)

Complete these steps **after** you can sign in successfully. Full detail is in **Configuration-Manual.md**.

### 7.1 Network

1. **Settings → Server Config → Network & deployment**
2. Set **BWC SIP server IP** to this PC’s IPv4 address (not a hostname).
3. Click **Save server settings**.

### 7.2 Register body-worn cameras

1. **Settings → Server Config → BWCs**
2. Click **Add row** → enter **Device ID** (exactly as shown on the camera) and **Officer** name.
3. Click **Save BWC list**.
4. On each camera SIP screen, enter values from **Type on BWC** (IPv4 only).
5. Wait ~30 seconds — status should show **Online**.

### 7.3 FTP docking (optional)

1. **Settings → Server Config → Evidence / FTP**
2. Set FTP username and password.
3. Apply the same FTP port (`2121`) and credentials on each docking station or BWC upload profile.

**If BWC stays offline:** Verify camera and server are on the same LAN; ping the server IP from the camera network; confirm SIP password matches **Type on BWC**.

---

## 8. Install the Android Video Conference app

1. Copy **`MobilityConference-1.5.6.apk`** to the Android device (USB, email, or MDM).
2. Enable **Install unknown apps** for your file manager if Android prompts.
3. Open the APK and install.
4. Launch **Mobility Conference**.
5. Server URL = dashboard URL without trailing slash (for example `http://192.168.1.10:3988`).
6. Sign in with a dashboard user account → open a room → **Join with camera**.

**If video does not connect:** Confirm Docker is running; confirm phone and server are on the same LAN; check Windows Firewall allows ports 7880 and 7881 (see Configuration-Manual §10).

---

## 9. Verify the installation

| Check | Expected result |
|-------|-----------------|
| Dashboard loads | `http://<server-ip>:3988` shows fleet map or login |
| Super admin login | `global` (or your new password) works |
| Docker container | Docker Desktop shows LiveKit-related containers running |
| BWC online | At least one camera shows **Online** after SIP config |
| Video Conference | Android app joins a room with video |
| Face Analytics | **START-FACE-MATCHING.bat** window open; Face watch status healthy |

When all checks pass, hand off **User-Manual.md** to control-room operators.

---

## 10. Troubleshooting

| Problem | Likely cause | Next step |
|---------|--------------|-----------|
| Dashboard unreachable | Server window closed or port blocked | Run `Start Ubitron.bat`; check firewall port 3988 |
| Video Conference fails | Docker stopped | Start Docker Desktop; run `Install-Ubitron.bat` step 2 again |
| License error on start | Missing or edited `platform-license.json` | Restore original pack; contact vendor — do not edit license file |
| Face match never ready | Python not installed or sidecar stopped | [Section 6](#6-install-python-for-face-analytics); run START-FACE-MATCHING.bat |
| FTP upload fails | Wrong port or password | Use port 2121; match Settings → FTP with device config |
| EADDRINUSE on restart | Old server still running | Run `Ubitron-ME8\kill-fleet-ports.ps1` as Administrator |

For configuration detail and firewall port list, see **Configuration-Manual.md**. For daily operator procedures, see **User-Manual.md**.

---

*Ubitron Mobility C2 — Mobility Test 2 delivery pack. Support: contact your vendor.*
