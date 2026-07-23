# MOB DISC — Wake-up summary + Tactical Zone (Google design still locked)

**Date:** 2026-07-23 ~02:05  
**Status:** PAPER — sleep now; **MOB after you wake**. No APPLY from this file.  
**Keep:** WVP/ZLM handoff **ON**. Fleet stays. One MOB at a time.

**Full Tactical architecture (unchanged):**  
`docs/MOB-DISC-TACTICAL-ZONE-EVIDENTIARY-ENGINE-AFTER-VIDEO-VULN-20260721.md`

---

## Yes — agent still understands Tactical Zone

This is the **Google-handed Product Architecture** we locked 2026-07-21. **Not invent.** Plug into Fleet + WVP.

| Module | What it does (plain) |
|--------|----------------------|
| **1 — Smart Perimeters** | Separate **Tactical** tab + own Leaflet map. Draw polygons/circles → GeoJSON. Backend **Turf.js**: every GPS ping → in/out of zone. **Entry:** existing WVP `startPlay` (wall video) + inject PTT group **gtid 49**. **Exit:** stop video + drop PTT. |
| **2 — Zone Archiver** | Background vault: perimeter + breadcrumbs + event ledger (`ENTERED`, SOS…). Multi-tenant. ACTIVE → ARCHIVED. |
| **3 — AAR / Timeline** | Playback ghosts + scrub with archived video. Dual-handle trim; FFmpeg **`-c copy` only** (no re-encode). |
| **4 — Evidentiary export** | SuperAdmin + PIN → offline zip (video slice, GPS, tiles) + AES + SHA-256 custody PDF + `View-Evidence.html`. |

**Must not:** clutter daily Ops map; second media stack; turn off handoff; replace Evidence wholesale; start coding Tactical while video/vuln still open.

**Socket sketch (Module 1):** `create-tactical-zone` (GeoJSON + Incident ID) → Fleet.

---

## When Tactical starts (locked order)

```
1) Finish open lab MOBs you care about (voice / pin / VC / GPS PASS)
2) Vulnerability / security hardening genre (named MOBs when you order)
3) THEN Tactical Zone & Evidentiary Engine — first APPLY you name, e.g. tab shell
```

**Soon** = after wake queue + vuln gate — **not** the first thing tomorrow morning unless you explicitly override.

---

## Tonight — already done / PASS (do not redo)

| Item | State |
|------|--------|
| Video wall / CW / FR / popouts (harm 1–5b) | Mostly **PASS** |
| PTT Groups + mesh | **PASS** |
| Wall listen | **PASS** |
| Centre Summary | **PASS** |
| Snapshot 1-click → 1 shot | **PASS** (`udp_once` + Cursor rule) |
| Wall slot icon encoding | **PASS** |
| Map toolbar arrow | **APPLIED** |
| DeviceControl once Cursor rule | **APPLIED** |
| Call Groups (discussion) | **PASS** (operator 2026-07-23) |
| GPS Lock→Unlock pin replay | **PASS** (operator 2026-07-23) |
| UI teaching hints → short copy | Disc locked: `MOB-DISC-UI-COPY-SHORT-NO-TEACH-20260723.md` |

---

## When you wake — leftover MOB queue (pick one)

Do **one** APPLY at a time. Agent recommendation order:

| # | Genre | Phrase / gate | Notes |
|---|--------|---------------|--------|
| **1** | Call Groups | Confirm **PASS** or **FAIL** (already applied) | Join Chin+kk → discussion → End |
| **2** | GPS pin | Confirm **PASS** or **FAIL** (already applied) | Lock→Unlock → pin back |
| **3** | Voice / VC | `MOB-APPLY CONFERENCE-BWC-INGRESS-WVP-HANDOFF-V1` **or** `PTT-29201-WVP-HOMED-V1` | Only if Call/VC still broken |
| **4** | Map pin layout | `PIN-CLICK-POPUP-OPEN-NO-DOCK-STORM-V1` | When pin genre resumes |
| **5** | FR Verify | Your ops check first | Code only if FAIL |
| **6** | **Vuln genre** | Named sec MOBs when you order | Before customer ship |
| **7** | **Tactical Zone** | First APPLY you name (tab shell / schema) | **After** 1–6 as needed; follow Google modules 1→4 |

**Default first message when you wake:**  
“Call Groups PASS/FAIL” and “GPS PASS/FAIL” — then name the next APPLY.

---

## Agent must not (wake session)

- Start Turf / Tactical tab / vault / export without a **named Tactical APPLY**
- Invent a different zone product than the Google doc
- Park WVP to “make Tactical easier”
- Bundle Tactical + pin + Call in one MOB

---

## One-screen memory

**Tactical Zone = Google design locked · Fleet+WVP plugs · separate Tactical map · Turf entry→live+PTT · vault → AAR → crypto export.**  
**Build later. Sleep now. MOB when you wake.**
