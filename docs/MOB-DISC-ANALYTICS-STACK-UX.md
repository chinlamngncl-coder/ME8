# MOB DISC — Analytics stack UX (Face + ANPR) + industry study

**Status:** DISC only — design locked for MOB waves **E0–E3**.  
**Parent:** `MOB-DISC-ANALYTICS-LICENSE-HUB.md`  
**Search:** `analytics stack`, `face rolling`, `ANPR hit`, `watchlist`, `no dead end`

---

## Goal

Simple for officers. Rich in data and evidence. **Every screen ends in a clear action** — never a dead panel with no Save, no Dismiss, no “what now?”.

Tender: optional licensed modules; when on, behaviour matches how leading enterprise VMS + analytics products work.

---

## Industry study — what famous FR / ANPR software does

Patterns extracted from **enterprise VMS alarm desks**, **LPR add-ons**, and **video analytics review** products (public manuals: Genetec Security Center, Milestone XProtect LPR, BriefCam REVIEW). We copy the **workflow**, not their UI skin.

| Pattern | Who does it well | What operators get |
|---------|------------------|-------------------|
| **Hit → alarm queue** | Genetec + FR integrators | Match triggers alarm; **camera + dossier + confidence** in one card; jump to live/playback from same task |
| **Alarm actions always visible** | Genetec Alarm Monitoring | **Acknowledge · Investigate · Snooze · Forward · Annotate** — never view-only |
| **Rolling event watchlist** | Genetec SaaS watchlist | Real-time tray; **Dismiss** per event; **Dismiss all**; events age out (e.g. 15 min) — stack keeps moving |
| **LPR event list + preview pane** | Milestone XProtect LPR | Filter by time/camera/list; **select row → video + plate** on the right; **export PDF report** |
| **Match list import/export** | Milestone LPR | **Import CSV · Export CSV** for hotlists — IT-managed, not hidden in config files |
| **Thumbnail stack chronological** | BriefCam REVIEW | Newest hits as **tiles**; click → **close-up clip** plays; **export · bookmark to case** on every tile |
| **Watchlist search mode** | BriefCam | Include/exclude watchlist; **match details under clip** so operator verifies before acting |
| **Evidence export from hit** | Milestone Smart Client | From selected event → **add to export list → signed export** — chain of custody |

### What we **do not** copy (complexity traps)

- Multi-task hunting (Alarm task vs Search task vs Monitoring task as three different apps)
- VIDEO SYNOPSIS as default live ops view (post-incident tool — keep for Research tier later)
- 40-filter panels before first result

### What we **do** copy (industry standard)

1. **One queue** of hits (rolling stack)  
2. **Select hit → detail pane** with video + map + match info  
3. **Explicit actions** on every hit (ack, dismiss, case, export)  
4. **Watchlist/hotlist** with import/save/export  
5. **Ingest from camera edge, VMS video, BWC FTP** → same queue  

---

## ME8 product shape — **Analytics Hub**

Same nav weight as Evidence Hub. **Not** buried in map toolbar.

```
Main nav → Analytics (grey if no license)

Analytics Hub
├── Face          ← licensed: analytics.face_fr
├── ANPR          ← licensed: analytics.anpr
└── Weapon        ← licensed later; grey default
```

Unlicensed tab: one grey panel + *“Module not licensed — contact administrator.”*  
**No** upload button that does nothing.

---

## The rolling stack (Face + ANPR — same layout, different icon)

### Layout (one screen, no merry-go-round)

```
┌─────────────────────────────────────────────────────────────┐
│ Analytics · Face          [Filter ▾] [Watchlist] [Settings] │
├──────────────────────┬──────────────────────────────────────┤
│  HIT STACK (rolling) │  DETAIL PANE (double-click or alert)  │
│  ┌────┐ ┌────┐       │  ┌─────────────┐  Match: Watchlist A │
│  │crop│ │crop│ NEW    │  │ large crop  │  Conf: 92%          │
│  └────┘ └────┘       │  └─────────────┘                      │
│  ┌────┐ ┌────┐       │  [ mini map pin ]  Device · time      │
│  │crop│ │crop│       │  ┌─────────────────────────────────┐ │
│  └────┘ └────┘       │  │ video preview (clip around hit)  │ │
│  … auto-scroll       │  └─────────────────────────────────┘ │
│                      │  ACTION BAR (always visible):        │
│  [Dismiss all]       │  Open full video · Map · Case ·      │
│                      │  Acknowledge · False positive ·      │
│                      │  Export clip · Save note               │
└──────────────────────┴──────────────────────────────────────┘
```

### Stack card (each hit)

| Field | Face | ANPR |
|-------|------|------|
| Thumbnail | Face crop | Plate crop |
| Time | Detection time | Detection time |
| Source | BWC / camera id | BWC / camera id |
| Badge | Unknown · **WATCHLIST** | Unknown · **HOTLIST** |
| Location | One-line address or coords | Same |

**Watchlist/hotlist hit:** card border accent + optional **front-centre popup** (modal lite, 5 s) with same actions as detail pane — then settles in stack.

### Stack rules

- Newest **top**; auto-expire after **60 min** (admin setting) — like industry watchlist trays  
- Max **250** visible (Genetec-style cap); older → **History** tab (searchable, not lost)  
- **Dismiss** removes from stack; **Dismiss all** clears tray (audit logged)  
- Scope: operator sees hits only for **dispatch group** devices  

---

## Ingest — one pipeline, three doors

