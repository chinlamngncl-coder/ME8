# MOB-DISC — Manual and language closure audit V1

**Date:** 2026-08-26  
**Status:** DISC only — no code. Checklist for later named APPLYs.  
**Invoke:** `MANUAL-AND-LANGUAGE-CLOSURE-AUDIT-V1`

---

## 1. Manuals inventory (EN + IT admin)

| File | Role | Gap vs Jul/Aug UI |
|------|------|-------------------|
| `docs/trial-ship/manuals/en/User-Manual.md` | Operator | **No** Tactical / Overwatch (AR) / Promote / Current View / Fixed Cameras as first-class. **No** Geo Tools area-open. **No** Investigation Window / VMS Command Shell / SOS→Investigation. Evidence §11 may lag Media Pool / triage / court package. Nav still Ops-centric; July settings hub / Aug VMS not reflected. |
| `docs/trial-ship/manuals/en/Configuration-Manual.md` | Installer | **No** Fixed Cameras (ONVIF/RTSP), stream roles, VMS volumes/zones. Trial license §11 may lag Setup HWID upload / `.lic` path. **No** Overwatch license module. Network/SIP OK baseline. |
| `docs/trial-ship/manuals/en/Quick-Guide.md` | First hour | Install + BWC + VC + trial only — **no** Tactical/Overwatch/Fixed/Geo. |
| `docs/IT-ADMIN-MANUAL.md` | IT (repo root, not trial-ship pack) | Logs / Setup PIN / Glass Fortress / ports / SIP — **no** operator product UI. OK as IT, but **not** in `docs/trial-ship/manuals/` pack path — confirm ship gather includes it if customers need it. |
| Locales `fil/id/th/ko/zh` under `docs/trial-ship/manuals/` | Translations | Same structural gaps as EN once EN is updated (do not translate ahead of EN lock). |
| `scripts/me8-ship/ph-kr-manuals-src/*/Installation-Guide.md` (+ Migration) | Ship install | Separate from trial-ship User Manual — audit for Fixed Cameras / license upload when closing manuals genre (out of trial-ship TOC but ship-critical). |

### User-Manual sections to refresh (by heading)

- §1 capability table — add Tactical / Overwatch / Fixed cameras / Geo Tools / Investigation  
- §4 / §15 nav — Settings hub naming; Tactical tab  
- **New chapter** — Overwatch (AR): Overview camera, Saved view / Current View, Use this View, PIP Promote, markers beyond 8  
- **New or §8** — Geo Tools (area → BWC + Fixed open counts)  
- §6 SOS — Investigation handoff if product-facing  
- §11 Evidence — Media Pool / docking monitor / holds if still wrong vs UI  
- §12 Command Wall — PTZ pad / fixed vs BWC if missing  
- Document map at end — link new chapters  

### Configuration-Manual sections to refresh

- **New** — Fixed Cameras registration (ONVIF vs RTSP), PTZ, presets / saved views  
- §11 Trial license → Setup Hardware ID + license upload (agent-packs / user-licenses voice)  
- Optional — license modules (Overwatch on/off)  

---

## 2. UI wording / jargon sweep (operator-visible)

| Location | Issue | Suggested direction (later APPLY) |
|----------|--------|-----------------------------------|
| `public/js/license-entitlements-ui.js` ~L224–230 | Banner: `fixed cams`, `pin live`, terse plan codes | Title-case chrome: **Fixed Cameras**, **Pin Live**, plain sentences |
| `public/locales/en.json` `tactical.poiStatusNoLink` | `Link a fixed cam first` | **Link a Fixed Camera first** |
| `public/locales/en.json` `tactical.arNoPtz` | Still “No overview PTZ cameras” | Stale vs code `tactical.arNoCam` / “No overview cameras” — sync or remove dead key |
| `public/js/tactical-ar.js` | New keys only as fallbacks: `arPromote`, `arCurrentView`, `arStatusPromoting`, `arStatusCurrentView`, `arNoCam`, `arStatusSwitching` | Add to `en.json` (+ other locales when EN locked) |
| `public/js/geo-tools.js` ~L156 | Toast `BWC N · Fixed N` | Already intentional (GEO-TOOLS-FIXED-COPY); keep unless product wants longer words |
| `public/locales/en.json` `server.readiness.license.missing` | Mentions `storage/platform-license.json` | Path-ish; prefer role label per path-disclosure rule if still shown to operators |
| Super-admin ONVIF field labels | `ONVIF User` / Port / Password | OK for IT chrome (acronym shouted); leave unless closing “operator vs IT” split |
| Code comments / `fixed:` ids in JS | Not operator-visible | No UI change |

