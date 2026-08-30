# Ubitron Global Master Blueprint — Mobility Axiom

**Version:** V2 (MOB-SPEC UBITRON-MASTER-BLUEPRINT-V2)  
**Status:** MEMORY LOCK — whole-platform scope  
**Date:** 2026-08-28  
**Company:** Ubitron Global  
**Product:** Mobility Axiom (internal codebase: ME8)

This document is the **single architectural and documentation index** for the entire Mobility Axiom platform. No feature MOB may contradict it without explicit product-owner override.

**Desktop workspace (manuals + internal tools, outside ME8 repo):**

```
C:\Users\user\Desktop\UBITRON-Global-Platform-Manuals\
```

---

## 0. Platform identity (locked)

| Item | Rule |
|------|------|
| Customer name | **Mobility Axiom** |
| Vendor | **Ubitron Global** |
| Video stack | **WVP / ZLM** — primary live path; finish FLV handoff, do not park |
| Live player | `window.AxiomFlvManager.attach()` only |
| Air-gap license | Ed25519 `license.lic` — existing `tools/generate-license.js` + internal CRM (update, do not replace) |

---

## 1. Licensing and capacity logic

### 1.1 Dual pools

Two **independent** license counters:

| Pool | Field | Counts |
|------|-------|--------|
| BWC | `maxBwcDevices` | Registered body-worn cameras |
| Fixed | `maxFixedCameras` | Standalone IP cameras **+** NVR channels |

BWC and fixed pools **never** share capacity.

### 1.2 Unified fixed pool (locked)

**NVR channels and standalone IP cameras draw from the same `maxFixedCameras` pool.**

```
fixedPoolUsed = standalone_fixed_cameras + sum(active_nvr_channels)
```

- A 32-channel NVR consumes **32** fixed slots.
- Parent NVR row alone does not count; **each enabled channel** counts.
- Freeing slots: delete/disable channel rows.

**Base-8 sales strategy** (CRM presets — not hardcoded in product):

| Tier | `maxFixedCameras` | Label |
|------|-------------------|--------|
| Free | **16** | Pilot / small site |
| Tier 1 | **64** | Municipal / mid enterprise |
| Tier 2 | **128** | Large enterprise |
| Custom | **Any integer** | Enterprise (CRM free-form input) |

BWC tiers sold separately via `maxBwcDevices` with same CRM pattern.

### 1.3 Pre-flight software gates (locked)

| Rule | Behavior |
|------|----------|
| **When** | Add fixed cam, add NVR + channels, ONVIF discover commit, CSV import |
| **Check** | `currentFixedUsed + newChannels > maxFixedCameras` → **reject** |
| **NVR** | Block **before** partial DB write (single transaction) |
| **API** | HTTP 403 — `{ error: "limit_reached", context: "devices" }` |
| **UI** | Soft modal — *Contact Ubitron Global to upgrade* (`LicenseEntitlementsUi`) |
| **Never** | Preemptively disable **Add** / **Save** buttons |

BWC saves use parallel pattern on `maxBwcDevices` (`checkBwcCapacity`).

**Runtime anchors:** `lib/licenseManager.js`, `lib/licenseEntitlementsMw.js`, `lib/platformLimits.js`, `public/js/license-entitlements-ui.js`.

**Track 4 (queued):** Update existing air-gapped CRM HTML — base-8 presets + enterprise custom integers on current generator.

---

## 2. Internal hardware sizing calculator

Standalone **HTML/JS** for internal tech and sales only — **not** in customer ship pack.

