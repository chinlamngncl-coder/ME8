# 06 — Open source & license audit (MOB DISC)

**Date:** 2026-06-27 — updated 2026-07-07  
**Scope:** Mobility C2 ship stack + ME8 enterprise pack  
**Baseline:** trial-gold-1.9 → ME8 Firmware Gold  

> **Not legal advice.** This is an engineering audit for discussion with Google / your counsel. Confirm commercial terms before customer contracts.

---

## Executive summary

| Verdict | Count |
|---------|-------|
| **OK for commercial use** (with notices) | Most of stack |
| **OK but fix attribution / usage rules** | OpenStreetMap tiles, Leaflet |
| **RESOLVED 2026-07-07** | ~~FFmpeg GPL~~ → LGPL vendor build; ~~Redis SSPL~~ → Valkey BSD |
| **Server-side only, not distributed** | MySQL in wvp Docker — GPL exposure minimal (see §4a) |
| **Pending before ship** | OSM attribution, Leaflet vendor copy, Legal Notices tab |
| **Not shipped in product** | Claude, Google APIs (dev/advisor only) |

---

## 1. Node.js dependencies (`package.json`)

| Package | License | Commercial use | Notes |
|---------|---------|----------------|-------|
| express | MIT | Yes | |
| socket.io | MIT | Yes | |
| ws | MIT | Yes | |
| dotenv | BSD-2-Clause | Yes | |
| xml2js | MIT | Yes | |
| ftp-srv | MIT | Yes | |
| livekit-server-sdk | Apache-2.0 | Yes | Preserve NOTICE if required |
| node-llama-cpp | MIT | Yes | Bundles llama.cpp (MIT) |
| **ffmpeg-static** | **GPL-3.0-or-later** | **Review** | See §3 — main compliance flag |
| sip (kirm/sip.js) | MIT (file in package) | Yes | `package.json` omits `license` field — ship `node_modules/sip/LICENSE` in notices |

**Planned enterprise MOBs:** `pg` (MIT), `ioredis`/`redis` (MIT) — client libs are fine; **server** choice matters (§4).

---

## 2. Browser / CDN scripts (`public/index.html`)

| Component | Source | License | Commercial use | Action |
|-----------|--------|---------|----------------|--------|
| **livekit-client** | jsdelivr CDN | Apache-2.0 | Yes | Vendor copy in `public/vendor/` for air-gap (optional MOB) |
| **Leaflet** | unpkg CDN | BSD-2-Clause | Yes | **Vendor locally** for offline installs |
| **leaflet.markercluster** | unpkg | MIT | Yes | Same |
| **jsmpeg.min.js** | `public/vendor/` | MIT (PhobosLab) | Yes | Already vendored |
| **socket.io.js** | served by server | MIT | Yes | |
| Your JS | `public/js/*` | Your copyright | — | |

### Trademark (LiveKit)

- **LiveKit** server + SDK are open source (Apache-2.0).
- **LiveKit Cloud** is a separate paid SaaS — you are **not** required to use it.
- Do **not** name your product “LiveKit” or imply official partnership; “Video conference (LiveKit-compatible)” in docs is fine.

---

## 3. FFmpeg — ✅ RESOLVED 2026-07-07

~~**Today:** `ffmpeg-static` npm package, license **GPL-3.0-or-later**~~

**Resolved:** `ffmpeg-static` removed from `package.json`. Replaced with a vendored LGPL static Windows build at `vendor/ffmpeg-lgpl/ffmpeg.exe` (BtbN/gyan.dev release-essentials, LGPL-only codec set).

| Topic | Detail |
|-------|--------|
| Old risk | GPL `ffmpeg-static` bundled in customer pack |
| Fix applied | `lib/resolveFfmpeg.js` now resolves `vendor/ffmpeg-lgpl/ffmpeg.exe` first; `ffmpeg-static` dependency deleted |
| LGPL compliance | No GPL-only codecs (no x264, x265, FDK-AAC). Bundling LGPL FFmpeg with a proprietary app is permitted. |
| Notices | `THIRD-PARTY-NOTICES.ship.md` updated — FFmpeg listed as LGPL 2.1+ |
| Verify | `VERIFY-ME8-FRESH.ps1` hard-fails if `ffmpeg.exe` missing from pack |

---

## 4. Redis / Valkey / MySQL (enterprise stack)

### PostgreSQL

| Item | Verdict |
|------|---------|
| License | PostgreSQL License (permissive, BSD-like) |
| Trademark | Say “PostgreSQL” / “Postgres” descriptively — OK; don’t use elephant logo as your logo |
| Commercial | **Yes** — standard enterprise choice |

### Redis vs Valkey

| Item | Redis CE 7.4+ | **Valkey** (recommended) |
|------|---------------|--------------------------|
| License | RSALv2 / SSPL dual | **BSD-3-Clause** (Linux Foundation fork) |
| API | Redis protocol | Redis-compatible |
| Concern | SSPL debated for some **hosted-DB vendors** | Clearer for OEM / on-prem ship |
| MOB DISC | | Use **`valkey/valkey`** in `docker-compose.enterprise.yml`, document as “Redis-compatible cache” |

