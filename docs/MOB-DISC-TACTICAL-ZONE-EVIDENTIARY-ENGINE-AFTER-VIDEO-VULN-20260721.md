# MOB DISC — Tactical Zone & Evidentiary Engine (locked future) · AFTER video + vuln

**Date:** 2026-07-21 ~01:14  
**Status:** LOCKED PAPER — **do not build now** · **no APPLY**  
**Operator:** Handed formal Product Architecture Document. *Take note. After MOB of all these video things, and the patching of vulnerable, then do this.*

---

## One-screen lock

| Rule | Meaning |
|------|---------|
| **What this is** | Future product: **Tactical Zone & Evidentiary Engine** on top of **UbitronC2 (Fleet)** + **WVP/ZLM** — not a replacement app |
| **When** | **Only after** (1) current **video / pin / WVP Fleet parity** MOBs are PASS, and (2) **vulnerability / security hardening** patching is done |
| **Now** | **Record architecture. Do not implement.** Do not open Tactical tab / Turf / vault / export code until operator says a named APPLY for this genre |
| **Must not** | Use this doc as an excuse to invent more pin/video patches, park WVP, or rebuild Fleet |

**Agent:** Finish video genre → vuln genre → **then** this genre. Not interleaved.

---

## Sequencing (operator order — locked)

```
NOW / NEXT (current lab)
  └─ Video / WVP handoff + Fleet UI parity
       (wall, pin mirror player-only, Command Wall, FR, dock storms, etc.)
       Restore Fleet baseline UX; WVP = paint pipe only
       STOP inventing pin patches

THEN
  └─ Vulnerability / security hardening
       (auth, export gates, tokens, known vuln patching — named MOBs when ordered)

ONLY AFTER BOTH
  └─ Tactical Zone & Evidentiary Engine  ← THIS DOCUMENT
       Module 1 Smart Perimeters
       Module 2 Zone Archiver / vault
       Module 3 AAR + Timeline Trimmer
       Module 4 Cryptographic evidentiary export
```

If agent proposes Tactical/Turf/export work while video still FAIL or vuln not ordered → **refuse** and point here.

---

## Product name (internal)

**Tactical Zone & Evidentiary Engine** — geospatial command + forensic export module.  
Industry positioning: automate Fleet/WVP actions from geo math; multi-tenant archive; Super Admin offline evidentiary pack.

**Stack plugs (do not destroy baseline):**

| Layer | Existing | New plugs into |
|-------|----------|----------------|
| Ops brain | **UbitronC2** / Fleet (`server.js`, sockets, RBAC) | Zone CRUD, Turf loop, archiver, export APIs |
| Video | **WVP/ZLM** handoff → `<video.me8-zlm-primary>` | Zone **entry** → existing `startPlay` / handoff path (no second player invention) |
| Voice | Fleet **TCP 29201** PTT (gtid 49) | Zone entry/exit → existing group inject/drop |
| Map (daily) | Ops Leaflet (dispatch) | **Do not clutter** — Tactical = **separate tab / map instance** |
| Evidence today | Fleet Evidence & Docking | AAR/export is **additive** vault + offline pack — not delete Evidence |

---

## Architecture (formal — as handed; preserved)

### System overview

Build on established **UbitronC2 (Fleet)** and **WVP/ZLM** video infrastructure.

Goals:

1. Automate legacy Fleet API calls (video handoff, PTT grouping) using real-time geospatial math  
2. Silently archive in a multi-tenant vault  
3. Cryptographically secure, offline evidentiary export for Super Admins  

---

### Module 1 — Live Geospatial Engine (“Smart Perimeters”)

**Frontend — Dedicated Tactical tab**

- Isolation: dedicated **Tactical UI** tab; **separate Leaflet map** (do not clutter daily dispatch)  
- Drawing: `Leaflet.draw` → GeoJSON polygons (Smart Perimeters) + radius circles (SOS Auto-Quarantines)  
- Socket: emit `create-tactical-zone` (GeoJSON + Incident ID) → **UbitronC2**

**Backend — UbitronC2 math engine**

