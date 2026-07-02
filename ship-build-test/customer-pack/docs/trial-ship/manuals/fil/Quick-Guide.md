# Mobility Axiom — Mabilis na Gabay

## Kailangan sa PC na ito

| Item | Kailangan? | Tala |
|------|------------|------|
| Windows 10/11 (64-bit) | Oo | Admin rights para sa Docker |
| **Node.js** | **Hindi** | **Kasama na** sa pack (`Mobility-Axiom\tools\node\`) |
| **Docker Desktop** | Oo (VC) | [I-download](https://www.docker.com/products/docker-desktop/) |
| Internet | Unang install | Docker image para sa Video Conference |

## I-install (isang beses)

1. **I-unzip** ang buong delivery folder (hal. `C:\Mobility-Trial\`).
2. I-install ang **Docker Desktop** mula sa link sa itaas. Patakbuhin — hintayin ang whale icon.
3. I-double-click ang **`Install-Mobility.bat`** (root ng pack).
4. Sa bawat paggamit, i-double-click ang **`Start Mobility.bat**`.

**Huwag** patakbuhin ang `npm install` — naka-bundle na ang dependencies.

## Unang login
| Field | Value |
|-------|-------|
| URL | http://<server-ip>:3888 |
| Username | global |
| Password | global123 |

## BWC online (maikli)
1. **Settings → Server Config → Network** — set server IPv4 → **Save server settings**.
2. **Settings → Server Config → BWCs** — add Device ID + officer name → **Save BWC list**.
3. On each BWC SIP screen — enter values from **Type on BWC** (IPv4 only).
4. Wait ~30s — device shows **Online** in fleet list.

## Video Conference (telepono)
1. Install **MobilityConference-1.5.6.apk** on Android.
2. Server URL = same as dashboard (http://<server-ip>:3888).
3. Sign in → open room → Join with camera.

## Trial license
5 BWC · 10 dashboard users · 1 year.

Full steps: **Configuration Manual** in this folder.
