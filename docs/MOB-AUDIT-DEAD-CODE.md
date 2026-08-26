# ME8 dead code and conflict audit

**Mode:** Read-only investigation — product code not modified.
**Generated:** 2026-08-20

Heuristic audit — verify each item before deletion.

## 0. Duplicate / shadow `lib/` paths (Windows slash duplicates)

_No duplicate lib paths detected on disk._

## 1. Commented-out logic (large blocks)

_No suspicious large comment blocks in core scan._
## 2. Orphaned / conflicting CSS (`public/css/global.css`)

### Duplicate selectors (43)
- **`.enterprise-page-layout`** — lines 65, 2032
- **`.enterprise-page-layout.enterprise-page-layout--split`** — lines 73, 80
- **`.enterprise-layout-2col`** — lines 87, 107
- **`.enterprise-form-grid`** — lines 139, 379
- **`#ev-panel-settings.enterprise-scope .ev-hub-layout.enterprise-layout-2col`** — lines 1002, 1037
- **`#ax-panel-weapon.enterprise-scope #ax-wd-crop-rail.ax-fr-crop-rail`** — lines 1183, 1196
- **`#ax-panel-weapon.enterprise-scope .ax-wd-rail-title`** — lines 1199, 1372
- **`#ax-panel-weapon.enterprise-scope .ax-wd-detect-grid`** — lines 1206, 1378
- **`#ax-panel-weapon.enterprise-scope .ax-wd-detect-slot`** — lines 1223, 1387
- **`#ax-panel-weapon.enterprise-scope .ax-wd-detect-slot.is-hit`** — lines 1234, 1398
- **`#ax-panel-weapon.enterprise-scope .ax-wd-detect-slot.is-hit img`** — lines 1240, 1404
- **`#ax-panel-tactical.ax-tactical-shell`** — lines 2444, 3520
- **`#ax-panel-tactical .ax-tactical-rail`** — lines 2565, 7434
- **`#ax-panel-tactical .ax-tactical-field`** — lines 2584, 7469
- **`#ax-panel-tactical .ax-tactical-field > span`** — lines 2592, 7475
- **`#ax-panel-tactical .ax-tactical-poi-open`** — lines 2681, 7535
- **`#ax-panel-tactical .ax-tactical-status`** — lines 2993, 7538
- **`#ax-panel-tactical .ax-tactical-ar-ptz`** — lines 3202, 3226
- **`#ax-panel-tactical .ax-tactical-bp-file-btn`** — lines 3272, 7521
- **`#ev-panel-route-trace .rt-layout`** — lines 3860, 3871
- **`#ax-panel-anpr.ax-hub-panel`** — lines 4180, 4999
- **`#ax-panel-anpr .ax-anpr-live-layout`** — lines 4267, 4280
- **`#ax-panel-anpr .ax-anpr-live-tile`** — lines 4370, 5086
- **`#ax-ai-result-card .ax-ai-result-layout`** — lines 4868, 4944
- **`#ax-ai-result-card .ax-ai-result-viewer`** — lines 4883, 4947
- **`#ax-panel-anpr .ax-anpr-image-invest-layout`** — lines 5226, 5236
- **`#ax-panel-anpr .ax-anpr-offline-layout`** — lines 5417, 5717
- **`#ax-panel-anpr .ax-anpr-offline-video-wrap`** — lines 5467, 5730
- **`#ax-panel-anpr .ax-anpr-offline-side`** — lines 5623, 5724, 5735
- **`#ax-panel-anpr .ax-anpr-live-tile-stop-txt`** — lines 5764, 5769
- **`#ax-panel-anpr .ax-anpr-hist-grid`** — lines 5900, 5907, 5912
- **`.ax-anpr-snapshot-row`** — lines 5989, 5996
- **`.ax-anpr-static-dash`** — lines 6112, 6121
- **`.ops-case-desk-player-video`** — lines 6590, 6596
- **`.ops-case-desk-map-leaflet`** — lines 6661, 6668
- **`.ev-retention-layout`** — lines 6770, 6780
- **`.settings-panel label`** — lines 7009, 7221
- **`#ss-user-drawer[hidden]`** — lines 7049, 7639
- **`#ss-user-drawer`** — lines 7050, 7640
- **`.ss-user-drawer-foot`** — lines 7073, 7082
- **`#server-setup-panel #ss-panel-scroll #ss-panel-dashboard.ss-main-panel.active`** — lines 7212, 7266
- **`#server-setup-panel #ss-site-security-section`** — lines 7260, 7290
- **`#server-setup-panel #ss-infra-tabbed #ss-infra-notes`** — lines 7363, 7398