**Not jargon (OK):** Overwatch (AR), Promote, Current View, Saved View, Fixed Camera (title case), BWC, SOS, PTZ when taught in manuals.

---

## 3. Unclosed visual / copy passes (testable **without** live video)

Close these with hard-refresh + UI look only (or mark PASS/WAIVE in disc). **Exclude** FLV/ANPR-live/pin-mirror/PTT/CW-cover that need streams.

| Doc | Status line | No-video check |
|-----|-------------|----------------|
| `docs/MOB-APPLIED-REDACTED-EXPORTS-EMPTY-HINT-V1-20260723.md` | operator verify | Evidence redacted empty hint copy |
| `docs/MOB-APPLIED-PRIOR-EXPORTS-ROW-COMPACT-UNIFY-V1-20260723.md` | operator verify | Prior exports row layout |
| `docs/MOB-APPLIED-PRIOR-TRIM-LABEL-AND-REMOVE-V1-20260723.md` | operator verify | Trim label / remove |
| `docs/MOB-APPLIED-PRIOR-FINALIZED-SUPERADMIN-ACTIONS-V1-20260723.md` | operator verify | Super-admin actions visible |
| `docs/MOB-APPLIED-REDACT-SPAN-LABEL-COPY-V1-20260723.md` | operator verify | Span label copy |
| `docs/MOB-APPLIED-REDACT-FINALIZE-DONE-NO-LOOP-V1-20260723.md` | operator verify | Finalize done state |
| `docs/MOB-APPLIED-REDACT-CLEAR-FINALIZED-PASSWORD-CONFIRM-V1-20260723.md` | operator verify | Confirm dialog copy |
| `docs/MOB-APPLIED-REDACTED-EXPORTS-EMPTY-SCROLL-COMPACT-V1-20260723.md` | operator verify | Scroll/compact empty |
| `docs/MOB-DISC-UI-DARK-FORM-CONTROLS-UNIFY-V1-APPLIED.md` | awaiting operator PASS | Form controls look |
| `docs/MOB-DISC-ANALYTICS-GRADE-FILTER-COMPACT-CHEVRON-V1-APPLIED-20260731.md` | operator verify | Grade filter chevron |
| `docs/MOB-APPLIED-PACKAGING-ROBOT-ISSUE-TEMPLATES-V1-20260725.md` | awaiting operator review | Template text review (no video) |
| `docs/MOB-DISC-RESTART-HEALTH-PRINT-HTTPS-4438-V1-APPLIED.md` (+ related) | awaiting operator PASS | Restart console print wording only |

**Park (need live video / radio — do not mix into manuals-closure visual day):**

- Pin wall / pin baseline / pin-link graft APPLIED “operator test pending”  
- ANPR live / FLV / Axiom unified FLV APPLIED await PASS  
- Command Wall fill/cover, VC layout, PTT group, tactical pin cluster fullview  

---

## 4. Recommended APPLY order (when closing this genre)

1. `MANUALS-EN-USER-CONFIG-OVERWATCH-VMS-V1` — EN User + Config (+ Quick one-pager touch)  
2. `UI-COPY-LICENSE-BANNER-AND-TACTICAL-KEYS-V1` — license banner + en.json Overwatch keys + poi “Fixed Camera”  
3. `DOCS-WAIVE-OR-PASS-NO-VIDEO-APPLIED-V1` — batch PASS/WAIVE the §3 table (status lines only)  
4. Locale / ph-kr install manuals — after EN lock  

**Not in this closure:** C1/C2 live site PASS (needs cams) — tracked in `MOB-DISC-VMS-OVERWATCH-AR-ENGINE-C1-NOTE-20260826.md`.
