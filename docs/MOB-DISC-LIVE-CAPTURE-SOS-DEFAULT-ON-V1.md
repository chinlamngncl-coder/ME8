# MOB-DISC — Live capture SOS default ON (locked)

**APPLY:** `VMS-LIVE-CAPTURE-SOS-DEFAULT-ON-V1`  
**Date:** 2026-08-29

## Product rule (ship forever)

- **Enable server live capture** = **ON** by default  
- **Auto-record server video on SOS alarm** = **ON** by default  
- Operator may turn **OFF** if the site does not want HQ SOS video  
- Folder path / disk layout still follows site Evidence storage settings  

## Code

- `lib/serverSettings.js` — normalize defaults + one-shot `liveCaptureDefaultOnV1` stamp on load  
- Settings UI checkboxes default `checked`  
- Manuals: EN Configuration + User (src + docs)

## Not changed

- FTP / dock / NAS path choice — site storage arrangement  
