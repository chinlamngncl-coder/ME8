# MOB DISC — HQ-ALERT-CUSTOM-TONE-FILES-V1 APPLY (2026-08-10)

**APPLY:** `MOB-APPLY HQ-ALERT-CUSTOM-TONE-FILES-V1`  
**Status:** APPLIED.

## UI

After SOS / Analytics / Hold selects:

1. **Custom tone** heading  
2. SOS + Analytics: **Default | Custom** tabs  
3. Custom → file picker + Clear + file name  
4. **Preview** / Preview SOS / Preview analytics (unchanged labels)  
5. **Save alert tones** persists presets + modes + uploads  

Preview ≠ Save (pending file labeled “pending save”).

## Server

- `lib/hqAlertTones.js`  
- `storage/hq-alert-tones/` + `meta.json`  
- `GET /api/hq-alert-tones`  
- `GET /api/hq-alert-tones/file/:slot`  
- `POST /api/hq-alert-tones/upload/:slot` (super admin)  
- `POST /api/hq-alert-tones/modes`  
- `DELETE /api/hq-alert-tones/:slot`  

Formats: mp3/wav/ogg/webm, max **500 KB**.

## Operator check

1. Restart Fleet (new API). Hard refresh.  
2. Site security → Alerts & voice → Custom tone.  
3. Custom → pick short clip → Preview SOS (no save yet).  
4. **Save alert tones** → refresh → still Custom + filename.  
5. Default tab → preset again; Save.
