# MOB DISC — Firmware Gold + pin mirror (2026-07-06)

**Status:** Sealed — tag `me8-firmware-gold-20260706`, VERIFY OK **2349/2349**  
**Search terms:** `pin mirror`, `Open All`, `Live streaming`, `firmware gold`, `CREATE shim`, `dual JSMpeg`, `preparePinVideoWallResync`, `Google verify`, `WebSocket count`

**Google AI verification (4 questions):** `docs/MOB-DISC-GOOGLE-PIN-CANVAS-MIRROR-VERIFY.md`

**Primary restore:** `RUN RESTORE-ME8-FIRMWARE-GOLD` → `RESTORE-ME8-FIRMWARE-GOLD.ps1`  
**Rules doc:** `docs/ME8-FIRMWARE-GOLD-LOCKED.md`  
**Baseline:** `BASELINE-ME8-FIRMWARE-GOLD.md`

---

## Symptom (what the operator saw)

- Wall panels show live video.
- Map pins stuck on **“Live streaming…”** (especially **Open All** with colocated Chin + kk).
- Sometimes pins flicker or never decode while wall is fine.

---

## What agents did wrong (do not repeat)

### Pin video MOBs (broke live pins)

| MOB / action | Mistake | Result |
|--------------|---------|--------|
| `mob-me8-single-connect-sync` | Blind early return when `mapPlayers.has(cam)` — blocked reattach when player was dead | **FAIL** — reverted |
| `mob-me8-restore-pin-lock` | Restored `ae7d644` lock without reading rule 1 in `ME8-EIGHT-BWC-RULES.md` | Still broken — dual WS + strip loop |
| Dual pin JSMpeg | Second WebSocket per cam on the pin while wall already owns JSMpeg | WS storm, starvation, decode never wins |
| `preparePinVideoWallResync` (index.html) | Stripped pin canvas on every wall sync | Destroy loop — pin never holds a frame |
| `repairOpenPinPopupVideos` / 450ms retry | Painted “live” without decode; fought mirror teardown | Fake “Live streaming…” overlay |
| Default restore to **me8-v1** or Trial Gold | Pre-mirror baseline — no canvas mirror | Wasted time; pins still wrong |

### Firmware Gold lock MOBs (broke baseline scripts)

| Mistake | What happened |
|---------|----------------|
| **Root shims in CREATE `$paths`** | `CREATE-ME8-FIRMWARE-GOLD.ps1` listed `CREATE/VERIFY/RESTORE-ME8-FIRMWARE-GOLD.ps1` at repo root. Those are **1-line delegates**. CREATE copied them **into** `baseline/2026-07-06-me8-firmware-gold/`, overwriting the real VERIFY/RESTORE scripts. VERIFY then called itself forever or “passed” with nonsense. |
| **Recursive full-tree CREATE** | Agent replaced allowlist CREATE with `Get-ChildItem -Recurse` → **7290 files**, nested `baseline/baseline/…` junk, wrong manifest. |
| **Deleted baseline `*.ps1` before re-CREATE** | Left folder with no CREATE script; recovery harder. |
| **`StrReplace` on `video-wall.js` from `good code` workspace** | File saved as **UTF-16** twice — browser/server parse break. **Never** use Cursor StrReplace on ME8 `video-wall.js` from the wrong tree. Use PowerShell/Python UTF-8 no BOM. |
| **Declared VERIFY OK without reading output** | Exit code 0 while stderr showed `CommandNotFoundException` — shim was corrupted. |

---

## What actually works (checkpoint PASS)

**Product rule (non-negotiable):** One WebSocket owner per cam. Wall owns JSMpeg; **pin mirrors wall canvas** — no second WS on the pin.

### `public/js/video-wall.js`

- `attachMapPopupPlayer`: when wall canvas is decoded → `destroyMapPlayer` + `startMapMirrorFromWall` (do **not** call `attachCanvasPlayer` on the pin).
- `startMapMirrorFromWall`: RAF copies wall canvas → pin; first frame sets decoded state, hides overlay.
- `camHasActiveLiveVideoSurface`: when `mapPinMirrorActive`, do not count pin-only JSMpeg surface.
- `playMapPinVideoIfPopupOpen`: return early if mirror active.