### Tactical duplicate selectors (override risk)
- **`#ax-panel-tactical.ax-tactical-shell`** — lines 2444, 3520
- **`#ax-panel-tactical .ax-tactical-rail`** — lines 2565, 7434
- **`#ax-panel-tactical .ax-tactical-field`** — lines 2584, 7469
- **`#ax-panel-tactical .ax-tactical-field > span`** — lines 2592, 7475
- **`#ax-panel-tactical .ax-tactical-poi-open`** — lines 2681, 7535
- **`#ax-panel-tactical .ax-tactical-status`** — lines 2993, 7538
- **`#ax-panel-tactical .ax-tactical-ar-ptz`** — lines 3202, 3226
- **`#ax-panel-tactical .ax-tactical-bp-file-btn`** — lines 3272, 7521

### CSS `#id` not in index.html / command-centre.html / login.html (332 total, first 80)

> **False positives:** entries like `#fff`, `#f1f5f9` are hex colors in CSS values, not DOM IDs. Real orphan candidates start with `#ax-`, `#ev-`, `#ss-`, etc.
- **`#f1f5f9`** line 17: `--text-primary: #f1f5f9;`
- **`#f59e0b`** line 27: `--status-warn: #f59e0b;`
- **`#ef4444`** line 28: `--status-danger: #ef4444;`
- **`#e2e8f0`** line 36: `--text: #e2e8f0;`
- **`#f8fafc`** line 43: `--field-text: #f8fafc;`
- **`#ffffff`** line 218: `color: #ffffff !important;`
- **`#f8fafc`** line 508: `color: var(--field-text, #f8fafc);`
- **`#e2e8f0`** line 594: `border-top: 6px solid #e2e8f0;`
- **`#e2e8f0`** line 651: `color: #e2e8f0;`
- **`#f8fafc`** line 681: `color: #f8fafc;`
- **`#f8fafc`** line 687: `color: var(--field-text, #f8fafc);`
- **`#e2e8f0`** line 710: `color: var(--field-text, #e2e8f0);`
- **`#e2e8f0`** line 723: `color: var(--text-primary, #e2e8f0);`
- **`#fff`** line 767: `color: #fff;`
- **`#fff`** line 779: `color: #fff;`
- **`#fecaca`** line 825: `color: #fecaca;`
- **`#fff`** line 835: `color: #fff;`
- **`#e2e8f0`** line 1203: `color: #e2e8f0;`
- **`#b45309`** line 1236: `border-color: #b45309;`
- **`#fff`** line 1258: `color: #fff;`
- **`#ax-wd-snap-lightbox`** line 1271: `#ax-wd-snap-lightbox .ax-wd-snap-lb-scene-wrap {`
- **`#ax-wd-snap-lightbox`** line 1278: `#ax-wd-snap-lightbox .ax-wd-snap-lb-scene-wrap.is-zooming .ax-wd-snap-lb-scene {`
- **`#ax-wd-snap-lightbox`** line 1281: `#ax-wd-snap-lightbox .ax-wd-snap-lb-img.ax-wd-snap-lb-scene {`
- **`#ax-wd-snap-lightbox`** line 1284: `#ax-wd-snap-lightbox .ax-wd-snap-lb-zoom-hint {`
- **`#d97706`** line 1338: `#ax-panel-weapon.enterprise-scope .ax-wd-tile.is-tile-warn { border-color: #d97706; }`
- **`#dc2626`** line 1339: `#ax-panel-weapon.enterprise-scope .ax-wd-tile.is-tile-error { border-color: #dc2626; }`
- **`#f8fafc`** line 1353: `color: #f8fafc;`
- **`#e2e8f0`** line 1376: `color: #e2e8f0;`
- **`#b45309`** line 1400: `border-color: #b45309;`
- **`#f8fafc`** line 1418: `color: #f8fafc;`
- **`#ax-wd-snap-lightbox-backdrop`** line 1421: `#ax-wd-snap-lightbox-backdrop {`
- **`#ax-wd-snap-lightbox-backdrop`** line 1427: `#ax-wd-snap-lightbox-backdrop[hidden] {`
- **`#ax-wd-snap-lightbox`** line 1430: `#ax-wd-snap-lightbox {`
- **`#ax-wd-snap-lightbox`** line 1446: `#ax-wd-snap-lightbox[hidden] {`
- **`#ax-wd-snap-lightbox`** line 1449: `#ax-wd-snap-lightbox .ax-wd-snap-lb-chrome {`
- **`#ax-wd-snap-lightbox`** line 1462: `#ax-wd-snap-lightbox .ax-wd-snap-lb-title {`
- **`#f8fafc`** line 1466: `color: #f8fafc;`
- **`#ax-wd-snap-lightbox`** line 1470: `#ax-wd-snap-lightbox .ax-wd-snap-lb-close {`
- **`#f8fafc`** line 1483: `color: #f8fafc;`
- **`#ax-wd-snap-lightbox`** line 1488: `#ax-wd-snap-lightbox .ax-wd-snap-lb-close:hover {`
- **`#fff`** line 1491: `color: #fff;`
- **`#ax-wd-snap-lightbox`** line 1493: `#ax-wd-snap-lightbox .ax-wd-snap-lb-body {`
- **`#ax-wd-snap-lightbox`** line 1498: `#ax-wd-snap-lightbox .ax-wd-snap-lb-img {`
- **`#ax-wd-snap-lightbox`** line 1506: `#ax-wd-snap-lightbox .ax-wd-snap-lb-meta {`
- **`#cbd5e1`** line 1508: `color: #cbd5e1;`
- **`#wd-hq-alert-bar`** line 1512: `#wd-hq-alert-bar {`
- **`#c2410c`** line 1525: `background: linear-gradient(90deg, #9a3412 0%, #c2410c 50%, #9a3412 100%);`
- **`#fdba74`** line 1526: `border-bottom: 1px solid #fdba74;`
- **`#fff7ed`** line 1527: `color: #fff7ed;`
- **`#wd-hq-alert-bar`** line 1531: `body.fr-hq-alert-active #wd-hq-alert-bar {`
- **`#wd-hq-alert-bar`** line 1534: `#wd-hq-alert-bar[hidden] {`
- **`#wd-hq-alert-bar`** line 1537: `#wd-hq-alert-bar .wd-hq-alert-label {`
- **`#ffedd5`** line 1542: `color: #ffedd5;`
- **`#wd-hq-alert-bar`** line 1545: `#wd-hq-alert-bar .wd-hq-alert-text {`
- **`#fff`** line 1550: `color: #fff;`
- **`#wd-hq-alert-bar`** line 1552: `#wd-hq-alert-bar .wd-hq-alert-pending {`
- **`#ffedd5`** line 1556: `color: #ffedd5;`
- **`#wd-hq-alert-bar`** line 1560: `#wd-hq-alert-bar .wd-hq-alert-pending[hidden] {`
- **`#wd-hq-alert-bar`** line 1563: `#wd-hq-alert-bar .wd-hq-alert-actions {`
- **`#wd-hq-alert-bar`** line 1569: `#wd-hq-alert-bar .wd-hq-alert-actions .btn {`
- **`#wd-weapon-toast`** line 1577: `#wd-weapon-toast {`
- **`#c2410c`** line 1584: `border: 1px solid #c2410c;`
- **`#e2e8f0`** line 1587: `color: #e2e8f0;`
- **`#wd-weapon-toast`** line 1590: `#wd-weapon-toast[hidden] {`
- **`#live-popout-minimap`** line 1593: `#live-popout-minimap.live-popout-minimap,`
- **`#e2e8f0`** line 1628: `color: #e2e8f0;`
- **`#wd-weapon-toast`** line 1659: `#wd-weapon-toast .wd-weapon-toast-title {`
- **`#ffedd5`** line 1662: `color: #ffedd5;`
- **`#wd-weapon-toast`** line 1666: `#wd-weapon-toast .wd-weapon-toast-queue {`
- **`#ffedd5`** line 1670: `color: #ffedd5;`
- **`#wd-weapon-toast`** line 1674: `#wd-weapon-toast .wd-weapon-toast-queue[hidden] {`
- **`#wd-weapon-toast`** line 1677: `#wd-weapon-toast .wd-weapon-toast-close {`
- **`#f8fafc`** line 1681: `color: #f8fafc;`
- **`#wd-weapon-toast`** line 1688: `#wd-weapon-toast .wd-weapon-toast-body {`
- **`#wd-weapon-toast`** line 1693: `#wd-weapon-toast .wd-weapon-toast-thumb-wrap {`
- **`#wd-weapon-toast`** line 1703: `#wd-weapon-toast .wd-weapon-toast-thumb-wrap img {`
- **`#wd-weapon-toast`** line 1709: `#wd-weapon-toast .wd-weapon-toast-thumb-ph {`
- **`#wd-weapon-toast`** line 1718: `#wd-weapon-toast .wd-weapon-toast-line1 {`
- **`#f8fafc`** line 1722: `color: #f8fafc;`
- **`#wd-weapon-toast`** line 1724: `#wd-weapon-toast .wd-weapon-toast-line2 {`
- _…and 252 more_

