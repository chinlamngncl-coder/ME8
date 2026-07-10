# MOB DISC — Face FR (live · photo · ID · video · blacklist SOP)

**Status:** Design locked 2026-07-10 (photo/ID + person track on map).  
**Home:** Main nav **Analytics** → **Face recognition**.  
**Search:** `FR photo`, `ID blacklist`, `person track`, `map path`, `75%`, `FR SOP`

**Parent UX:** `MOB-DISC-ANALYTICS-STACK-UX.md` · **License:** `MOB-DISC-ANALYTICS-LICENSE-HUB.md`

---

## Can it be done?

**Yes.** Face recognition is fundamentally **face ↔ face** (embeddings), not “video only.”

| Job | Input A | Input B | Result |
|-----|---------|---------|--------|
| **Enroll blacklist** | ID photo / mugshot / capture | — | Gallery entry (up to ~5K) |
| **1:N search** | Live crop · still · video frame | Blacklist | Match % + alarm if ≥ threshold |
| **1:1 verify** | Probe photo (or crop) | One ID / dossier photo | Same person? true/false + score |
| **Offline video** | Popular video file | Blacklist (optional) | Crops → same stack / match path |

Video is **one source of faces**. Photos and ID images are **first-class**, often better for blacklist quality than a blurry live frame.

---

## Product shape (operator call — locked)

| Setting | Value |
|---------|--------|
| Watch set | Up to **32** online BWCs |
| Visible live | **4** tiles; rest rotate ~**20s** |
| Beside tiles | Rolling **face crops** (from live **and** photo/video jobs) |
| Blacklist | Up to **~5K** — enrolled from **ID / photo / capture**, not video-only |
| Match | Score ≥ threshold → **popup + sound + optional speech** |
| Threshold | Site tunable from **70%**; **person track / multi-sighting link uses ≥ 75%** (locked floor for map path) |
| Offline | **Image and video** allow-list |
| Ingest | Manual · FTP · dock · BWC face-plate · live |
| Engine | DeepFace + **Facenet or SFace** — **never VGG-Face** |
| **Person track** | Same face seen on **2+ BWCs/cameras** → map **path / range** using each hit’s GPS (reuse Route & GPS patterns) |

**Not in v1:** FR inside Operations `video-wall.js`; thousands of streams.

---

## Face recognition is multi-modal (locked)

```
                    ┌─────────────────┐
                    │  Blacklist / ID │  enroll: ID photo, mugshot, capture
                    │  gallery ≤ 5K   │
                    └────────┬────────┘
                             │ 1:N
   Live 4-tile ──detect──┐   │
   Still / photo ────────┼───┼──► Match? → alarm
   Video file ──sample───┘   │
                             │
   Probe photo ──── 1:1 ─────┴──► Verify vs one ID (optional desk tool)
```

### A — Blacklist enrollment (ID & photos)

| Source | Use |
|--------|-----|
| **ID / document photo** | Primary enroll — front-facing, good light |
| **Mugshot / agency photo** | Same |
| **Operator capture** | Webcam or paste still (lab/POC) |
| **Crop from evidence** | “Add this face to blacklist” from a hit or offline job |
| **CSV + photo folder** | Bulk import (name, idNumber, photo path) — IT SOP |

**Per entry (minimum):** display name · optional ID number / case ref · photo · enrolled by · time · notes.  
**Cap:** soft warn near 5K; hard stop at configured max.

### A2 — Enroll photo quality gate (locked) — no blur miracles

Blacklist enroll is **strict**. A bad gallery photo poisons every later match.  
**Reject before embedding** if any rule fails. Operator message only — no “we’ll try anyway.”

