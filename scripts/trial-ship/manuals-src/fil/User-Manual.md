# Mobility Axiom — Manwal ng User (Gabay ng Operator)

**Para sa:** Dispatcher, supervisor, staff ng ebidensya, control-room operator.  
**Kaugnay na docs:** **Quick Guide** (install) · **Configuration Manual** (server/BWC) · **README.txt**

Ipinapaliwanag ng gabay na ito ang **bawat tab**, **bawat pangunahing button**, at **hakbang-hakbang na workflow** sa dashboard. Ang mga label sa UI ay nasa wikang pinili mo; sa manwal na ito ginagamit din ang English na pangalan ng tab kung iyon ang nakikita sa dropdown (hal. **Operations**, **Settings**).

---

## Talaan ng nilalaman

1. [Ano ang ginagawa ng sistema](#1-ano-ang-ginagawa-ng-sistema)
2. [Mag-sign in, wika, mag-sign out](#2-mag-sign-in-wika-mag-sign-out)
3. [Header bar (itaas ng bawat screen)](#3-header-bar)
4. [Layout — tab na Operations](#4-layout--tab-na-operations)
5. [Device Summary (fleet table)](#5-device-summary-fleet-table)
6. [SOS — banner, log, ulat](#6-sos)
7. [PTT groups at Messages](#7-ptt-groups-at-messages)
8. [Mapa — pins, panels, toolbar](#8-mapa)
9. [Geofencing — hakbang-hakbang](#9-geofencing)
10. [Video wall (6 panels)](#10-video-wall)
11. [Evidence & Docking — lahat ng sub-tab](#11-evidence--docking)
12. [Command Wall](#12-command-wall)
13. [Centre Summary](#13-centre-summary)
14. [Video Conference](#14-video-conference)
15. [Settings at Audit Trail](#15-settings-at-audit-trail)
16. [Mga role ng user](#16-mga-role-ng-user)
17. [Workflow cookbook (mga senaryo sa shift)](#17-workflow-cookbook)
18. [Troubleshooting](#18-troubleshooting)

---

## 1. Ano ang ginagawa ng sistema

| Kakayahan | Saan sa UI | Ano ang magagawa mo |
|-----------|------------|----------------------|
| Live GPS mapa | Operations → mapa | Lokasyon ng officer, SOS, status ng recording |
| Live BWC video | Map pin panel, video wall, Command Wall | Manood ng maraming stream; 6 sa Operations |
| Voice / PTT | Fleet table, map pin, PTT groups | One-to-one o group na push-to-talk |
| SOS | Header banner, SOS log, mapa | Alarm, ulat, export ng folder |
| Text sa BWC | Operations → Messages | Magpadala ng text sa online na camera |
| Evidence library | Tab na Evidence | Hanapin ang upload mula sa dock, server record, case files |
| Video conference | Tab na Video Conference | Room na may phone, PC, live BWC share |
| Admin | Settings → Server Config | Network, listahan ng BWC, operators (super admin) |

---

## 2. Mag-sign in, wika, mag-sign out

### 2.1 Unang login

1. Buksan ang browser (Chrome o Edge inirerekomenda).
2. Pumunta sa `http://<server-ip>:3888` (trial sa parehong PC: `http://localhost:3888`).
3. Ilagay ang **Username** at **Password** (trial: `global` / `global123`).
4. I-click ang **Sign in**.

### 2.2 Palitan ang wika

- **Sa login:** piliin ang wika bago mag-sign in.
- **Pagkatapos login:** dropdown na **Language** sa kanang itaas ng header.
- APAC trial: English, Korean, Thai, Indonesian, Filipino.

Lahat ng menu, button, at hint ay agad na nagpapalit.

### 2.3 Palitan ang password (super admin)

1. Tab na **Settings** → **Server Config**.
2. Buksan ang **Dashboard Auth** (kaliwang nav sa loob ng Server Config).
3. Hanapin ang iyong row → bagong password → **Save** sa row na iyon.

### 2.4 Mag-sign out

1. Tab na **Settings**.
2. Kaliwang panel → **Sign out**.
3. Babalik sa login page. Laging mag-sign out sa shared PC.

---

## 3. Header bar

Nakikita sa bawat tab.

| Control | Lokasyon | Ginagawa |
|---------|----------|----------|
| Logo **Mobility Axiom** | Kaliwang itaas | Brand lang |
| **Voice mute** 🔊 | Kanang itaas | I-mute/i-unmute ang boses ng SOS at alert |
| **Repeat** | Kanang itaas | Ulitin ang huling voice alert |
| **Language** | Kanang itaas | Palitan ang wika ng UI |
| **SOS banner** | Ilalim ng header kapag may SOS | Pulang strip: pangalan ng device, oras — kapag may bukas na SOS |

**Tip:** Kung walang naririnig na alert, siguraduhing naka-off ang mute (hindi natatakpan ang icon).

---

## 4. Layout — tab na Operations

Ang **Operations** ang **default na home screen** pagkatapos mag-login.

### 4.1 Tatlong column

| Bahagi | Nilalaman |
|--------|-----------|
| **Kaliwang sidebar** | Device Summary, SOS log, PTT groups, Messages, Storage |
| **Gitna** | Interactive na mapa + toolbar ng mapa |
| **Kanan** | Anim na live video wall panel |

### 4.2 Itago ang sidebar

I-click ang **◀** sa makitid na gutter sa pagitan ng sidebar at mapa para mas malaki ang mapa. I-click muli para ipakita.

### 4.3 Top nav (kapag naka-Operations)

| Control | Aksyon |
|---------|--------|
| **Auto-rotate** | Checkbox — awtomatikong mag-ikot ng camera sa 6 panel |
| **Popout Matrix** | Full-screen video matrix sa ibang monitor |
| **Config** | Dialog para i-assign ang camera sa bawat panel |

### 4.4 Command Wall awareness strip

Kung bukas ang Command Wall sa ibang window, maaaring lumabas ang **Open Command Wall →** — i-click para lumipat sa tab na iyon.

---

## 5. Device Summary (fleet table)

**Lokasyon:** Operations → kaliwang sidebar → **Device Summary**.

**Summary line:** hal. `3 online · 5 devices`.

### 5.1 Search at filter

1. **Search** — type ang pangalan ng officer o device ID.
2. **Filter:** **All** / **Online only** / **Offline only**.

### 5.2 Mga column — ano ang i-click

| Column | Paano gamitin |
|--------|----------------|
| **Pin** | I-click — toggle ang map pin + floating live video. I-click muli para alisin. |
| **PTT** | **Hawakan** — makipag-usap sa BWC na ito lang (walang video). |
| **Call** | I-click — voice call sa BWC. |
| **GPS** | I-click — buksan ang route / track view. |
| *(checkbox)* | I-tick — para sa PTT groups (2+ online). |
| **Device** | Pangalan ng officer at device ID. |
| **Status** | **Online** o **Offline**. |

### 5.3 Bulk actions

| Button | Aksyon |
|--------|--------|
| **Open All (Up to 6)** | I-pin ang hanggang 6 online device sa mapa |
| **Clear map pins** | Alisin lahat ng floating pin panel |

### 5.4 Workflow — subaybayan ang isang officer

1. Hanapin sa table (gamitin ang search kung kailangan).
2. Siguraduhing **Online**.
3. I-click ang **Pin** → mag-zoom ang mapa; bubukas ang live video.
4. Para magsalita: **hawakan ang PTT** sa row o sa map pin panel.
5. Para itigil ang video sa mapa: i-click muli ang **Pin** o isara ang panel.

### 5.5 Walang laman ang table

**No devices yet** — walang nakarehistro na BWC. Kailangan idagdag ng super admin sa **Settings → Server Config → BWCs** (tingnan ang Configuration Manual).

---

## 6. SOS

### 6.1 Aktibong SOS — banner sa header

Kapag nag-SOS ang BWC:

1. Lumalabas ang **pulang banner** sa ilalim ng header.
2. Karaniwang **nag-zoom** ang mapa sa lokasyon.
3. Ang pin ay may **SOS** status chip.
4. Maaaring tumunog ang voice alert (maliban kung naka-mute).

**Gawain ng dispatcher:**

1. Itakda ang **response radius** (200–1000 m) kung kailangan — pulang bilog sa mapa para sa malalapit na unit.
2. I-click ang **Pin** kung hindi pa bukas — kumpirmahin ang live video sa alarm officer.
3. **Acknowledge** — tingnan ang §6.1b (PTT team mula sa naka-check na malalapit na unit), **o** i-click ang **PTT team** sa banner.
4. **Hawakan ang PTT** sa wall panel o map pin para makausap ang **buong team** kapag **PTT TEAM · ON**.
5. Buksan ang row sa **SOS log** para sa buong ulat.

### 6.1b Response radius at SOS PTT team

| Kontrol sa banner | Aksyon |
|-------------------|--------|
| **Radius chips** | 200 / 300 / 400 / 500 / 1000 m — sino ang “malapit” sa mapa |
| **Summary line** | Pangalan at distansya ng malalapit na unit |
| **PTT team** | I-push ang PTT group ngayon (alarm officer + online sa radius); bukas pa ang alarm |
| **Acknowledge** | Isara ang alarm sa log; tingnan ang mga hakbang sa ibaba |

**Inirerekomenda — Acknowledge na may auto PTT team:**

1. I-click ang **Acknowledge** sa banner.
2. Sa dialog, **default na naka-check ang malalapit na unit** — alisin ang check kung ayaw isama sa team.
3. Opsiyonal na tala → **Submit / close**.
4. Hintayin ang toast **PTT team ON — …** (kailangan ng kahit isang naka-check na online helper bukod sa alarm officer).
5. **Hawakan ang PTT** sa wall panel o map pin ng alarm officer — maririnig ng lahat ng naka-check (audio lang).

**Manual PTT team (bukas pa ang alarm):** I-click ang **PTT team** sa banner sa halip na hakbang 1–3, pagkatapos hawakan ang PTT tulad sa hakbang 5.

**Paalala:** Dapat **online** at nasa radius ang mga helper (GPS sa mapa). Alisin lahat ng check kung log lang ang kailangan. Dapat naka-enable ang PTT sa server (Configuration Manual).

### 6.2 Panel na SOS log

**Lokasyon:** Operations → kaliwang sidebar → **SOS log**.

| Elemento | Aksyon |
|----------|--------|
| Chart | Bilang ng SOS kamakailan |
| Mga row | I-click → detalye ng insidente + focus sa mapa |
| **Open incident files** | Buksan ang folder ng SOS packages sa server |
| **Download CSV** | I-export ang log |
| **Clear list** / **Reload list** | I-refresh ang listahan sa screen (hindi binubura ang server files) |

### 6.3 Dialog ng SOS incident

Pagkatapos i-click ang row:

| Button | Aksyon |
|--------|--------|
| **Open in new tab** | Buong HTML report sa bagong tab |
| **Close** | Isara ang dialog |
| **Server folder (admin)** | Buksan ang raw folder sa server |

Minsan kailangan ng **PIN** bago makita ang sensitibong ulat — ilagay ang PIN ng ahensya → **Unlock**.

---

## 7. PTT groups at Messages

### 7.1 PTT groups

**Lokasyon:** Operations → box na **PTT groups**.

**Layunin:** Isang PTT channel para sa maraming BWC.

**Hakbang:**

1. **Opsyon A:** Piliin ang **map group** sa dropdown.
2. **Opsyon B:** I-tick ang **2+ online** device sa fleet table.
3. Suriin ang **Members** — **×** para i-exclude, **+** para isama.
4. I-click ang **Join group PTT**.
5. **Hawakan ang PTT** sa alinmang miyembro para mag-broadcast sa grupo.
6. **Ungroup all** pagkatapos ng insidente.

### 7.2 Messages

**Lokasyon:** Operations → **Messages**.

1. Lista ng **online** BWC — i-click ang pangalan para buksan ang thread.
2. Mag-type → **Send**.
3. **Clear thread** — linisin ang view (maaaring manatili sa server hanggang 30 araw).

---

## 8. Mapa

### 8.1 Pin sa mapa

- **Online** BWC na may GPS = may kulay na pin.
- **SOS** = naka-highlight; maaaring auto-zoom.
- **I-click ang pin** = buksan/focus ang floating panel.
- Maraming pin: i-drag ang **header** kung naka-stack.

**Floating pin panel:**

| Bahagi | Gamit |
|--------|-------|
| Live video | Stream mula sa camera |
| **PTT** | Hawakan para magsalita |
| Minimize / Expand | Palitan ang laki |
| Status badges | Online, SOS, REC, SRV REC, Fall, Patrol |
| Close (×) | Isara panel; maaaring magpatuloy sa video wall sa kanan |

### 8.2 Toolbar ng mapa

1. Piliin muna ang **online BWC** sa dropdown.
2. Gamitin ang action buttons.

| Button | Resulta |
|--------|---------|
| **Wall Map** | Mapa lang sa ibang window |
| **Snapshot** | Still image mula sa camera |
| **Start/Stop SD record** | Remote SD card |
| **Record to server / Stop** | Server-side recording |
| **Set/Clear geofencing** | Tingnan §9 |

---

## 9. Geofencing

### 9.1 Mag-set ng geofence

1. Ilagay ang **radius** sa metres sa toolbar.
2. I-click ang **Set geofencing**.
3. Piliin ang target BWC (online).
4. I-drag ang orange centre o white edge sa mapa, o i-click ang mapa.
5. I-click ang **Save geofence**.
6. Toast kapag pumasok/lumabas ang BWC sa zone.

### 9.2 Mag-clear ng geofence

1. **Clear geofencing** → piliin ang BWC → kumpirmahin.

---

## 10. Video wall

**Lokasyon:** Operations → kanang column (6 panel).

| Control | Aksyon |
|---------|--------|
| **Auto-rotate** | Top nav checkbox |
| **Popout Matrix** | Full-screen sa ibang monitor |
| **Config** | I-assign ang bawat panel sa device / grupo / CSV |
| **Stop** | Itigil ang stream sa isang panel |

**Config dialog:**

1. **Config** sa top bar.
2. Bawat isa sa 6 panel: device ID, map group, all online, o custom list.
3. **Download wall template (CSV)** → edit → **Import wall CSV**.
4. **Save**.

---

## 11. Evidence & Docking

**Tab:** **Evidence & Docking**.

**Sub-tabs:**

| Sub-tab | Layunin |
|---------|---------|
| **Overview** | Stats at gabay |
| **Docking Stations** | Irehistro ang dock, tingnan ang bay |
| **Evidence Library** | Hanapin at i-play ang file |
| **Case Files** | Case na may naka-link na ebidensya |
| **Route & GPS** | Replay ng GPS track |
| **Storage** | Super admin — path at FTP scan |

### 11.1 Evidence Library

1. Buksan ang **Evidence Library**.
2. **Refresh**.
3. Search/filter (officer, petsa, source).
4. **Detail** sa row → preview.
5. **Download** kung pinapayagan.

### 11.2 Docking Stations

**Register dock** → piliin ang dock → tingnan ang bay grid.

### 11.3 Case Files

**New case file** · **Create from SOS** · i-link ang ebidensya · isara ang case.

### 11.4 Route & GPS

Device + time range → replay sa mapa.

### 11.5 Storage (admin)

FTP + live capture paths → **Save storage** → **Scan FTP**.

---

## 12. Command Wall

**Live wall:** I-drag ang device mula sa Roster → panel → piliin ang layout (1/4/9/16/32) → **Rotate** → **Spotlight** → **Clear wall** → **Popout Matrix**.

**Display room:** Preset na **4-Monitor SOS Room** para sa extended desktop.

---

## 13. Centre Summary

KPI rings, SOS chart, storage, system health, recent activity, **AI assistant** → **Ask**. I-click ang **Refresh**.

---

## 14. Video Conference

Kailangan ang Docker. Sub-tabs: **Live**, **Lobby**, **Recordings**, **Settings**.

**Join Room** → layouts (Gallery, Speaker, Focus, atbp.) → **Share screen** → **Add BWC to Room**.

Android: **MobilityConference-1.5.6.apk**, parehong server URL.

---

## 15. Settings at Audit Trail

**Server Config**, lifecycle cards (**Onboarding**, **Assets**, atbp.), **Audit Trail** (filter → **Apply** → **Export CSV**), **Sign out**.

---

## 16. Mga role

Super admin = full edit · Operator = read-only Server Config · Custom = per **Dashboard Auth**.

---

## 17. Workflow cookbook

**Shift start:** Start Mobility.bat → Operations → bilangin online → Settings IP.

**Insidente:** Pin → PTT → server record kung kailangan.

**SOS:** Banner → itakda ang radius kung kailangan → **Acknowledge** (naka-check ang malalapit) o **PTT team** → hawakan **PTT** para sa buong team → log → Case from SOS.

**TV wall:** Command Wall 16 → Rotate 30s.

---

## 18. Troubleshooting

| Sintomas | Ayusin |
|----------|--------|
| Lahat Offline | Configuration Manual — Network |
| Walang video | Firewall 3889; i-Pin |
| PTT tahimik | Hawakan ang button |
| SOS PTT isang unit lang | Walang team | Ack na may naka-check na helper o **PTT team**; hintayin ang **PTT team ON** |
| Walang malapit sa Ack list | Walang GPS o offline | Hintayin ang posisyon; palawakin ang radius |
| VC fail | Docker + Install-Mobility.bat |

---

## Mapa ng dokumento

| Kailangan | Basahin |
|-----------|---------|
| Install | **Quick Guide** |
| Server/BWC | **Configuration Manual** |
| Pang-araw-araw | **Manwal na ito** |
