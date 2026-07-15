# MOB DISC — FR snap map-anchor + Keep = evidence pack

**Status:** **`mob-fr-snap-map-anchor-card` APPLIED** · **`mob-fr-snap-keep-evidence-pack` APPLIED 2026-07-13**  
**Agreed:** Keep = **folder on server** + **toast hint**. **No** second on-screen Keep tab.  
**Date:** 2026-07-13  

---

## APPLIED — `mob-fr-snap-keep-evidence-pack`

| File | Change |
|------|--------|
| `lib/frKeptEvidence.js` | Writes `storage/fr-kept/{id}.jpg` + `{id}.json` + `index.jsonl` + `README.txt` |
| `server.js` | `POST /api/analytics/fr/kept`; init on boot |
| `public/js/fr-alarm.js` | **Keep** → save + toast folder hint only |
| `public/index.html` | Keep on map popup; cache-bust |
| `public/locales/en.json` | Keeping / folder hint strings |

**Flow:**

```
Keep → toast “Saved in storage/fr-kept …” → operator opens that folder on the server
       (no duplicate floating card)
```

**Folder:** `ME8/storage/fr-kept/` (relative to install root).

---

## PASS check

1. Open snap or map card → **Keep**  
2. Toast with folder hint  
3. No second Keep tab  
4. Files appear under `storage/fr-kept/` after Fleet restart if needed for new API  

---

## Suggested next

Match / re-enroll if hits still fail.