| Rule | Locked minimum (v1) | Why |
|------|---------------------|-----|
| **Formats** | JPEG / PNG only | Same as Verify |
| **File size** | **≥ 30 KB** and **≤ 20 MB** | Tiny files = junk/thumbnail; huge = abuse |
| **Image min edge** | **≥ 480 px** (both width and height ≥ 320; smaller edge ≥ 480) | Reject thumbnails — UI says “low-resolution”, never “short side” |
| **Exactly one face** | Detector finds **1** face | 0 → `fr.no_face`; 2+ → `fr.multi_face` (crop or re-shoot) |
| **Face box min edge** | **≥ 160 px** (hard) | ICAO-inspired / Facenet-aligned gallery floor (not passport-certified) |
| **Face area vs image** | Only if face &lt; 160 would apply; with 160 hard min, **absolute face size wins** | No more “huge photo, OK face, fail 4%” |
| **Sharpness** | Laplacian on face crop — hard reject only **&lt; 25** | Only mush / motion smear (`MOB-DISC-FR-ENROLL-SOFT-QUALITY`) |
| **Pose / front** | Prefer frontal; extreme profile → reject when detector confidence low | Side-of-head enrolls fail in the field |
| **Lighting** | Face crop mean luma — hard reject only **&lt; 15** or **&gt; 245** | Near black / blown only |

**UI must show before upload (Blacklist tab helper text):**  
“Use a clear, front-facing ID or mugshot. The face should fill much of the frame. A large file is not enough if the face is tiny in the picture.”

**Client pre-check (nice):** read width/height + file size in browser → block before POST when **valid** dims are under min (never treat 0×0 as too small).  
**Server + sidecar = source of truth:** Node checks dims/size (JPEG header up to 1 MB); sidecar checks face count, face box px, sharpness. Never trust client alone.

**Not the same as live probes:** Live / FTP / offline frames may be softer. **Enroll stays hard** — that is intentional.

**Env knobs:**  
`FM_FR_ENROLL_MIN_SHORT=480` · `FM_FR_ENROLL_MIN_FACE_PX=160` · `FM_FR_ENROLL_MIN_SHARPNESS=25` · `FM_FR_ENROLL_MIN_BYTES=30000`  
See also `MOB-DISC-FR-ENROLL-FALSE-SMALL.md` · `MOB-DISC-FR-ENROLL-SOFT-QUALITY.md`.

### B — Probe matching (what we compare *against* the list)

| Probe | How |
|-------|-----|
| **Live BWC** | Frame → detect → crop → 1:N |
| **Captured / uploaded photo** | Detect → 1:N (or 1:1 if user picks one dossier) |
| **Offline video** | Sample frames → crops → 1:N |
| **FTP / dock / BWC still** | Same as photo once in inbox |

**Rule:** Same match engine and same alarm path for all probes. UI must not imply “FR = video only.”

### C — 1:1 desk verify (nice for SOP / POC)

Separate small tool under Face: **Verify two photos** (e.g. ID vs field capture) → match true/false + %.  
Does not require live cameras. Strong for tender demo and booking desk.

---

## Analytics → Face — tabs & protocols (UI logic)

Shell today is one Face panel. **Target IA** when engine ships (sub-tabs or clear sections — every screen has a next action):

```
Analytics · Face recognition
├── Live watch     ← 4 tiles + 32 picker + crop rail (live probes)
├── Inbox          ← FTP / face-plate / uploads waiting (photo + video)
├── Blacklist      ← enroll ID/photos, search, import/export, 5K count
├── Verify 1:1     ← two images → score (desk / POC)
├── Offline job    ← pick image or video → progress → results in stack
├── Person track   ← multi-BWC sightings → map path / range (≥ 75%)
└── Alerts         ← match history, ack/dismiss, export (or shared with stack)
```

| Tab / area | Protocol (SOP) | Must always offer |
|------------|----------------|-------------------|
| **Live watch** | Select ≤32 → system fills 4 slots → rotate → crops appear | Start/Stop watch · Pin cam to slot · Open blacklist on match |
| **Inbox** | New stills/videos land here first (or auto-analyse if admin on) | Analyse · Dismiss · Open file · Add face to blacklist |
| **Blacklist** | Enroll only with clear photo + name; dual-control optional later | Add · Edit · Disable · Import · Export · Count |
| **Verify 1:1** | Two images, one result; log who ran verify | Run verify · Clear · Save result to audit |
| **Offline job** | Allow-list formats only; show progress; cancel | Start · Cancel · Send crops to stack · Add to blacklist |
| **Alerts / stack** | Match ≥ threshold → popup + sound + optional speech | Ack · Dismiss · Open live/map · **Open person track** · Link case · Export |
| **Person track** | Cluster sightings of same person (blacklist ID or probe cluster) across cams | Open map · Time range · Export points · Jump to hit |