| Location | Purpose |
|----------|---------|
| `C:\Users\user\Desktop\UBITRON-Global-Platform-Manuals\Tools\Hardware-Sizing-Calculator\` | Calculator deliverable (Track 5) |
| Authority | This blueprint §2 + Vol 5 manual |

### Inputs

Total camera/channel count, 1080p/4K mix, BWC count, GPS ping rate, AI inference (edge vs server), Command Wall monitor count.

### Physics outputs

| Domain | Rule |
|--------|------|
| **Network ingress** | ~4 Mbps per 1080p channel; scale 4K ~2.5–3×; **>250 channels → recommend 10 GbE** (else 1 GbE with headroom warning) |
| **ZLM RAM** | OS base + ~64–128 MB per concurrent live channel + decode headroom per wall tile |
| **GPU compute** | TensorRT/YOLO when server-side AI on; streams-per-GPU estimate by resolution |
| **Storage IOPS** | Sustained NAS write for `-c copy` ingest **plus** random read for VMS multi-cam scrubbing |

Air-gapped browser; no Node server required.

---

## 3. VMS Investigation module (core dev scope)

**Track 2 — next product engineering track after this lock.**

| Capability | Detail |
|------------|--------|
| **Sync timeline** | HTML5 scrubber, **1–4 channels** on one clock |
| **Metadata pins** | AI alerts (Face, Weapon, ANPR), BWC SOS/fall, ONVIF/VMS alarms on scrubber track |
| **Overlays** | Client-side **Canvas** bounding boxes — no live FFmpeg burn-in |
| **Export** | `-c copy` segment export + **WebVTT** / **JSON** metadata sidecars |
| **Spatial** | Adjacent-camera handoff from map during suspect tracking (adjacency graph MOB) |

**Entry today:** Control Room popout `/vms-investigation.html`. Main nav tab = separate MOB (`UI-NAV-INVESTIGATION-TAB-V1`).

---

## 4. Master documentation index (mandatory manual scope)

All final customer and partner manuals **must** cover the volumes below. Draft workspace on desktop:

```
C:\Users\user\Desktop\UBITRON-Global-Platform-Manuals\
├── Vol-01-Operations\
├── Vol-02-Field-BWC\
├── Vol-03-Analytics\
├── Vol-04-Investigation\
├── Vol-05-Engineering-Commercial\
└── Tools\
    └── Hardware-Sizing-Calculator\
