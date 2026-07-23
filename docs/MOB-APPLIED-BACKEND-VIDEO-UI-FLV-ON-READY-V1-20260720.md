# MOB-APPLIED — Backend video UI FLV on ready V1 (Phase 4)

**APPLY:** `MOB-APPLY-BACKEND-VIDEO-UI-FLV-ON-READY-V1`  
**Date:** 2026-07-20  
**Scope:** Strict isolated frontend lift — **video attach only**

---

## What landed

| File | Change |
|------|--------|
| `public/js/live-player-factory.js` | **New** `attachFlvPrimary(host, flvUrl)` — direct mpegts FLV (no JSMpeg underlay) |
| `public/js/video-wall.js` | On `video-stream-ready` with `wvpVideoHandoff` + `flvUrl` → immediate FLV mount; bypass JSMpeg + delayed `softAttachZlmOverlay`; **multi-tile / Open All** supported (no `wallZlmSoftUpgradeAllowed` gate) |
| `public/index.html` | Cache bust only (`?v=20260720-flv-on-ready-v1`) |

**Not touched:** CSS grid, map layouts, redaction, PTT/29201, backend handoff, ACL, `server.js`.

---

## Behavior

1. Operator opens live (single tile or Open All).
2. Backend handoff → `video-stream-ready { wvpVideoHandoff: true, flvUrl }`.
3. UI stores FLV per cam and mounts `mpegts` player on each bound wall slot **immediately**.
4. JSMpeg pool WS and 2.2s soft ZLM upgrade **skipped** when handoff FLV is present.
5. Stop clears handoff URL map on `video-stream-stopped`.

---

## Operator smoke

1. **Hard refresh** dashboard once (`Ctrl+F5`) — required for new JS.
2. Cams on WVP **5060** unchanged.
3. Open **one** live → wait for picture (FLV `:18088`).
4. Open All / dual live → both tiles should paint (no single-tile soft-ZLM block).
5. Cold SOS still OK.
6. **PTT not in scope** — hold until live PASS confirmed.

Log (backend, unchanged): `wvp video handoff start` · `flvHost:192.168.1.38:18088`

---

## Known limits

- Map pin mirror still expects wall **canvas** (Firmware Gold); WVP handoff wall uses **video** element — pin may stay placeholder until separate MOB.
- PTT / Call unchanged.