**Using Redis as internal cache in your on-prem app** is commonly accepted even under SSPL, but **Valkey avoids the debate** for enterprise customers and Google review.

### SQLite (today)

| Item | Verdict |
|------|---------|
| License | Public domain |
| Commercial | **Yes** — no issue |

### MinIO / S3 (if archive MOB)

| Item | Verdict |
|------|---------|
| MinIO server | **AGPL-3.0** — review if you modify or expose as service |
| AWS S3 | Proprietary service — pay per use, no OSS issue |
| MOB DISC | Prefer **customer-owned S3** or unmodified MinIO with legal review |

---

## 5. LLM — Centre Summary (`lib/centreLlm.js`)

| Component | License | Commercial use | Notes |
|-----------|---------|----------------|-------|
| **node-llama-cpp** | MIT | Yes | |
| **llama.cpp** (underlying) | MIT | Yes | |
| **Qwen2.5-1.5B-Instruct GGUF** | Apache-2.0 (Alibaba) | Yes | Default ship model — `vendor/llm/` |
| **Qwen2.5-3B / 72B GGUF** | Qwen Research License | **No** | Blocked by `centreLlm.js` for commercial ship |
| **“Qwen” trademark** | Alibaba | Don’t brand product as Qwen | “Local AI assistant” / “Centre Summary” |
| **FM_LLM_AUTO_DOWNLOAD** | Hugging Face URL | OK for lab | Ship **bundled** `vendor/llm/*.gguf` for customers (no HF ToS surprise) |

**Claude / Google / OpenAI** — used in **development and review only**, not bundled in Mobility server. **No license issue in shipped product.**

---

## 6. Maps — OpenStreetMap & Leaflet

### Leaflet (library)

- **BSD-2-Clause** — free commercial use.
- **Problem today:** CSS hides attribution control:

```css
.leaflet-control-attribution { display: none !important; }
```

| Issue | Severity | Fix (MOB later) |
|-------|----------|-----------------|
| Hidden OSM/Leaflet credit | **Compliance** | Show attribution (corner strip) or custom “© OpenStreetMap contributors” |
| Using `tile.openstreetmap.org` in production | **Usage policy** | OSM forbids heavy commercial tile load on free tier |
| Fix | | Self-host tiles (`lib/gisOffline.js`, PMTiles) or paid tile provider (MapTiler, etc.) |

**Not a patent issue — a terms + attribution issue.**

---

## 7. LiveKit server (Docker)

| Item | Verdict |
|------|---------|
| livekit-server image | Apache-2.0 |
| Redis in livekit.yaml | For LiveKit clustering — use Valkey in enterprise compose |
| VC optional | Customer runs LiveKit on LAN — no LiveKit Cloud fee required |

---

## 8. What is NOT third-party licensed code

| Item | Meaning |
|------|---------|
| `platform-license.json` | **Your** product licensing — not open source |
| `trial-gold` baseline | **Your** snapshots |
| BWC vendor protocols (SIP/XML/FTP) | Standards / vendor spec — not “using their trademark” in your product name |

---

## 9. Trademarks — quick guide

| Name | Safe usage |
|------|------------|
| LiveKit | “Supports LiveKit” / run open-source server — don’t call product “LiveKit Mobility” |
| Redis | Descriptive “Redis-compatible” OK; Valkey preferred in docs |
| PostgreSQL | Descriptive OK |
| Qwen | Model credit in THIRD-PARTY-NOTICES — not product name |
| OpenStreetMap | Required attribution when using OSM data |
| Google / Claude | Dev tools — not in shipped binary |

---

## 10. Recommended ship pack (compliance MOBs — after counsel)

| MOB ID | Purpose | Status |
|--------|---------|--------|
| `mob-ffmpeg-lgpl-bundle` | Swap GPL `ffmpeg-static` → LGPL vendor build | ✅ Done 2026-07-07 |
| `mob-swap-redis-to-valkey` | Valkey not Redis CE in compose | ✅ Done 2026-07-07 |
| `mob-license-audit-mysql-note` | Document MySQL server-side GPL posture | ✅ Done 2026-07-07 |
| `mob-settings-legal-notices-tab` | Legal Notices tab in Settings UI | Pending |
| `mob-compliance-osm-attribution` | Restore visible map attribution | Pending |
| `mob-compliance-vendor-cdn` | Copy Leaflet + livekit-client to `public/vendor/` | Pending |
| `mob-compliance-third-party-notices` | Full `THIRD-PARTY-NOTICES.md` from `npm licenses` | Pending |

Add to [05-REVIEW-GATE-BEFORE-SHIP.md](./05-REVIEW-GATE-BEFORE-SHIP.md) §9 Legal.

---

## 11. For Google discussion

**Question for Google:**

> We audited OSS for enterprise ship. Main flags: FFmpeg GPL bundling, OSM tile policy + hidden attribution, Redis SSPL vs Valkey. Do you agree Valkey + PostgreSQL + Apache LiveKit + MIT stack is clean for on-prem OEM, with THIRD-PARTY-NOTICES and OSM attribution fix before ship?

**Google (record here):**

```
```

---

*MOB DISC — no code changes until MOB-APPLY.*