**Dead-end ban:** no panel that only “shows” without Save / Ack / Analyse / Dismiss.

---

## Person track / trace on map (locked) — can it be done?

**Yes.** ME8 already has **BWC GPS** (`last-gps`, gps-track append) and **Evidence → Route & GPS** (`RouteTrace`, `/api/gps-track/route`). FR does not invent a new map stack — it **joins face hits to location at capture time**, then draws a **person path**.

### Idea (your call)

1. Officer A’s BWC captures a face (live / still) → hit stored with **camId, time, crop, score, lat/lon** (from that BWC’s GPS at or near hit time).  
2. Officer B / C (or fixed cam with location) captures the **same** person later → another hit.  
3. If scores are **≥ 75%** (to blacklist ID **or** to each other in a cluster), system **links** them into one **person track**.  
4. Map shows **pins per sighting** + **polyline** (order by time) and optional **range ring** (e.g. convex hull or radius around path).  
5. Operator opens track from alert: “Seen on 3 devices — show path.”

### Why 75% for linking (not 70%)

| Use | Floor |
|-----|--------|
| Single match alarm (popup) | Site setting, **≥ 70%** allowed |
| **Link into person track / map path** | **≥ 75%** hard floor — fewer false paths across officers |

Admin may set alarm threshold higher (e.g. 80%); track link never goes **below 75%**.

### Data each sighting must store

`hitId, personKey (blacklistId or clusterId), camId, deviceLabel, ts, score, lat, lon, gpsQuality, cropRef, source (live|photo|video|ftp)`

No GPS → hit still in stack; **omit from map path** (or show in list as “no location”) — do not invent coordinates.

### Map UX (reuse, don’t fork)

- Prefer **embed or deep-link** into existing map / Route Trace style (Leaflet already in ops).  
- Person track view: timeline of crops + map line; click pin → that hit detail.  
- Optional: “Show range” = buffer around path or circle covering all points.  
- **Dispatch scope:** only cams the operator can see (same as SOS/map scope).

### SOP add-on

10. **Multi-sighting** — After 2+ linked hits (≥ 75%), open **Person track** → confirm path on map → Ack / case / share with TOC.  
11. **No GPS** — Still use photo stack; do not claim a map track until ≥ 2 located hits.

### Limits (honest)

- Path quality = GPS quality (urban canyon, stale last-gps).  
- v1: link by **blacklist ID** first (clearest); **unidentified cluster** (same face, no enroll) = phase 2.  
- Fixed cameras need a configured site lat/lon to join the path.

---

## Operator SOP (short — ship with module)

1. **Enroll** — Super-admin (or granted role): Blacklist → Add from ID/photo → confirm face box → Save.  
2. **Threshold** — Set ≥70% (site default 75–80); document in site runbook.  
3. **Live shift** — Pick up to 32 online BWCs → Start watch → monitor 4 tiles + crop rail.  
4. **On alarm** — Popup: confirm face visually → Ack (working) or Dismiss (false) → optional case link.  
5. **Photo check** — Inbox or Offline: drop field photo / ID scan → Analyse → review matches.  
6. **1:1** — Booking desk: ID photo + live capture → Verify → record result.  
7. **FTP / dock** — Ensure device/FTP path configured; treat face-plate stills as Inbox, not a raw folder.  
8. **Mute** — Header voice mute / Alerts & voice settings apply; custom alarm sound optional.  
9. **Privacy** — Blacklist and probes are sensitive; access by role; audit enroll / match / export / delete.  
10. **Person track** — When the same person is hit on **2+** BWCs/cams at **≥ 75%**, open map path; verify before acting.  
11. **No GPS** — Use crop stack only; map path needs located hits.

---