### Tactical layout rule lines (override chain)
- **Line 2455:** `#ax-panel-tactical .ax-tactical-stage {`
- **Line 2464:** `#ax-panel-tactical .ax-tactical-stage.has-bank[data-bank-edge="right"] {`
- **Line 2469:** `#ax-panel-tactical .ax-tactical-stage.has-bank[data-bank-edge="left"] {`
- **Line 2474:** `#ax-panel-tactical .ax-tactical-stage.has-bank[data-bank-edge="bottom"] {`
- **Line 2479:** `#ax-panel-tactical .ax-tactical-stage.has-bank[data-bank-edge="top"] {`
- **Line 2532:** `#ax-panel-tactical .ax-tactical-stage.has-bank[data-bank-edge="bottom"] .ax-tactical-tile-bank-grid {`
- **Line 2565:** `#ax-panel-tactical .ax-tactical-rail {`
- **Line 2993:** `#ax-panel-tactical .ax-tactical-status {`
- **Line 3073:** `#ax-panel-tactical .ax-tactical-stage.has-ar-split {`
- **Line 3078:** `#ax-panel-tactical .ax-tactical-stage.has-ar-split.has-bank[data-bank-edge="right"] {`
- **Line 3083:** `#ax-panel-tactical .ax-tactical-ar-pane {`
- **Line 3096:** `#ax-panel-tactical .ax-tactical-ar-pane[hidden] {`
- **Line 7434:** `#ax-panel-tactical .ax-tactical-rail {`
- **Line 7484:** `#ax-panel-tactical .ax-tactical-rail select {`
- **Line 7538:** `#ax-panel-tactical .ax-tactical-status {`
- **Line 7554:** `#ax-panel-tactical .ax-tactical-rail input.enterprise-form-control {`
- **Line 7574:** `#ax-panel-tactical .ax-tactical-rail select.enterprise-form-control {`

