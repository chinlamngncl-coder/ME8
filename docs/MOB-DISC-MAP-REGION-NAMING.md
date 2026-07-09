# MOB DISC — Map dropdown, “presets”, and place search (plain)

**Status:** DISC only — 2026-07-09. **Retracts** “Quick jump” from `MOB-DISC-MAP-COUNTRY-SEARCH.md` — that label is **rejected**.

**Trigger:** Operator questions the country list on the map, a suggested “Quick jump” rename, and what “presets” means vs city/address search.

---

## Plain answer

| What you have today | What it is | Change now? |
|---------------------|------------|-------------|
| **Dropdown** (Singapore, Philippines, …) | **Regional map views** — moves the map centre to a capital / ops area we ship for trial regions | **Leave it** — list is fine |
| **Fit pins** button | Zoom map to **your fleet GPS** (pinned devices, or all devices on map) | **Keep** — this is the main ops action |
| **Pan / zoom** | Standard map navigation — worldwide when online | Already works |
| **City / address search** | **Not built** | Only if you approve a **separate** MOB later |
| **“Presets”** (dev word) | Internal name for “saved lat/lon/zoom for each region” — **not** a user-facing feature name | Do **not** put “Presets” in the UI |

**No MOB required** to “fix” the country dropdown unless you want place search or more regions in the list.

---

## What the dropdown actually does (one sentence)

**It recentres the map on a region we listed** — e.g. Singapore city view, Manila, Jakarta. It does **not** limit which countries you can pan to, which devices appear, or which tiles load (except offline packs — see below).

**Code:** `public/js/mobility-map-gis.js` → `COUNTRY_PRESETS` (7 regions: sg, ph, id, th, kr, cn, za).

**Pop-out map (Monitor 3):** Same dropdown — same behaviour. Opening map on another monitor does not add search or more countries.

---

## What “presets” means (stop using this word with operators)

| Term in code/docs | Meaning | Show to user? |
|-------------------|---------|---------------|
| **`COUNTRY_PRESETS`** (JS) | Hardcoded map centre + zoom per country code | **No** |
| **`country-presets.json`** (server) | Installer GIS pack: region name, centre, offline layer file | **No** — deploy config |
| **“Preset view” / “Quick jump”** (agent suggestion) | Attempt to explain the dropdown | **Rejected** — not industry language |

**User-facing idea:** the dropdown is just **region names** (Singapore, Philippines, …). No extra jargon.

---

## Industry naming (what real products use)

No major map or VMS product uses **“Quick jump”** as a control label.

| Product pattern | Typical control |
|-----------------|-----------------|
| **Google Maps / Apple Maps** | **Search** box (address, city, POI) — no “jump” label |
| **Esri / ArcGIS** | **Bookmarks** or **Extents** |
| **Genetec Security Center** | Map navigation + **saved views** / go to coordinates |
| **Milestone XProtect** | Map + device fit; regional setup in admin |
| **Avigilon / typical PSIM** | **Search location** or zoom to asset |

**For our dropdown (regional list only):**

| Option | Verdict |
|--------|---------|
| **Quick jump** | **Reject** — sounds internal, not enterprise |
| **Map region** (current `map.country.label`) | **Acceptable** — a bit vague but not wrong |
| **Region** | **OK** — short, next to country names |
| **No label** — only the `<select>` with country names | **OK** — dropdown is self-explanatory |
| **Bookmarks** | Only if we later save custom views per site — overkill for fixed list |

**Recommendation:** **Leave label as “Map region” or shorten to “Region”.** Do **not** MOB-APPLY a “Quick jump” rename.

---

## Three different map actions (do not mix them)

```
┌─────────────────────────────────────────────────────────────┐
│  [ Fit pins ]  [ Map region ▼ Singapore … ]  (no search yet) │
└─────────────────────────────────────────────────────────────┘
        │                    │
        │                    └── Regional list → fly to Singapore, Manila, etc.
        └── Fleet GPS → zoom to where BWCs are
```

| Action | User goal | Built? |
|--------|-----------|--------|
| **Fit pins** | “Show me my devices” | **Yes** |
| **Region dropdown** | “Start map in our usual country/ city view” | **Yes** (7 regions) |
| **Search** (city, address, lat/lon) | “Go to Frankfurt / 123 Main St” | **No** |

Pan/zoom is implicit — every map has it; no label needed.

---

## “Leave the regional list” vs “add search”

### Leave regional list (recommended default)

- Keeps lab/trial APAC + ZA + CN shortcuts.
- UI language can reorder or default (e.g. Filipino UI → Philippines first) — already in code.
- **Do not** expand to 200 countries in a dropdown — unusable without search.
- Optional later: add **Malaysia** (already in server `country-presets.json`, missing from JS list) — small data fix only if you care.

### City / address search (separate product decision)

- **Different feature** — search box + geocoder (Nominatim, Photon, or customer-hosted).
- Industry-standard pattern: magnifying glass, “Search map” or “Find address”.
- Online installs only unless geocoder is on LAN.
- **Not a rename of the dropdown** — sits **beside** Fit pins + region list.

**No MOB until you explicitly want search.**

---

## Online vs offline (why region list feels confusing abroad)

| Install | Dropdown | Rest of world |
|---------|----------|---------------|
| **Online** (OSM / OpenFreeMap) | Shortcut only | Pan/zoom + Fit pins work anywhere |
| **Offline tile pack** | Shortcut only | Tiles only where pack was built — dropdown does not fix missing geography |

International customer on offline: ship the right **GIS pack** at install — not a UI wording problem.

---

## DISC verdict

| Question | Answer |
|----------|--------|
| What was “Quick jump” for? | Bad agent shorthand for the **region dropdown** — **do not ship** |
| Leave regional countries as-is? | **Yes** — fit for purpose for trial/APAC lab |
| What are presets? | **Dev/config term** for saved map centres — not operator vocabulary |
| Search vs presets? | **Search** = find any place (not built). **Region list** = our fixed shortcuts (built). |
| MOB now? | **None required** for labels/list unless you want `mob-map-place-search` later |

---

## If you approve MOBs later (optional only)

| MOB | What | When |
|-----|------|------|
| `mob-map-place-search` | Search box + geocode → fly map | Customer needs address/city lookup |
| `mob-map-region-malaysia` | Add `my` to JS list (sync server JSON) | Malaysia trial site |
| `mob-map-presets-from-server` | Dropdown driven by installer `country-presets.json` | Multi-site OEM packs |

**Explicitly not recommended:**

- `mob-map-region-honest-labels` with “Quick jump” — **withdrawn**

---

## Apply when ready

- **Nothing** — current map toolbar is acceptable as-is.
- Or: `MOB-APPLY mob-map-place-search` when you want city/address search (separate scope).

Related: `docs/MOB-DISC-MAP-COUNTRY-SEARCH.md` (technical detail; ignore Quick jump section).