```

### Vol 1 — Operations

| System | Manual must cover |
|--------|-------------------|
| Command Wall | Multi-monitor layout, FLV lifecycle, display-room launch |
| Spatial / AR Overwatch | Spatial map, popout mode, pin video mirror rules |
| Tactical | POI / BWC grab zones, overwatch permissions, blueprint |
| CAD/RMS | Integration surface, module lock / upsell when unlicensed |

### Vol 2 — Field / BWC

| System | Manual must cover |
|--------|-------------------|
| BWC SIP telemetry | Registration, SIP server IP rules (numeric only on device) |
| SOS / Fall pipelines | Banner, acknowledge, PTT team, ledger scope |
| Smart GPS | Track points, map markers, geofence interaction |

### Vol 3 — Analytics

| System | Manual must cover |
|--------|-------------------|
| Face Recognition | Live watch, alarms, enrollment, license gate |
| ANPR | Fast-path vs heavy-path, blur gate, history |
| Weapon Detection | Live watch, alarm workflow, license gate |

### Vol 4 — Investigation

| System | Manual must cover |
|--------|-------------------|
| Sync timeline | Multi-cam playback, playhead, seek limits |
| AI metadata mapping | Scrubber pins, click-to-seek, module colors |
| Evidence Hub export | Chain of custody, redaction, export formats |

### Vol 5 — Engineering / Commercial

| System | Manual must cover |
|--------|-------------------|
| ONVIF / NVR auto-discovery | Probe, channel commit, unified fixed pool |
| Sizing calculator physics | §2 formulas, 1 GbE vs 10 GbE guidance |
| Base-8 licensing | Dual pool, tier table, enterprise custom |
| Air-gapped CRM operations | HWID, sign, install `license.lic`, audit — **existing** generator only |

**Forbidden in customer-facing manuals:** internal MOB names, Cursor, ME8/C2 as product name, absolute server paths, private keys, WSL 172.x as server IP.

---

## 5. Development roadmap (locked sequence)

| Track | Deliverable | Status |
|-------|-------------|--------|
| **1** | This blueprint V2 + desktop folder lock | **DONE** |
| **2** | VMS Investigation player + timeline | **Next code** |
| **3** | Licensing gates — NVR unified pool pre-flight | Queued |
| **4** | CRM HTML — base-8 + enterprise fields on existing generator | Queued |
| **5** | Hardware sizing calculator (desktop Tools folder) | Queued |
| **6** | Vol 1–5 professional manuals (desktop workspace) | Queued |

### What to do next

1. Product owner **PASS** on V2 lock.  
2. **`MOB-APPLY`** Track 2 first slice — Investigation timeline shell + 1-channel sync playback.  
3. Track 3 in parallel when NVR demos need pool enforcement.  
4. Track 4 = CRM update only (generator already built).  
5. Manuals and calculator stay on desktop — never mixed into ME8 ship tree.

---

## 6. Code cross-reference

| Concern | Location |
|---------|----------|
| License signer | `tools/generate-license.js` |
| Entitlements | `lib/licenseManager.js`, `GET /api/license/entitlements` |
| NVR registry | `lib/nvrRegistry.js`, `db/migrations/029_nvr_devices.sql` |
| Fixed cams | `lib/fixedCamRegistry.js`, `public/js/fixed-cams-ui.js` |
| BWC registry | `public/js/bwc-devices.js`, `POST /api/bwc-devices` |
| Investigation popout | `public/vms-investigation.html` (and related JS) |
| Alarm markers | `lib/vmsAlarmLogger.js` |

---

*End of Ubitron Global Master Blueprint V2 — memory lock complete.*

---

## 7. Consolidation lock (MOB UBITRON-MASTER-CONSOLIDATION-AND-AUDIT — 2026-08-28)

### 7.1 Universal Slot Licensing (selective provision)

- Fixed camera capacity is **one pool**: standalone IP cams + **enabled/provisioned** NVR channels.
- Operators may **uncheck empty ONVIF channels** before save so they do **not** consume Universal Slots (`enabled: false` → no child fixed cam).
- Legacy V1 NVRs without child cameras are **auto-provisioned silently** at site DB bootstrap (`ensureLegacyNvrChildrenProvisioned`) — no forced re-save.

### 7.2 Dual-Pool Isolation

| Pool | License field | Independence |
|------|---------------|--------------|
| Fixed | `maxFixedCameras` | Never borrows from BWC |
| BWC | `maxBwcDevices` | Never borrows from Fixed |

Capacity math: allow only when `Current + New ≤ Max`. **No hardcoded product ceiling** — enterprise custom integers (e.g. 1280+) are valid when signed into `license.lic`.

### 7.3 Fail-closed Free Tier

If `license.lic` is **missing or invalid**, runtime defaults to Free Tier — **never** unlimited / 5000 lab-open for capacity:

| Cap | Free Tier |
|-----|-----------|
| Fixed | **16** |
| BWC | **10** |

Feature flags also fail closed to Free Tier map (analytics / VC / overwatch / CAD off unless signed).

**Anchors:** `lib/licenseManager.js` (`FREE_TIER`, `checkFixedCamLimit`, `checkBwcLimit`), `lib/platformLimits.js` (reads same pools).

### 7.4 Air-gapped CRM and hardware sizing

| Tool | Location | Role |
|------|----------|------|
| Sizing + field hints | `tools/license-generator.html` | Base-8 (16/64/128) + custom Fixed/BWC; live Network/RAM/IOPS; **Copy Hardware Specs** |
| Signing | Vendor LicenseIssuer (outside ME8 ship) | Ed25519 `.lic` — private key never in customer pack |

Physics (CRM calculator):

- Network Mbps = `(Fixed × 4) + (BWC × 2)`
- RAM GB = `16 + (Fixed × 50 MB)`
- IOPS: warn **NVMe** when Fixed **> 64**

### 7.5 Enterprise clustering and HA (architecture target)

| Concept | Rule |
|---------|------|
| Roles | **Command Node** (ops UI/API/auth) vs **Media Workers** (ZLM / RTSP ingest) |
| Heartbeat | 5-second node heartbeat |
| Balance | Dynamic load balancing of live streams across workers |
| Failover | Auto-failover RTSP subscriptions when a Media Worker dies |

**Code status:** design locked here; `vms_cluster_nodes` registry **not yet implemented** (see Missing & Stubbed audit).

### 7.6 Federated VMS playback

| Item | Rule |
|------|------|
| Day query | `GET …/timeline?date=YYYY-MM-DD` |
| Timezone | Client `tzOffset` (minutes) via global fetch interceptor — server builds local-day UTC bounds |
| Storage tiers | Strict ENUM `tier_type`: `local_edge` \| `nvr_hdd` \| `nas_archive` on `vms_storage_volumes` |
| Timeline payload | Exposes `storageTier` label + `storageTierType` |
| Player sync | Pause / timeline click → hard `seek()` alignment on all tiles (frame-perfect vs keyframe drift) |

**Anchors:** `public/js/axiom-tz-fetch.js`, `lib/queryDateBounds.js`, `lib/vmsVolumeRegistry.js`, migration `031_vms_storage_tier_type.sql`, `public/js/vms-investigation-ui.js`.

### 7.7 Roadmap status refresh

| Track | Status after consolidation |
|-------|----------------------------|
| Blueprint + dual pool + Free Tier | **DONE** |
| Selective NVR channels + legacy auto-provision | **DONE** |
| Storage `tier_type` ENUM + federated date/tz | **DONE** |
| CRM sizing HTML in `tools/` | **DONE** (sign still vendor-external) |
| VMS forensic export / frame capture | **DONE** (prior MOB) |
| HA `vms_cluster_nodes` + worker failover | **NOT BUILT** |
| AI → `vms_alarm_markers` bridge | **NOT BUILT** |
| Vol 1–5 manuals | Desktop workspace — **queued** |

---

*Consolidation appendix — keep as ship-desk architectural record.*
