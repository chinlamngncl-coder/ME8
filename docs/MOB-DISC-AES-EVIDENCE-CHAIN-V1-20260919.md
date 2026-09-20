# MOB DISC — AES Evidence Chain (court / police) — 2026-09-19

**Status:** paper lock only. No product code in this MOB.  
**APPLY:** `MOB-DISC AES-EVIDENCE-CHAIN-V1`  
**Depends on:** `MOB-DISC-AES-USIP-SIMPLE-V1-20260919.md` (Type A simple AES first; Type B cert later)

**Not this MOB:** VideoTag code, file decrypt code, cert/PKI, live FLV crypto, edits to `lib/sipServer.js` / `lib/pttServer.js`.

---

## Operator meaning (plain English)

BWC / dock **only encrypt**.  
Axiom must:

1. Keep evidence **locked** on the server  
2. **Unlock only to play** inside Axiom  
3. If media **leaves** (download / export / USB out) → leave **still packed**  
4. Same rules for **Evidence, Trace, FTP, dock**, and any other play surface  

Target users: **court / police** — custody and audit matter as much as the video.

---

## One sentence (locked)

**Encrypt at camera/dock → store locked on Axiom → unlock only to watch → pack again when it leaves.**

---

## End-to-end chain (locked)

| Step | Who | What |
|------|-----|------|
| 1 Record | BWC or dock | AES on → file named like `name-AES.mp4` / `.jpg` / `.wav` |
| 2 Arrive | FTP / dock USB / upload | Land on Axiom **as encrypted** — do not auto-save a permanent open copy |
| 3 Key notice | Cam (Type A) | SIP **VideoTag** MESSAGE when used; Axiom unwraps per simple AES disc |
| 4 Store | Axiom | At-rest stays locked (`*-AES.*` and/or vault rules named on code APPLYs) |
| 5 Play | Axiom UI | Decrypt in memory or **short-lived temp** → play → **wipe** open copy |
| 6 Leave site | Export / download | Re-pack: AES file and/or **password court zip** — plain open file is **not** the normal take-away path |
| 7 Audit | Axiom | Log who played / exported / decrypted (user, time, file / case id) |

**Live wall (FLV)** is a **different** pipe. File AES ≠ live stream crypto. Do not mix.

---

## Surfaces that must share one decrypt path

| Surface | Rule |
|---------|------|
| Evidence | Play AES; store locked |
| Trace / timeline / clips | Same helper as Evidence |
| SOS / HQ clips if AES | Same helper |
| FTP ingest | Accept `*-AES.*`; do not reject on name |
| Dock | Same file format as BWC (vendor confirm); same ingest + play |
| Any future play tile for file media | Call the **same** decrypt module — no per-page copy |

AES **off** media must still work (mixed fleet).

---

## Two AES families (do not confuse)

| Family | Role |
|--------|------|
| **USIP Type A** (`*-AES.*` + VideoTag) | Cam / dock file crypto from paid SDK |
| **Axiom vault / court zip** (existing product pieces) | Server secrets / export zip — **not** a substitute for USIP file decrypt |

Code MOBs must say which family they touch. Do not pretend one replaces the other.

Type **B** (certificate AES) = later, after Type A PASS + vendor.

---

## Roles and keys (SOP lock)

1. Only allowed roles can **play** or **export** AES media.  
2. Master / wrap keys: site secret config only — **never** UI, `en.json`, manuals, or customer ship packs.  
3. Keys must not travel by chat / email / USB stick as normal SOP.  
4. Shared “everyone is admin” login is **not** court-ready custody.

---

## PASS criteria (when code MOBs are done)

| Check | PASS |
|--------|------|
| AES on BWC/dock | `*-AES.*` arrives via FTP or dock |
| Play in Evidence | Operator sees picture/sound; disk does not keep a lasting open twin |
| Trace / other wired surfaces | Same file plays without a second hack |
| Export / download | File that leaves is still packed (AES and/or password zip) |
| AES off | Normal files still play |
| Audit | Play/export shows in log with user + time |

---

## Gaps (honest — must not miss)

### Product (not built yet for USIP Type A)

1. VideoTag ingest + unwrap  
2. `*-AES.*` file decrypt helper  
3. Wire helper into **all** file-play paths (Evidence, Trace, SOS clips, …)  
4. Export/download stay packed  
5. Temp plaintext cleanup (no leftover open files)  
6. Audit who opened / exported  
7. Dock format confirm = same as BWC  
8. Type B cert — after A PASS  

### SOP / risk (process, not only code)

| Risk | Why it matters |
|------|----------------|
| Keys shared casually | Breaks court story |
| Auto-decrypt whole library to disk | Stolen PC = open evidence |
| Export without pack/password | Media leaves site open |
| AES-on / AES-off unlabeled in case pack | Wrong exhibit in court |
| Dock format differs from BWC | Files won’t open |
| No hash / chain note on export | Integrity challenge |
| Live stream confused with file AES | Wasted MOBs / false “broken AES” |

---

## Code MOB order (after this paper)

1. **`AES-USIP-VIDEOTAG-V1`** — A1 key notice  
2. **`AES-USIP-FILE-DECRYPT-V1`** — A2 decrypt helper  
3. **`AES-EVIDENCE-PLAY-WIRE-V1`** — Evidence (+ agreed surfaces) use the helper; wipe temp  
4. **`AES-EXPORT-STAY-PACKED-V1`** — download/export leave packed + audit  
5. Dock confirm / FTP edge cases — only if vendor or lab shows a gap  
6. Type B cert — separate disc + vendor  

One APPLY at a time. Operator PASS between steps.

---

## Not in this MOB

Code, UI, key files, vendor cert letter, ship pack changes.  