## Operator error catalog (Verify 1:1) — locked

Stable API `code` → operator sentence (i18n). Engine/stack details stay in audit log only.

| Code | Operator text |
|------|----------------|
| `fr.not_licensed` | Face recognition is not licensed on this server. |
| `fr.service_down` | Face matching is not available. Ask your administrator to start the face recognition service. |
| `fr.need_two` | Select two photos to compare. |
| `fr.no_face` | No face found in one or both photos. Use a clear, front-facing picture. |
| `fr.multi_face` | More than one face was found. Use a photo with only one person, or crop to a single face. |
| `fr.quality_low` | Photo quality is too low for a reliable check. Try a sharper, well-lit image. |
| `fr.face_too_small` | The face in this photo is too small. Crop closer so the face fills more of the picture, then try again. |
| `fr.image_too_small` | This photo is too low-resolution. Use a clearer, larger photo (at least about 480×480 pixels). |
| `fr.busy` | Face matching is busy. Wait a moment and try again. |
| `fr.bad_file` | This file type or size is not supported. Use JPEG or PNG (30 KB–20 MB). |
| `fr.timeout` | Face matching took too long. Try again with smaller photos. |
| `fr.failed` | Face matching could not complete this check. Try again or contact your administrator. |
| `fr.network` | Could not reach the server. Check your connection and try again. |

Success: **Match** / **No match** · score %.  
Enroll uses the same codes; reject = no gallery row written.

---

## Enroll vs probe quality (summary)

| | **Blacklist enroll** | **Live / inbox / offline probe** |
|--|----------------------|----------------------------------|
| Pixel / face size | **Hard reject** under mins | Soft — may still detect |
| Blur | **Hard reject** | May miss or low score |
| Multi-face | **Reject** | Pick largest / all crops |
| Operator expectation | “Good ID photo or no enroll” | “Best effort on field video” |

---

## Alerts — sound + speech

| Channel | Behaviour |
|---------|-----------|
| **Popup** | Crop, %, blacklist name, source, Ack / Dismiss |
| **Alarm sound** | Default chime; **custom upload** (WAV/MP3, capped) |
| **Speech** | Optional TTS via existing voice alerts — “Speak face matches” |
| **Mute** | Header mute silences speech; sound follows site setting |

Match works with sound and/or popup alone if speech is off.

---

## Offline formats (popular only)

| Kind | Allow-list |
|------|------------|
| **Video** | `.mp4`, `.mov`, `.avi`, `.mkv` |
| **Image** | `.jpg` / `.jpeg`, `.png`, `.webp`, `.bmp` |
| **Reject** | Clear message — do not silently fail |

Size / duration caps so one job cannot stall the sidecar.

---

## FTP / dock / BWC → same inbox

| Source | Enters as |
|--------|-----------|
| Manual upload | Inbox / Offline job |
| FTP | New image/video → Inbox |
| Dock | Catalog / FTP → optional Send to FR or tagged folder |
| BWC `face-plate` | **First-class Inbox** stills |
| Live | Crop rail (not Inbox unless saved) |

One queue → same crops → same blacklist alarms.

---

## Reality check — tools, OSS, and toy risk (2026-07-10)

**Purpose:** Do **not** treat the FR vision as “already done because DeepFace exists.” This section separates **have / need / hard / defer** so we do not ship a demo toy.

### Verdict (plain)

| Scope | Honest call |
|-------|-------------|
| **Photo + ID blacklist + 1:1 verify + offline image** | **Real product path** with DeepFace (Facenet/SFace) + our UI — **if** we store embeddings properly and soak-test |
| **Offline popular video → crops → match** | **Doable** (ffmpeg sample + same engine) — slower; needs caps |
| **Live 4-tile + detect + match** | **Doable but harder** — needs a **dedicated frame-grab path**; not “hook DeepFace to jsmpeg and hope” |
| **5K blacklist 1:N** | **OK at 5K** only with **precomputed embeddings + vector search** — naive `DeepFace.find` on a photo folder is **toy/slow** |
| **Person track on map (2+ BWCs, ≥75%)** | **Doable** with existing GPS + Leaflet — quality = GPS quality; not a new analytics vendor |
| **“Genetec-class always-on FR”** | **Not** what this OSS stack is — do not sell that |

