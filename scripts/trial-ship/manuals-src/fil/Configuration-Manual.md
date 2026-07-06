# Mobility Axiom — Manwal ng Configuration

**Para sa:** IT, super admin, installer.  
**Basahin kasama:** **Quick Guide** · **User Manual**

Saklaw: server setup, BWC registration, operators, storage, firewall, video conference — may numbered steps.

---

## Talaan ng nilalaman

1. [Bago magsimula](#1-bago-magsimula)
2. [Buksan ang Server Config](#2-buksan-ang-server-config)
3. [Network & deployment](#3-network--deployment)
4. [Irehistro ang BWCs](#4-irehistro-ang-bwcs)
5. [Map groups](#5-map-groups)
6. [Dashboard Auth](#6-dashboard-auth)
7. [Evidence storage](#7-evidence-storage)
8. [Video Conference](#8-video-conference)
9. [Centre Summary AI](#9-centre-summary-ai)
10. [Firewall at ports](#10-firewall-at-ports)
11. [Trial license](#11-trial-license)
12. [Password at audit](#12-password-at-audit)
13. [Checklist pagkatapos i-setup](#13-checklist-pagkatapos-i-setup)

---

## 1. Bago magsimula

| Item | Kailangan |
|------|-----------|
| Server PC | Windows 10/11 64-bit, static LAN IP inirerekomenda |
| Pack | Na-unzip; `Install-Mobility.bat` isang beses |
| Docker Desktop | Naka-install at tumatakbo (VC lang) |
| BWC cameras | Naka-on, network OK, SIP screen accessible |
| Network | Parehong LAN; **IPv4 lang** sa keypad ng camera |

**Huwag** mag-install ng hiwalay na Node — kasama sa `Mobility-Axiom\tools\node\`.

---

## 2. Buksan ang Server Config

1. Mag-sign in bilang **super admin** (trial: `global`).
2. **Settings** tab → **Server Config**.
3. Kaliwang nav: **Network & deployment** | **BWCs** | **Map groups** | **Dashboard Auth**.

**Operator** accounts: **read-only** lang.

---

## 3. Network & deployment

### 3.1 Deployment

Piliin ang **LAN server** → **Save server settings**.

### 3.2 LAN network (mahalaga)

1. **BWC SIP server IP** = **IPv4** ng PC (hal. `192.168.1.10`) — hindi hostname.
2. Tandaan ang HTTP port `3888` at video WS `3889`.
3. **Save server settings**.

### 3.3 BWC camera register

Itakda ang Platform ID, Realm, Password → kopyahin ang **Type on BWC** sa bawat camera SIP screen.

---

## 4. Irehistro ang BWCs

**Tab:** **BWCs**

1. **Add row** → **Device ID** (eksaktong tulad sa camera) → **Officer** → **Map group** (opsyonal).
2. **Save BWC list**.

**SIP screen ng camera:**

| Field | Ilagay |
|-------|--------|
| SIP server | IPv4 ng server |
| Port | 5060 |
| Platform ID / Realm / Password | Pareho sa Server Config |
| Device ID | Pareho sa row sa BWC list |

Maghintay ~30s → **Operations** → **Online**.

Trial pack: `FM_SEED_BWC_ID=` walang laman — walang demo device.

---

## 5. Map groups

Gumawa ng grupo may pangalan at kulay → i-assign sa BWCs tab → para sa kulay ng pin, video wall, PTT.

---

## 6. Dashboard Auth

**Operator:** payagan ang Operations/Evidence/Command Wall/VC — huwag payagan ang edit ng Server Config → **Save** sa row.

**Super admin:** dagdag ng row → **Save**.

---

## 7. Evidence storage

FTP folder, live capture, evidence index → **Save storage** → **Scan FTP for evidence**.

NAS: i-mount muna sa Windows.

Opsyonal: **Auto-record server video on SOS alarm**.

---

## 8. Video Conference

1. Docker Desktop.
2. `Install-Mobility.bat` — layanan konferensi video.
3. **Video Conference → Settings** — WebSocket URL para sa phone (hal. `ws://192.168.1.10:7880`).

I-distribute ang `MobilityConference-1.5.6.apk`.

---

## 9. Centre Summary AI

- Kasama ang assistant sa installer (~1 GB). Walang download on-site. Unang **Ask** 1–2 minuto. Super admin lamang.

---

## 10. Firewall at ports

| Port | Serbisyo |
|------|----------|
| 3888 | Dashboard HTTP |
| 3889 | Live video WebSocket |
| 5060 | SIP |
| 7880 | บริการประชุมทางวิดีโอ |
| 40130+ UDP | RTP |

---

## 11. Trial license

5 BWC · 10 dashboard users · 1 taon (ayon sa license file).

---

## 12. Password at audit

**Dashboard Auth** → bagong password → **Save**. **Audit Trail** → filter → **Export CSV**.

---

## 13. Checklist pagkatapos i-setup

| Hakbang | OK? |
|---------|-----|
| Install-Mobility.bat walang error | ☐ |
| Docker tumatakbo | ☐ |
| `http://localhost:3888` bukas | ☐ |
| LAN IP = IPv4 ng PC | ☐ |
| BWC naka-save | ☐ |
| SIP camera tumutugma | ☐ |
| Online sa 60s | ☐ |
| Pin may live video | ☐ |
| PTT naririnig | ☐ |
| FTP scan OK | ☐ |
| VC Join Room OK | ☐ |
| Operator read-only test | ☐ |

Kung may fail: User Manual §18 at `VIEW-LOG.bat`.