All doors write the **same hit record** → same stack.

| Door | Input | ME8 today / target |
|------|--------|-------------------|
| **A — BWC device** | Face/plate still via message + **FTP** | `facePlateIngest` → extend to enqueue stack |
| **B — Edge SDK / camera** | HTTP/MQ webhook: crop + metadata + stream id | New `analyticsIngest` API |
| **C — VMS video** | Evidence file or live mirror → analytics engine → crops | Engine MOB (partner or server); links `evidenceFileId` + timestamp |

**FTP rule:** BWC FR uploads land in configured FTP subfolder → catalog scan → **same hit queue** (officers never “go to FTP” for routine work).

---

## Double-click / alert — detail pane (mandatory content)

Officer must see **everything needed to act** without leaving Analytics:

| Block | Content |
|-------|---------|
| Crop | Large face or plate image |
| Match | Watchlist name, confidence, dossier note (if any) |
| Video | ±15 s clip around hit (evidence or NVR segment) |
| Map | Pin at detection GPS; link **Open in Operations map** |
| Meta | Device, officer, alarm time, ingest source (BWC / edge / file) |
| Linked evidence | Button if `evidenceFileId` or case already attached |

---

## Action bar — **never empty** (anti–laughing-stock rule)

Every detail view **must** show at least these buttons (grey only when truly impossible, with tooltip why):

| Button | Who | Does |
|--------|-----|------|
| **Open full video** | View permission | Evidence preview or live playback slot |
| **Show on map** | View permission | Focus map pin |
| **Add to case** | Edit permission | Link hit to case file |
| **Acknowledge** | Alert ack permission | Clears popup; logs operator |
| **False positive** | Alert ack permission | Marks hit; trains audit (no silent delete) |
| **Export clip** | Export permission | Trim export + PDF one-pager (plate/face + meta) |
| **Save note** | Edit permission | Officer observation (like redaction draft note) |

**Forbidden ship states:**

- Stack with no dismiss  
- Detail with no buttons  
- Watchlist screen with no **Import / Save / Export**  
- Upload/analyse with no **progress** and no **result or error**  
- Match alert with no **Acknowledge**  

---

## Watchlist / hotlist admin (super-admin)

Separate sub-screen inside Analytics (not Server Config maze):

| Action | Face | ANPR |
|--------|------|------|
| Import CSV | Photos + names + notes | Plate numbers + labels |
| Add one | Upload photo + form | Add plate + label |
| Save | Writes to server DB | Same |
| Export CSV | For IT backup | Same |
| Assign to operators | Permission checkbox | Same |

Industry parallel: Milestone **Match Lists** import/export; BriefCam **watchlist** tab with APPLY search.

---

## Roles (super-admin delegate)

| Permission | Face / ANPR |
|------------|-------------|
| `analyticsView` | See licensed tab + stack (scoped) |
| `analyticsAlertAck` | Acknowledge, dismiss, false positive |
| `analyticsAnalyse` | Run analyse on evidence clip |
| `analyticsWatchlistEdit` | Edit lists (or super-admin only at v1) |
| `analyticsExport` | Export clip + report |
| `analyticsAdmin` | License, ingest paths, edge endpoints |

Super-admin always has all. Settings → Users — same grid style as Evidence.

---

## Data model (one hit record)

```text
hitId, kind (face|plate), capturedAt, cameraId,
cropPath, fullFramePath?, confidence?,
watchlistId?, matchLabel?, matchStatus (unknown|watchlist|hotlist),
lat, lon, evidenceFileId?, videoOffsetSec?,
source (bwc_message|bwc_ftp|edge_sdk|vms_analyse),
status (new|ack|dismissed|false_positive),
draftNote?, ackBy?, ackAt?
```

History tab queries same store — nothing silently deleted.

---

## Tender / brochure wording

- *“Optional Face Recognition and ANPR modules present detections in a rolling operator stack with one-click access to video, map location, and case linkage.”*  
- *“Watchlist and hotlist matches trigger prominent alerts with standard acknowledge and export actions.”*  
- *“Ingest supports body-worn camera uploads, edge analytics, and VMS evidence — unified queue, dispatch-scoped visibility.”*

POC-6 minimum: BWC still → stack card → double-click → map + open evidence (even before full engine).

---

## MOB waves (unchanged risk order)

| MOB | Delivers |
|-----|----------|
| `mob-analytics-hub-shell` | Grey tab + license flags + empty stack UI shell with **disabled action bar labels** (shows future buttons) |
| `mob-analytics-ingest-stack` | BWC ingest → rolling stack + dismiss + detail pane + **all action buttons** |
| `mob-face-fr-watchlist` | Watchlist import/save/export + match popup |
| `mob-anpr-hotlist` | Plate stack + hotlist (parallel genre) |
| `mob-face-fr-analyse` | Evidence/upload analyse → stack |

**Last** in tender code order. **E0 shell** only if brochure needs screenshot this week.

---

## Operator SOP (one page)

1. Open **Analytics → Face** (or ANPR).  
2. Watch stack; **watchlist hits** pop forward.  
3. Double-click → review crop, clip, map.  
4. **Acknowledge** or **False positive**.  
5. **Add to case** or **Export clip** if needed.  
6. **Dismiss** clears stack item; **History** keeps record.

No FTP folder. No external app. No map checkbox.

---

Reply **`MOB-APPLY mob-analytics-hub-shell`** when you want the grey licensed tab + stack layout shell only (low risk).
