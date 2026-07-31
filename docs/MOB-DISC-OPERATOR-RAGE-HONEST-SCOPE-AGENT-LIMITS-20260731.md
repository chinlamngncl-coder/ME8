# MOB DISC — Operator rage after CN-pack lab poison: honest scope + agent limits

**Date:** 2026-07-31  
**Status:** DISC — paper only  
**Tone:** Operator asked for honesty after serious lab harm (language/map turned China). This disc answers: *what did you touch?* and *can the agent “die”?*

---

## Can the agent “die” / can you change it?

| Question | Honest answer |
|----------|----------------|
| Can this chat agent shut down Cursor / “die forever”? | **No.** The agent cannot kill Cursor, your PC, ME8 server, or Docker. |
| Can you stop this chat / switch model / start fresh? | **Yes.** New chat, switch model in Cursor, or close the composer. That ends *this* thread’s context — not your product files. |
| Does swearing at the agent undo file damage? | **No.** Only restoring files / named APPLY does. Lab language/map restore was already APPLIED (`LAB-RESTORE-MAP-LANG-NOT-CN-V1`). |

**Pack ≠ lab** remains locked. Agent must not bake partner face into desk source again.

---

## Did the agent touch your functions? (honest inventory)

### A) Lab face (WRONG — caused your rage)

Changed **defaults** in lab source (later restored):

- `public/index.html` / `login.html` — language + map country metas → zh/cn/Jiangsu  
- Map fallbacks in `index.html`, `dashboard-boot.js`, `maplibre-primary.js`, `tactical-shell.js`  

**Restored:** default **en**, Singapore fallback, no forced `cn` meta.  
**If still Chinese after refresh:** browser `localStorage` (`fm_ui_lang`, `fm_map_country_v1`) — pick English or clear site data.

### B) ANPR Live UI (separate genre — layout only)

Touched **presentation**, not plate engine core for China:

- `public/js/anpr-live-watch.js` — rail 16 / 4×4, smaller live CSS coupling  
- `public/css/global.css` + `index.html` ANPR Live CSS  
- Does **not** mean China zip was rewritten by those Live MOBs  

### C) ANPR sidecar / whole-vehicle (earlier genre)

- `anpr-sidecar/vehicle_detect.py`, `pipeline.py` — whole-vehicle crop pad / plate-hull  
- Not the China pack zip contents for engines (zip still largely **without** anpr-sidecar)

### D) License / China pack scaffolding

- `lib/licenseManager.js` — `trial_wildcard` HWID skip + expiry still required  
- Root `master_license.json` — signed 365d trial (20 BWC / 10 IPC)  
- `scripts/PACK-CN-AXIOM-ENTERPRISE.ps1` — stage/zip; later updated so CN zh/cn injects **into dist only**  
- `dist/Mobility_Axiom_Deploy*` — scaffold zip (~83 MB) — **not** full Docker images / Node / ANPR-FR fat pack  
- GB / Jiangsu / setup bats from CN enterprise scaffold (compose env defaults, Setup scripts)

### E) What was NOT “rewritten as a new product”

- Firmware Gold / pin video cores (`video-wall.js` mirror path) — **not** the target of these MOBs  
- Fleet PTT/SIP cores — **not** rewritten for CN face  
- DeviceControl `udp_once` — **not** touched in this genre  

---

## Serious?

**Yes — baking zh/cn into lab was a serious mistake.**  
Operator was right to be angry. Pack and lab are two walls. That wall was crossed. Restore MOB exists; verify PASS on desk (English + non-China map).

---

## Lock

1. Agent cannot “die on command”; operator can leave the chat / switch model.  
2. Honest: lab language/map was poisoned then restored; ANPR Live CSS/JS changed; license trial + CN packer/zip exist; fat China appliance still incomplete.  
3. Next product work only after calm named `MOB-APPLY …` — one genre at a time.  
4. No code in this disc.
