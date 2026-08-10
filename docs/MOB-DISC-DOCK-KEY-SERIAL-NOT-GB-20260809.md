# MOB DISC — Dock identity key: serial / asset, not 20-digit GB (2026-08-09)

**Status:** Design lock. No code until named APPLY.  
**Problem:** Using the **20-digit GB28181 deviceId** as the FTP/dock folder key is bad for humans and wrongly couples “how SIP registers” with “how evidence is filed.”  
**Decision:** Keep GB id **internal only**. Dock / Evidence human key = **camera serial (or asset tag)**. Map serial → GB `deviceId` in Fleet registry.

---

## 1. Why 20-digit GB is wrong for dock

| Issue | Reality |
|-------|---------|
| Hard to type / read | Operators and IT will mis-copy folders |
| Belongs to protocol | GB id is for SIP/WVP/live — not a friendly asset label |
| Changes / pool | You may re-provision; sticker on the body stays |
| Industry | Dock/DEMS commonly file by **serial / user / time**, not long protocol IDs |

Today’s watch already *prefers* a 20-digit match if present — that stays as a **fallback** only. It must **not** be the product story.

---

## 2. Options considered (then one lock)

| Option | Pros | Cons |
|--------|------|------|
| **A. Camera serial / asset tag** (sticker on BWC) | Short, unique per unit, industry-normal, works with shared pool cams | Must enter once in Fleet registry |
| **B. Officer badge / name as folder** | Human friendly | Wrong for pool cameras (same cam, different wearer next shift); SOS is device-timed |
| **C. Short callsign only** (Chin, kk) | Easy lab speak | Collisions / rename risk; less unique than serial |
| **D. RFID / dock assign at cradle** | Best when dock SDK exists | Our dock SDK still stub — not V1 |
| **E. Keep 20-digit GB folders** | Zero new fields | **Rejected** — you said no |

**Locked:** **A — serial / asset tag** as the dock folder key.  
Optional display: callsign next to serial in UI.  
Officer name = **who** (roster / RFID later), not the folder name for V1.

---

## 3. How identity layers work (locked)

```text
GB deviceId (20-digit)     → SIP / live / SOS ledger cameraId (machine)
serialNo / assetTag        → dock FTP folder + Evidence key (human)
operatorName / badge       → who wore it (soft); not required for V1 dock folder
```

**Resolve path on ingest:**

1. Read folder/filename token (e.g. `SN-A10428` or `UB8-0042`).  
2. Look up Fleet BWC registry: `serialNo` / `assetTag` / `dockKey` → `deviceId`.  
3. Store Evidence with **both** `deviceId` (GB) and `serialNo`.  
4. SOS match-back uses **deviceId** (same as alarm) after resolve.

Officer never types GB. IT never builds FTP trees from GB.

---

## 4. Folder / naming plan (human)

Preferred drop layout:

```text
{FTP_ROOT}/{SERIAL}/yyyy-mm-dd/...media...
```

Examples (illustrative):

- `…/ftp-uploads/UB8-0042/2026-08-12/rec.mp4`  
- `…/ftp-uploads/SN-A10428/clip.mp4`

Rules:

- Serial = **unique** per physical camera (uppercase, letters/digits/hyphen).  
- No spaces. Max ~24 chars.  
- If dock vendor writes serial into filename instead of folder — parser accepts either.  
- If **only** 20-digit GB appears (legacy), still resolve — but Super admin sees a soft warning “migrate to serial folder.”

---

## 5. Registry change (future APPLY — not tonight)

Add on each BWC row (concept):

| Field | Example | Use |
|-------|---------|-----|
| `deviceId` | `340200…0008` | Unchanged — SIP |
| `serialNo` or `assetTag` | `UB8-0042` | Dock key (required for clean auto) |
| `dockKey` (optional alias) | same as serial or short site code | If serial has awkward chars |

One-time lab job: set serial for Chin / kk / each unit from the sticker.  
Your plan “change every officer to their serial” — clarify: **cameras** get serials; **officers** keep names/badges. If one officer always owns one cam, UI can show both.

---

## 6. Suggested APPLY names (when you want code)

| # | APPLY | Does |
|---|-------|------|
| 1 | `BWC-SERIAL-ASSET-REGISTRY-V1` | Field on device + Settings/Fleet edit; unique check |
| 2 | `DOCK-KEY-RESOLVE-SERIAL-V1` | Watch/parser: serial → deviceId; GB only fallback |
| 3 | (already queued) `SOS-DOCK-MATCHBACK-V1` | Match using resolved deviceId |

No need to rip out GB from SIP. Only stop treating GB as the **human dock key**.

---

## 7. Recommendation (one path)

**Serial / asset tag on the camera = dock Evidence key.**  
GB stays under the hood.  
Officer badge optional later for “who,” not folder name.  
RFID dock when SDK is real.

**Next when you want it:** `MOB-APPLY BWC-SERIAL-ASSET-REGISTRY-V1`  
(Or keep finishing `SOS-DOCK-MATCHBACK-V1` first, then serial resolve — match-back can still use GB until serial APPLY lands.)
