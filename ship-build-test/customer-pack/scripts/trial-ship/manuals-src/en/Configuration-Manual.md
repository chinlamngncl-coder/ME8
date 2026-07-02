# Mobility Axiom — Configuration Manual

**Audience:** IT staff, super admins, installers.  
**Pair with:** **Quick Guide** (install) · **User Manual** (daily operations)

This manual covers **server setup**, **BWC camera registration**, **operators**, **storage**, **firewall**, and **video conference** configuration — with numbered steps.

---

## Table of contents

1. [Before you start](#1-before-you-start)
2. [Open Server Config](#2-open-server-config)
3. [Network & deployment tab](#3-network--deployment-tab)
4. [Register BWCs (BWCs tab)](#4-register-bwcs)
5. [Map groups](#5-map-groups)
6. [Dashboard Auth (operators)](#6-dashboard-auth)
7. [Evidence storage paths](#7-evidence-storage)
8. [Video Conference (Docker / LiveKit)](#8-video-conference)
9. [Centre Summary AI](#9-centre-summary-ai)
10. [Firewall & ports](#10-firewall)
11. [Trial license limits](#11-trial-license)
12. [Change passwords & audit](#12-passwords--audit)
13. [Post-setup verification checklist](#13-verification-checklist)

---

## 1. Before you start

| Item | Requirement |
|------|-------------|
| Server PC | Windows 10/11 64-bit, LAN IP static recommended |
| Mobility pack | Unzipped; `Install-Mobility.bat` completed once |
| Docker Desktop | Installed and running (Video Conference only) |
| BWC cameras | Powered on, SIM/data or Wi‑Fi, SIP screen accessible |
| Network | Server and BWCs on routable LAN; **IPv4 only** on camera keypad |

**Do not** install separate Node.js — the pack includes `Mobility-Axiom\tools\node\`.

---

## 2. Open Server Config

1. Sign in as **super admin** (trial: `global`).
2. Click **Settings** tab.
3. Left panel → **Server Config**.
4. You see left nav: **Network & deployment** | **BWCs** | **Map groups** | **Dashboard Auth**.

**Operator accounts:** Server Config is **read-only** — ask super admin for changes.

**Read-only banner:** Yellow bar explains you cannot save.

---

## 3. Network & deployment tab

Inside **Network & deployment**, section nav on the right:

### 3.1 Deployment

1. **Deployment mode:** choose **LAN server** for on-prem trial.
2. **Tenant / customer name:** optional label on reports.
3. Scroll to bottom → **Save server settings**.

### 3.2 LAN network (critical for BWC online)

1. Open **LAN network** section.
2. Set **BWC SIP server IP** = this PC's **IPv4** (e.g. `192.168.1.10`) — **not a hostname**.
3. Note **HTTP port** (default `3888`) and **video WebSocket port** (default `3889`).
4. **Save server settings**.

### 3.3 BWC camera register (SIP)

1. Open **BWC camera register** section.
2. Set **Platform ID**, **Realm**, **Password** — defaults work for trial; change for production.
3. Copy values from **Type on BWC** block — you will type these on each camera SIP screen.

### 3.4 Protocol

Same SIP password and realm for every BWC. Do not mix per-device passwords unless advanced setup.

### 3.5 Operator access

Set URLs shown to operators; optional HTTPS notes for production.

### 3.6 Site timezone

Set correct timezone for logs and evidence timestamps.

### 3.7 Storage link

Shortcut to evidence path settings (see §7).

---

## 4. Register BWCs

**Tab:** **BWCs** (left nav in Server Config).

### 4.1 Add each camera

For every physical BWC:

1. Click **Add row** (or empty row).
2. **Device ID** — exact ID from camera label / SIP menu (e.g. `34020000001320000001`).
3. **Officer** — nickname shown on map and fleet table.
4. **Map group** — optional colour group for pins and PTT.
5. Click **Save BWC list** at bottom.

### 4.2 Type on BWC (camera SIP screen)

On each camera's SIP configuration menu, enter:

| Camera field | Enter this |
|--------------|------------|
| SIP server / registrar | Server **IPv4** from Network tab |
| Port | `5060` (default) |
| Platform ID | From Server Config |
| Realm | From Server Config |
| Password | From Server Config |
| Device ID | **Same** as row in BWC list |

**Rules:**

- Use **numbers and dots only** for server address — no DNS names on camera keypad.
- Device ID on camera **must match** Mobility list exactly.

### 4.3 Verify online

1. Save BWC list → wait ~30 seconds.
2. **Operations** → Device Summary → **Online**.
3. If Offline → see §13 troubleshooting.

### 4.4 Trial empty fleet

Pack sets `FM_SEED_BWC_ID=` empty — no demo device. You start with zero until you add rows.

---

## 5. Map groups

**Tab:** **Map groups**.

1. Create groups with name and colour (e.g. "Team A" = blue).
2. Assign each BWC row to a group in BWCs tab.
3. Used for: pin colour, video wall rotation, PTT groups.

---

## 6. Dashboard Auth

**Tab:** **Dashboard Auth**.

### 6.1 Create operator (read-only dispatcher)

1. Add row: username, password.
2. Role: **Operator** or custom toggles.
3. Enable: Operations, Evidence view, Command Wall, VC — disable Server Config edit.
4. Click **Save** on that row.

### 6.2 Create additional super admin

1. Add row with **Super admin** role.
2. Save row.

### 6.3 Permission toggles (custom)

Per-user checkboxes control each tab and export capabilities. Always click **Save** on the row after changes.

---

## 7. Evidence storage

**Paths:** Server Config → Storage sections, or **Evidence → Storage** sub-tab.

| Path | Purpose |
|------|---------|
| FTP upload folder | Docking station uploads |
| Live capture folder | Server-side live recordings |
| Evidence index | SQLite catalog on server (metadata) |

**Steps:**

1. Browse or type folder on server disk (e.g. `D:\MobilityEvidence\ftp`).
2. **Save storage**.
3. **Scan FTP for evidence** — indexes files into Library.

**NAS/SAN:** IT must mount volume on Windows first; then point Mobility at mount letter.

**SOS auto-record:** Enable **Auto-record server video on SOS alarm** in evidence settings if required.

---

## 8. Video Conference

### 8.1 Docker / LiveKit

1. Install Docker Desktop.
2. Run `Install-Mobility.bat` — starts LiveKit container.
3. Verify: Video Conference tab connects.

### 8.2 VC Settings (in app)

**Video Conference → Settings** sub-tab:

- **Phone / browser video URL** — WebSocket URL phones use (e.g. `ws://192.168.1.10:7880`).
- Set to server LAN IP if cellular clients cannot reach `127.0.0.1`.

### 8.3 Android app

Distribute `MobilityConference-1.5.6.apk` — server URL = dashboard URL.

---

## 9. Centre Summary AI

- Model file bundled: `Mobility-Axiom\vendor\llm\` (~2 GB).
- No download on site (`FM_LLM_AUTO_DOWNLOAD=0`).
- First **Ask** may take 1–2 minutes to load model into RAM.
- Super admin only.

---

## 10. Firewall & ports

Allow on server host and perimeter:

| Port | Protocol | Service |
|------|----------|---------|
| 3888 | TCP | Dashboard HTTP |
| 3889 | TCP | Live video WebSocket |
| 3890 | TCP | Audio WebSocket |
| 5060 | UDP/TCP | SIP (BWC registration) |
| 7880 | TCP | LiveKit HTTP |
| 7881 | TCP | LiveKit RTC |
| 40130–40200 | UDP | RTP media (range may vary) |
| 21 | TCP | FTP dock (if enabled) |
| 20000–20100 | TCP | FTP passive (default range) |

---

## 11. Trial license

Trial pack includes `storage/platform-license.json`:

- **5 BWC** · **10 dashboard users** · **1 year** (per issued license).
- Exceeding limits blocks new registrations — contact vendor to extend.

---

## 12. Passwords & audit

### Change super admin password

Settings → Server Config → Dashboard Auth → your row → new password → **Save**.

### Audit Trail

Settings → **Audit Trail** — filter exports for compliance.

---

## 13. Verification checklist

| Step | Pass? |
|------|-------|
| `Install-Mobility.bat` completed without error | ☐ |
| Docker running (whale icon steady) | ☐ |
| Dashboard opens `http://localhost:3888` | ☐ |
| Server Config → LAN IP = PC IPv4 | ☐ |
| Each BWC row added and saved | ☐ |
| Camera SIP matches **Type on BWC** | ☐ |
| Fleet shows **Online** within 60s | ☐ |
| **Pin** shows live video | ☐ |
| **PTT** heard on BWC | ☐ |
| Evidence FTP path saved + scan works | ☐ |
| VC **Join Room** works in browser | ☐ |
| Operator test account login read-only | ☐ |

If any step fails, note exact error and check User Manual §18 + server logs (`VIEW-LOG.bat` in Mobility-Axiom folder).
