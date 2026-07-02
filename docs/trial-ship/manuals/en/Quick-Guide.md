# Mobility Axiom — Quick Guide

## What you need on this PC

| Item | Required? | Notes |
|------|-----------|-------|
| Windows 10/11 (64-bit) | Yes | Administrator rights for Docker |
| **Node.js** | **No** | **Included** in `Mobility-Axiom\tools\node\` |
| **Docker Desktop** | Yes (VC only) | [Download](https://www.docker.com/products/docker-desktop/) |
| Internet | First install only | Docker image pull for Video Conference |

## Install (once)

1. **Unzip** the full delivery folder (e.g. to `C:\Mobility-Trial\`).
2. **Install Docker Desktop** from the link above. Start Docker — wait until the whale icon is steady.
3. Double-click **`Install-Mobility.bat`** (in the pack root, same folder as this README).
   - Verifies bundled Node + libraries
   - Creates `.env` with your LAN IP
   - Starts LiveKit (Video Conference engine)
4. Double-click **`Start Mobility.bat`** every time you use Mobility.
   - Opens the dashboard in your browser

**Do not** run `npm install` — dependencies are pre-built in the pack.

## Folder layout (after unzip)

| Path | Purpose |
|------|---------|
| `Install-Mobility.bat` | Run once after unzip |
| `Start Mobility.bat` | Start server + open browser |
| `Mobility-Axiom\` | Application (do not delete) |
| `Mobility-Axiom\tools\node\` | Bundled Node.js 20 |
| `MobilityConference-1.5.6.apk` | Android Video Conference app |
| `manuals\` | Guides in your language |

## First login
| Field | Value |
|-------|-------|
| URL | http://<server-ip>:3888 |
| Username | global |
| Password | global123 |

Change password: **Settings → Server Config → My account → Update password**.

## BWC online (short)
1. **Settings → Server Config → Network** — set server IPv4 → **Save server settings**.
2. **Settings → Server Config → BWCs** — add Device ID + officer name → **Save BWC list**.
3. On each BWC SIP screen — enter values from **Type on BWC** (IPv4 only).
4. Wait ~30s — device shows **Online** in fleet list.

## Video Conference (phone)
1. Install **MobilityConference-1.5.6.apk** on Android.
2. Server URL = same as dashboard (http://<server-ip>:3888).
3. Sign in → open room → Join with camera.

## Trial license
5 BWC · 10 dashboard users · 1 year.

Full steps: **Configuration Manual** in your language folder.