### `public/index.html` (pin sync block only)

- `preparePinVideoWallResync`: **never** strip when mirror active, wall decoded, or wall has player; **never** strip `map-pin-mirror-canvas`.
- `pinPopupHasVisibleVideo`: mirror active + mirror canvas = live.
- `syncPinVideoFromWall`: skip 450ms retry when mirror active.
- `repairOpenPinPopupVideos`: `hasMirror` counts as live.

**Cache bust:** `video-wall.js?v=20260705-pin-mirror-complete`

---

## Firmware Gold — how to seal a lock (agent checklist)

**Tree:** `C:\Users\user\Desktop\Enterprise Mobility\ME8`

1. **CREATE script = allowlist** (copy `baseline/2026-07-01-me8-v1/CREATE-ME8-V1.ps1` pattern).  
   **Do not** use recursive `Get-ChildItem` on the whole repo.

2. **`$paths` must NOT include** repo-root:
   - `CREATE-ME8-FIRMWARE-GOLD.ps1`
   - `VERIFY-ME8-FIRMWARE-GOLD.ps1`
   - `RESTORE-ME8-FIRMWARE-GOLD.ps1`  
   Those live at ME8 root as **delegates only**:
   ```powershell
   & "$PSScriptRoot\baseline\2026-07-06-me8-firmware-gold\VERIFY-ME8-FIRMWARE-GOLD.ps1" @args
   ```
   Real scripts live **only** under `baseline/2026-07-06-me8-firmware-gold/`.

3. **Run CREATE** from baseline folder:
   ```powershell
   cd "C:\Users\user\Desktop\Enterprise Mobility\ME8"
   .\baseline\2026-07-06-me8-firmware-gold\CREATE-ME8-FIRMWARE-GOLD.ps1
   ```

4. **Run VERIFY** — read the last lines; must say:
   ```text
   VERIFY OK - live ME8 matches ME8 Firmware Gold byte-for-byte.
   Match: N / N
   ```
   Not just exit code 0.

5. **Update** `BASELINE-ME8-FIRMWARE-GOLD.md` with file count + date.

6. **Git:** commit `MANIFEST.json`, `HASHES.json`, fixed `CREATE-ME8-FIRMWARE-GOLD.ps1` only (see `.gitignore`). Tag when user authorizes push.

7. **Fresh clone:** checkout tag → run CREATE locally to populate snapshot folder (full ~2349 files on disk; git tracks scripts + manifest only).

---

## If pins break again — agent order of operations

1. **Stop patching.** Do not stack MOBs.
2. **Restore floor:** user types `RUN RESTORE-ME8-FIRMWARE-GOLD` (AI runs it only on that phrase).
3. `RESTART-FLEET.bat` → operator hard refresh once.
4. Smoke: one cam live → stop → Open All lite → stop all.
5. If still broken after **full** restore, read this doc + `ME8-EIGHT-BWC-RULES.md` rule 1 before any new MOB.
6. **Forbidden** without explicit user MOB: dual pin JSMpeg, `mapPlayers.has` blind guard, strip `map-pin-mirror-canvas`, restore to me8-v1 for pin issues.

---

## Operator is not tech

Agent owns: git, VERIFY, logs, encoding, cache bust, reading CREATE output.  
Operator: restart, hard refresh once, report pass/fail from what they see.  
Do not ask operator for DevTools, cache clears, or log hunts.

---

## Related

- `docs/ME8-FIRMWARE-GOLD-LOCKED.md` — frozen files + forbidden edits
- `docs/ME8-EIGHT-BWC-RULES.md` — architecture rule 1 (one WS, pin mirrors wall)
- `docs/ME8-CHECKPOINT-RITUAL.md` — after risky live video MOB
- Brand naming: `docs/MOB-DISC-BRAND-NAMING.md` (SaaS Mobility / Lab copy)