## 3. Possibly dead JavaScript (core files, strict heuristic)

_Top-level `function name()` with ≤1 reference anywhere in `public/` and not exported on `global`._

### `public/js/command-centre.js`
- **`getLang()`** line 101

### `public/js/dashboard-boot.js`
- **`setConnStatus()`** line 503
- **`applyFleetTelemetryToPanel()`** line 558
- **`clearCameraMarker()`** line 769
- **`membersForPinned()`** line 1203
- **`offsetLatLngMeters()`** line 1563
- **`ensureClusterShiftBar()`** line 1619
- **`ensureStackPopupToolbar()`** line 2126
- **`bindStackedPinPopupDrag()`** line 2378
- **`requestSnapshot()`** line 3728
- **`dismissSos()`** line 5870
- **`downloadSosCsv()`** line 6473
- **`sendCommand()`** line 6677

### `public/js/evidence-hub.js`
- **`renderDockFleetTable()`** line 319
- **`notePanelLooksVisible()`** line 2299
- **`firstPendingRedactExport()`** line 2431

### `public/js/ops-cases-ui.js`
- **`syncBulkPurgeVisibility()`** line 935

### `public/js/server-setup.js`
- **`isAdvancedTab()`** line 269
- **`clearConfigUnlocked()`** line 1619
- **`hierarchyScopeBadgeHtml()`** line 1688
- **`permCheck()`** line 1755
- **`ensureCanManageServer()`** line 2936

## 4. Possibly unreachable API routes (`server.js`)

- Frontend literal `/api/` strings: **187**
- Server API routes: **350**
- No obvious frontend match: **60**

### `/api/admin`
- **GET `/api/admin/status`** — line 10958
- **POST `/api/admin/clear-cache`** — line 10974

### `/api/analytics`
- **GET `/api/analytics/anpr/ingest-state`** — line 8238
- **POST `/api/analytics/anpr/ingest-tick`** — line 8249
- **GET `/api/analytics/anpr/crop/:file`** — line 8261
- **GET `/api/analytics/anpr/evidence`** — line 8271
- **GET `/api/analytics/fr/evidence`** — line 8281
- **GET `/api/analytics/fr/crop/:file`** — line 9168