### What we already have (no new purchase)

| Piece | In ME8 today |
|-------|----------------|
| Analytics shell + license gate | Yes (shell MOB) |
| BWC GPS + route APIs + map (Leaflet) | Yes — person track **joins** hits to GPS |
| Voice alerts / TTS / header mute | Yes — extend for face match |
| Alarm sound (default + custom file) | Browser audio — **no new OSS** |
| YuNet face **detect** sidecar (redact) | Scaffold — detect only, not recognize |
| LGPL ffmpeg | Yes — sample video / optional JPEG extract |
| FTP / face-plate ingest | Partial — stills land; **not** wired to FR queue yet |

### What we must add (open source / runtime) — not optional for non-toy

| Item | License (typical) | Why |
|------|-------------------|-----|
| **Python 3** + venv on server | — | Sidecar host |
| **DeepFace** | MIT | Wrapper |
| **Facenet or SFace weights** | MIT / Zoo | Embeddings — **pin model; never VGG-Face** |
| **TensorFlow / Keras** (or DeepFace’s pinned stack) | Apache-2.0 | Heavy; version-pin in requirements |
| **NumPy** (+ optional **faiss-cpu** later) | BSD / MIT | 5K search must be **vectors**, not re-read JPEGs every time |
| **OpenCV** | Apache-2.0 | Detect / decode (already in redact track) |
| **FastAPI + uvicorn** | MIT / BSD | Local REST to Node |
| **Persistent gallery store** | Our JSON/SQLite | `personId → embedding[] + metadata` — **we build this** |

**Not required for v1 POC:** Milvus, Weaviate, paid FR SDK. GPU optional on demo PC; recommended on production server for live 4-stream.

### Hardware stance (operator — locked 2026-07-10)

| Context | Expectation |
|---------|-------------|
| **Demo / lab** | **PC is fine** — photo/ID, 1:1, still 1:N, offline image; light live OK. Do not block design on rack hardware. |
| **Real deployment** | **Proper server** (4 FR slots + TF sidecar + Node). GPU recommended for sustained live FR; ship desk notes minimums when packing. |

Same software path for both — demo proves workflow; server carries load. Not a second toy codebase.

**Do not add casually:** random “face-api.js in browser” for blacklist — weak, wrong place, license/model mess.

### Critical engineering gaps (where toys are born)

1. **Live frames for FR**  
   Ops wall is **mpeg1 / jsmpeg** for viewing. DeepFace needs **clean stills** (JPEG/RGB).  
   **Must build:** analytics-only grab (e.g. ffmpeg periodic JPEG from the same RTP/pool, or sidecar decode) — **4 slots max**.  
   **Toy path:** screenshot the browser tile or parse mpeg1 in JS for FR.

2. **5K gallery**  
   **Must:** `represent()` once at enroll → store float vectors → cosine/L2 search (NumPy fine at 5K; faiss if slow).  
   **Toy path:** `DeepFace.find(db_path=folder)` every probe (known slow/fragile at thousands).

3. **Score “75%”**  
   Models output **distance**, not marketing %. We must **calibrate** a mapping and document it; soak with real BWC faces.  
   **Toy path:** fake percentage without calibration.

4. **Ship burden**  
   Customer pack needs Python + wheels + model files (or installer script). TF is large.  
   **Demo on PC is OK** (operator stance). **Toy path:** never packaging the sidecar for the real server install.

5. **Accuracy expectations**  
   Facenet/SFace ≠ dedicated police FR. Expect misses, twins, angle/light failures. SOP: **human confirm on alarm**.  
   **Toy path:** auto-dispatch on match with no Ack.

6. **Person track**  
   Needs lat/lon **on the hit** (BWC GPS at time). Stale GPS → wrong line.  
   **No extra OSS** — but **not magic**; v1 = blacklist-linked hits only.

### Minimum stack to call it “real” (not toy)

