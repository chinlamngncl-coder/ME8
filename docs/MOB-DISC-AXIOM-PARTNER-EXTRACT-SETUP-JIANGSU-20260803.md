# MOB DISC — Partner pack confusion: `_extract_test_expand` · Setup · Jiangsu map

**Date:** 2026-08-03  
**Status:** DISCUSSION ONLY — no code / no re-zip until you say `MOB-APPLY …`  
**Tone:** Straight facts. No sugar.

---

## One-sentence truth

**Do not send `_extract_test_expand` to your partner.** It is my **incomplete lab extract test**, not a finished customer pack. Your partner’s Windows Extract All of the original zip is why they only see **2 manuals**. Jiangsu **center + offline flag** are in the UI; full **Jiangsu tile files are in the big zip** but **missing from this test folder**.

---

## What the fuck did I do? (plain)

| Thing | What it is | Send to partner? |
|-------|------------|------------------|
| `dist/Mobility_Axiom_AirGapped_CN.zip` (~2.85 GB) | The real pack zip (product + Docker tars + GIS tiles inside) | **Yes — but they must open it correctly** |
| Partner extract (2 × `.md`) | Windows Extract All broke on `./` paths | **Useless** |
| `dist/_extract_test_expand/` | **My debug folder** — I started `Expand-Archive` to prove the zip; then **killed** it because it hung. Partial tree (~5 400 files / ~2.7 GB). | **NO** |
| `dist/Mobility_Axiom_AirGapped_CN/` (2 manuals) | Leftover / failed extract twin | **NO** |

I did **not** “extract a clean partner folder for you to ship.” I left a **half-finished test** named `_extract_test_expand`. That name means **test**, not release.

### Can you zip `_extract_test_expand` and give that?

**No. Do not.**

Reasons (measured):

1. Zip has ~**15 360** file entries; this folder has ~**5 419** files → **incomplete**.  
2. **`data/gis/offline` is missing here** (empty/missing under extract) while the **zip contains ~1 973 tile files (~33.7 MB)** including region **`cn-jiangsu` (Nanjing metro)**.  
3. Re-zipping a broken partial extract = partner still missing map tiles + unknown other paths → **you fuck the delivery again**.

---

## Jiangsu offline map — 100% honest (no “sure” when not sure)

### What IS true in the product zip / extract UI

| Check | Result |
|-------|--------|
| Default map center Jiangsu (Nanjing) `32.0617, 118.7630` | **YES** in staged `public/index.html` |
| UI lang `zh`, country `cn` | **YES** (`fm-default-lang`, `fm-map-countries`) |
| `fm-map-offline-only=1` | **YES** — map will **not** fall back to online OSM |
| Offline pack includes region **`cn-jiangsu`** (Nanjing bbox) in `country-tile-bboxes.json` | **YES — inside the big zip** (~33.7 MB tiles total for demo regions incl. Jiangsu) |

### What is NOT true about `_extract_test_expand`

| Check | Result |
|-------|--------|
| `data/gis/offline` present in `_extract_test_expand` | **NO — missing** |
| “100% this folder = Jiangsu offline map ready” | **FALSE** |

### Partner outcome if they only have 2 manuals

No Setup, no tiles, no app → map question is moot.

### Partner outcome if they get a **full correct extract** of the AirGapped zip

They get Jiangsu **default view + offline-only mode + Jiangsu tile region in the offline pack** (demo Nanjing metro bbox, not all of Jiangsu province).  
If tiles fail to extract, offline-only = **blank map** (by design).

**I will not claim “100% Jiangsu province wall-to-wall.”** Claim that is true: **Nanjing metro (Jiangsu) offline tiles + Jiangsu start coords + offline-only**, when the **full zip extracts correctly**.

---

## Teach partner how to see the real pack (send him this)

Partner already has `Mobility_Axiom_AirGapped_CN.zip` (or whatever you named it).

### Do NOT

- Windows right-click → **Extract All** (this is what gave him only 2 docs).  
- Open the folder that only has 2 manuals and think that is the product.

### DO (pick one)

**Option A — 7-Zip (recommended)**

1. Install [7-Zip](https://www.7-zip.org/).  
2. Right-click the zip → **7-Zip → Extract to “Mobility_Axiom_AirGapped_CN\”**.  
3. Open that new folder. He must see at least:
   - `Axiom_Enterprise_Setup.bat`
   - `README-DEPLOY.txt`
   - `ship-build\`
   - `public\`
   - `docker\`
   - `offline_images\`
   - `data\gis\offline\` (tiles)

**Option B — You send a fixed zip later** (after `MOB-APPLY PACK-AXIOM-ZIP-OPEN-PROOF-V1`) so Extract All works. Until that APPLY, **7-Zip only**.

### After extract — yes, Setup

1. Install **Docker Desktop** (required for video stack).  
2. Double-click **`Axiom_Enterprise_Setup.bat`**.  
3. Enter **real LAN/WAN IP** (not `172.17`–`172.31`).  
4. Open `http://THAT_IP:3888`.

So: **yes — Setup bat is the one-click** — but **only after a full extract**, not from the 2-manual folder.

---

## What you should do today (operator)

1. Tell partner: **7-Zip extract**, then **Axiom_Enterprise_Setup.bat**.  
2. **Do not** zip `_extract_test_expand`.  
3. When you want a clean ship: **`MOB-APPLY PACK-AXIOM-ZIP-OPEN-PROOF-V1`** — rebuild zip **without `./` prefixes**, prove Windows Extract All + prove `data/gis/offline` + Setup present, then you hand him **that** new zip only.

---

## Recommended next MOB (unchanged, clearer)

### `PACK-AXIOM-ZIP-OPEN-PROOF-V1`

1. Rebuild zip: **no `./` entry names**.  
2. Manifest + post-pack gate: Setup + `run.js` + `data/gis/offline` tile count > 0 + `cn-jiangsu` in bbox JSON.  
3. Delete or rename `_extract_test_expand` so it cannot be mistaken for a release.  
4. Optional: second zip for `offline_images` only.

**PASS (you):** You Extract All on a clean PC → full tree → Setup runs → map opens on Nanjing/Jiangsu offline (not blank, not Singapore).

Until APPLY: **no re-pack from me.**
