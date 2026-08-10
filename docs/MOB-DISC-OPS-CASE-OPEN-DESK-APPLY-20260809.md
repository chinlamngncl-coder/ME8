# MOB DISC — OPS-CASE-OPEN-DESK-V1 APPLY (2026-08-09)

**Status:** APPLIED. Unify Evidence Cases detail — **do not destroy UI**.

## What you get

Open a Case → desk layout:

1. **Evidence media** slot (crop/snapshot if `refs.cropUrl`; else empty hint until bind)  
2. **Location** map (OSM embed when `refs.lat` / `refs.lon`)  
3. **Field grid** — camera / type / status / title  
4. Existing **notes + touch log** kept  

SOS raise/Ack now stores **lat/lon** on case refs when the alarm has GPS.

## Not in this APPLY

- Library clip player bind → `OPS-CASE-BIND-EVIDENCE-V1`  
- Redact button on desk / license grey → later  
- Close/archive → later  

## Files

- `public/index.html` (detail wrap + cache-bust)  
- `public/css/global.css`  
- `public/js/ops-cases-ui.js`  
- `lib/opsCaseStore.js` (SOS refs lat/lon)  
- `public/locales/en.json`  

## Check

Hard refresh → Evidence → Cases → open a row → see media + map + fields + notes. Old list chrome unchanged.