| Tier | Includes | Call it |
|------|----------|---------|
| **A — Desk / POC** | Enroll ID photos · 1:1 verify · 1:N on stills · offline image · alarm popup+sound+speech · audit | **Shipable module slice** |
| **B — Field useful** | A + offline video allow-list + FTP/face-plate inbox + calibrated threshold | **Tender-credible** |
| **C — Live watch** | B + **4-slot frame grab** + rotate 32 + crop rail | **Real live FR** (after soak) |
| **D — Map track** | C + multi-hit ≥75% + map polyline | **Complete vision** |

**Recommendation:** Build **A → B** before promising **C/D** in a customer demo. Shell UI alone is not FR.

### Extra “analytics products”?

| Need? | Answer |
|-------|--------|
| Paid VMS FR plugin | **No** for this plan |
| Separate BI/analytics suite | **No** |
| Vector DB (Milvus etc.) | **No** at 5K; revisit at 50K+ |
| GPU | **Demo PC: optional; production server: plan for NVIDIA if selling live FR** |
| More map libraries | **No** — Leaflet enough |

### What we should tell ourselves (and the customer)

- This is an **optional licensed module** with an **OSS engine**, not a guarantee of forensic-grade ID.  
- Live FR cost is **engineering + hardware**, not “pip install and done.”  
- Person track is **GPS + face links**, not indoor RTLS.

---

## Capacity & config (planned)

- Ops wall: **~8 live** unchanged.  
- FR: **4** decode slots; watch set **32**.  
- `FM_FR_WATCH_MAX`, `FM_FR_LIVE_SLOTS`, `FM_FR_POLL_SEC`, `FM_FR_BLACKLIST_MAX`, `FM_FR_MATCH_MIN`  
- Alarm / custom sound under site storage (not secrets).  
- Voice: extend existing `ss-voice-*` with face-match flag.

---

## Build order

1. **`mob-fr-analytics-shell`** — nav + layout + license grey (**done**)  
2. **`mob-fr-sidecar-offline`** — Facenet/SFace FastAPI + **Verify 1:1** UI (**done**)  
3. **`mob-fr-blacklist-enroll`** — ID/photo enroll, embeddings store, list/disable/remove (**done**)  
3b. **`mob-fr-enroll-quality-gate`** — enforce A2 (dims, face px, sharpness, multi-face) on enroll + UI helper (**done**)  
3c. **`mob-fr-enroll-false-small`** — industry cutoffs (face ≥160), JPEG SOF 1MB, plain English (**done**)  
3d. **`mob-fr-enroll-soft-quality`** — Laplacian/luma hard floors softened (**done** — `MOB-DISC-FR-ENROLL-SOFT-QUALITY.md`)  
4. **`mob-fr-live-4tile-poll`** — 4 streams + rotate (**done** — video tiles only; detect = later)  
5. **`mob-fr-blacklist-alarm`** — live frame grab + detect + crop rail + 1:N + popup/sound/speech (**done**)  
6. **`mob-fr-ftp-inbox`** — FTP / face-plate / dock → Inbox  
7. **`mob-fr-person-track-map`** — multi-sighting link (≥ 75%) + map polyline / range (reuse GPS track)

---

## Legal (when engine ships)

Legal Notices: DeepFace (MIT) + Facenet/SFace + stack attribution.  
Privacy / biometrics SOP (who may enroll ID photos, retention, export, **person tracks**) — separate from OSS credits.

---

## Bottom line

| Question | Answer |
|----------|--------|
| FR only for video? | **No** — live, **photos**, **ID enroll**, offline video, FTP stills |
| ID for blacklist? | **Yes** — primary enroll path |
| Blurry / tiny enroll photo? | **No** — hard quality gate (A2); reject, do not embed |
| Photo matching? | **Yes** — 1:N and 1:1 |
| Trace / track on map? | **Yes** — join hits to BWC GPS; line + pins when **2+** sightings at **≥ 75%**; reuse Route & GPS |
| Nice UI + SOP? | **Yes** — sub-areas above; every screen has an action; short operator SOP in this doc |