### `/api/audit-log`
- **GET `/api/audit-log`** — line 5069

### `/api/auth`
- **GET `/api/auth/oidc/callback`** — line 1538

### `/api/auth-audit-ship-checklist`
- **GET `/api/auth-audit-ship-checklist`** — line 2146

### `/api/bwc-companion`
- **POST `/api/bwc-companion/sos-trigger`** — line 2166
- **POST `/api/bwc-companion/button-event`** — line 2167
- **POST `/api/bwc-companion/telemetry`** — line 2168

### `/api/command-centre`
- **GET `/api/command-centre/summary`** — line 11111
- **GET `/api/command-centre/export`** — line 11119

### `/api/conference`
- **POST `/api/conference/mobile/join-token`** — line 10265

### `/api/docking-settings`
- **POST `/api/docking-settings`** — line 4041

### `/api/evidence`
- **GET `/api/evidence/live-record/status`** — line 5060
- **GET `/api/evidence/stream/:downloadId`** — line 6381
- **GET `/api/evidence/downloads`** — line 6401
- **POST `/api/evidence/upload`** — line 7057

### `/api/gps-track`
- **GET `/api/gps-track/settings`** — line 6204
- **PATCH `/api/gps-track/settings`** — line 6212

### `/api/lab`
- **GET `/api/lab/zlm/status`** — line 4559
- **GET `/api/lab/zlm/flv/:streamFile`** — line 4572
- **GET `/api/lab/zlm/b1/flv-url`** — line 4590
- **GET `/api/lab/playback`** — line 4606
- **POST `/api/lab/relay/start`** — line 4623
- **POST `/api/lab/relay/stop`** — line 4637
- **GET `/api/lab/wvp/status`** — line 4666
- **GET `/api/lab/wvp/stack-selfcheck`** — line 4675
- **GET `/api/lab/wvp/diagnose-startplay`** — line 4685
- **POST `/api/lab/wvp/clear-stale-docker-hosts`** — line 4700
- **POST `/api/lab/wvp/sync-lan-hosts`** — line 4711
- **POST `/api/lab/wvp/prepare-invite-rtp`** — line 4725
- **POST `/api/lab/wvp/mirror-register`** — line 4741
- **GET `/api/lab/wvp/wait-lan-register`** — line 4757
- **GET `/api/lab/wvp/devices`** — line 4771
- **GET `/api/lab/wvp/devices/:deviceId/channels`** — line 4781
- **POST `/api/lab/wvp/play`** — line 4790
- **POST `/api/lab/wvp/stop`** — line 4801
- **GET `/api/lab/wvp/flv`** — line 4811
- **GET `/api/lab/wvp/flv-stream`** — line 4824
- _…+2 more_

### `/api/metrics`
- **GET `/api/metrics`** — line 1480

### `/api/operations`
- **GET `/api/operations/meta`** — line 5221
- **GET `/api/operations/active/map-overlays`** — line 5229
- **GET `/api/operations`** — line 5237
- **POST `/api/operations`** — line 5245
- **GET `/api/operations/:id`** — line 5258
- **PATCH `/api/operations/:id`** — line 5267
- **POST `/api/operations/:id/activate`** — line 5281
- **POST `/api/operations/:id/close`** — line 5295
- **GET `/api/operations/:id/overlays`** — line 5309
- **POST `/api/operations/:id/overlays`** — line 5318

### `/api/overlays`
- **PATCH `/api/overlays/:pinId`** — line 5336
- **DELETE `/api/overlays/:pinId`** — line 5350

### `/api/tech`
- **POST `/api/tech/logout`** — line 1909

## 5. Scan scope & caveats

- JS: public/js/tactical-shell.js, public/js/tactical-poi.js, public/js/tactical-ar.js, public/js/tactical-overwatch.js, public/js/tactical-blueprint-ui.js, public/js/license-entitlements-ui.js, public/js/dashboard-boot.js, public/js/evidence-hub.js, public/js/server-setup.js, public/js/fleet-ui.js, public/js/command-centre.js, public/js/ops-cases-ui.js
- HTML ID check: public/index.html, public/command-centre.html, public/login.html
- Dynamic `fetch(url)` paths not detected.
- CSS duplicates may be intentional (responsive / state blocks).
- IIFE inner helpers with single in-file use may appear as dead incorrectly if only referenced inline.