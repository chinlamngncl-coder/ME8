# MOB APPLIED — LAB-RESTORE-MAP-LANG-NOT-CN-V1

**Date:** 2026-07-31  
**Cause:** CN pack wrongly baked `zh` / `cn` / Jiangsu into **lab source**  
**Status:** APPLIED — lab restored; packer injects CN face into **zip only**

---

## Lab restored

| Item | Back to |
|------|---------|
| Default language | **en** |
| Locales list | `en,fil,id,th,ko,zh` (zh available, not default) |
| `fm-map-countries` forced `cn` | **Removed** from lab HTML |
| Map fallback | Singapore **1.3521, 103.8198** |

**Files:** `public/index.html`, `public/login.html`, `dashboard-boot.js`, `maplibre-primary.js`, `tactical-shell.js`, packer inject for zip only.

---

## Operator (important)

1. Hard refresh (Ctrl+F5).  
2. If still Chinese: browser remembered it — open Language on login/dashboard → pick **English**, or clear site data for this host (`localStorage` keys `fm_ui_lang`, `fm_map_country_v1`).  
3. Map should not open on Jiangsu.

**PASS:** Lab English + non-China map default.  
**China zip:** only gets zh/cn when packer runs — not from lab source.
