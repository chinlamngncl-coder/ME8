# Mobility Axiom — Quick Guide

## What you need on this PC

| Item | Required? | Notes |
|------|-----------|-------|
| Windows 10/11 (64-bit) | Yes | Administrator rights for Docker |
| **Node.js** | **No** | **Included** in `Mobility-Axiom\tools\node\` |
| **Docker Desktop** | Yes (VC only) | [Download](https://www.docker.com/products/docker-desktop/) |
| Internet | First install only | Docker image pull; **map tiles are offline** |

## Install (once)

1. **Unzip** the full **CN Trial Mobility** folder (e.g. `C:\CN-Trial\`).
2. **Install Docker Desktop** — start it (whale icon steady).
3. Double-click **`Install-Mobility.bat`** in the pack root.
4. Double-click **`Start Mobility.bat`** each time you use Mobility.

**Do not** run `npm install` — libraries are pre-built in the pack.

## First login
| Field | Value |
|-------|-------|
| URL | http://<server-ip>:3888 |
| Username | global |
| Password | global123 |

Language: **English** or **中文（简体）** on login page.

## Map
This pack includes **offline map tiles** (Beijing area). No internet needed for the basemap.

## BWC online (short)
1. **Settings → Server Config → Network** — set server IPv4.
2. **Settings → Server Config → BWCs** — add Device ID + officer name.
3. On BWC SIP screen — use **Type on BWC** values (IPv4 only).

## Video Conference
Install **MobilityConference-1.5.6.apk** on Android. Docker must be running.