- **Turf.js** in Node  
- Loop: every device GPS ping → `Turf.booleanPointInPolygon` vs active Tactical Zones  
- **Anti-corruption / automated execution (reuse Fleet+WVP — do not invent parallel media):**  
  - **Entry:** device enters polygon → UbitronC2 fires WVP `startPlay` handoff (mount wall `<video.me8-zlm-primary>`) + inject device into active Fleet TCP **29201** PTT group (**gtid 49**)  
  - **Exit:** teardown video + drop from PTT group  

---

### Module 2 — Tactical Time-Machine (Archiver)

- Background worker: **`ZoneArchiver`** listens to live GPS/status buffer (must not degrade live server)  
- Multi-tenant time-series vault (Agency A ⊄ Agency B)  
- Per incident: GeoJSON perimeter; GPS breadcrumbs of entrants; event ledger (`ENTERED`, `SOS TRIGGERED`, …)  
- Lifecycle: `ACTIVE` (live Turf) → `ARCHIVED` (locked) on Super Admin command  

---

### Module 3 — After-Action Review (AAR) & Timeline Trimmer

**AAR playback UI**

- Query vault; decrypt breadcrumbs in browser RAM  
- Ghost tracks on map; timeline scrub sync’d with archived WVP video  

**Timeline Trimmer**

- Dual-handle `[ Start ]` / `[ End ]`  
- Event heatmap spikes on ledger moments  
- FFmpeg surgical slice: `-c copy -ss … -to …` — **lossless copy only**; **no re-encode**  
- DB queries clamped to same window  

---

### Module 4 — Cryptographic Evidentiary Export Pipeline

- RBAC: **SuperAdmin** + secondary Evidentiary PIN/passphrase  
- Harvest: sliced FLV/MP4, clamped GPS JSON, offline map tiles for incident bbox  
- Inject into standalone **`View-Evidence.html`** (zero-install offline viewer)  
- Zip in RAM via `archiver` — **no temp raw files on disk**  
- Chain-of-custody PDF: timestamp, Admin ID, entry/exit table, **SHA-256** of archive  
- Encrypt zip stream: `crypto.createCipheriv` AES-256 with Super Admin passphrase  
- Native save: `showSaveFilePicker()` + `Content-Disposition` fallback  
- Audit receipt when local save completes  

---

## Guardrails (so agent does not destroy baseline)

| Do | Do not |
|----|--------|
| New **Tactical** tab + own Leaflet instance | Stuff polygons into daily Ops map as default clutter |
| Call **existing** WVP handoff / Fleet PTT on entry/exit | Second FLV on pin; new media stack; turn off `FM_WVP_VIDEO_HANDOFF` |
| Additive vault + export | Replace Evidence & Docking wholesale without APPLY |
| FFmpeg `-c copy` only for trim | Transcode “for convenience” |
| Zip/encrypt in memory | Write plaintext evidence blobs to disk mid-export |
| Multi-tenant isolation | Cross-agency vault reads |
| Code only after named **MOB-APPLY** for this genre | Start Turf/Tactical while video genre still open |

---

## Relation to tonight’s video work

- Current FAIL (pin / dock / handoff paint) stays under **video genre** — Fleet baseline + WVP player only.  
- This architecture is **ship-later capability**, not a workaround for pin black.  
- Do **not** mix Tactical MOBs into pin patching sessions.

---

## When operator opens this genre (later)

First APPLY will be named by operator, e.g. paper then:

1. `MOB-DISC` / schema for zones + vault (tenant keys)  
2. Tactical tab shell + Leaflet.draw (no auto play yet)  
3. Turf entry/exit → **existing** handoff + PTT hooks  
4. ZoneArchiver  
5. AAR + trimmer  
6. Export pipeline + SuperAdmin gate  

One MOB at a time. Same zero-change-without-APPLY rule.

---

## Bottom line

**Noted and locked.**  
**Tactical Zone & Evidentiary Engine = after video MOBs PASS + vulnerability patching done.**  
**Not now. Not instead of Fleet/WVP video parity. Not an excuse to invent pin patches.**
