# MOB DISC — ANPR Live UI design (FR parity + industry logic)

**Date:** 2026-07-31  
**Status:** **DESIGN LOCK candidate — no code in this disc**  
**Named MOB (when design accepted):** `ANPR-LIVE-ZLM-WATCH-V1`  
**Operator:** APPLY named + “design like industry / like FR / sub-page?” + industry Live View screenshot  
**Related:** FR live (`fr-live-watch.js` / `fr-alarm.js`) · `MOB-DISC-ANPR-PRODUCT-LIVE-SNAPSHOT-LISTS-20260729.md` · ZLM fan-out disc · plate lists PASS

---

## Plain answers (first)

| Question | Answer |
|----------|--------|
| Do industry ANPR UIs look like your screenshot? | **Yes** — live feed + detection still + plate crop + meta + optional map + optional vehicle info |
| Does **our FR** already have this logic? | **Yes in structure** — live tiles + roster Start/Stop + crop/hit rail + HQ/toast/drawer on **list hit** |
| Should ANPR become a Face sub-page? | **No** — keep **Analytics → ANPR** with a new sub-tab **Live** (beside Snapshot \| Plate lists) |
| Paste the white vendor dashboard into Axiom? | **No** — steal **logic**, keep **Axiom dark enterprise** chrome |
| Code now? | **No** until you confirm this design (you asked Mob disc). Then `MOB-APPLY ANPR-LIVE-ZLM-WATCH-V1` means implement **this** layout |

---

## 1) What the industry screen is doing (logic, not paint)

Your Live View reference maps to **five jobs**:

```text
[A Live video]     [B Detection still + red hit bar]
        │                      │
        └──────────┬───────────┘
                   ▼
     [C Plate crop + OCR meta]  [D Map]  [E Vehicle make/model]
```

| Block | Job | Axiom V1? |
|-------|-----|-----------|
| **A Live** | Watch the camera while it moves | **Yes** — ZLM/FLV like FR tiles |
| **B Detection still** | Freeze the moment + box + loud plate/hit bar | **Yes** — on list hit (and optional last-read still) |
| **C LPR column** | Crop of plate + text + confidence + list | **Yes** — we already have crop+OCR+listMatch on snapshot |
| **D Map** | Where was the cam / hit | **Later / light** — reuse FR “go map” if GPS; not a full embedded map widget in V1 |
| **E MMR make/model/colour** | Vehicle attributes | **Out of V1** unless engine already returns colour; no invent MMR module |

**Hit vs read:** Industry red bar = **alert**. Same as FR: rail/score can be quiet; **list match** = toast / HQ / drawer.

---

## 2) What FR already gives us (reuse pattern)

Face is **one** Analytics panel — not a separate app:

| FR piece | Operator meaning | ANPR twin |
|----------|------------------|-----------|
| 6 live tiles + roster Start/Stop | Pick BWCs, watch live | Same idea — **fewer tiles OK** (1–4) for plate CPU |
| Crop / Known-subjects rail | Recent faces / matches | Recent **plate crops** + list badge |
| `fr-blacklist-hit` → HQ + toast + drawer | Watchlist hit | `anpr-list-hit` (new) → **same alert chrome family** (or shared helper) |
| Offline hit = alert only | No auto Ops storm | Same rule when offline ANPR exists |

FR does **not** already do plates. Do **not** put plate live inside `#ax-panel-face`. That mixes Face watchlist with plate lists and confuses license/ops.

---

## 3) Recommended Axiom design (one path)

### Home

**Analytics → ANPR** subnav becomes:

| Sub-tab | Exists? | Role |
|---------|---------|------|
| **Live** | **New** | Continuous ZLM watch + hits |
| **Snapshot** | Yes | Photo / crop / Read plate |
| **Plate lists** | Yes | Blacklist / Wanted / Suspicious CRUD |

Same hub, same dark cards, compact controls, visible select carets — **not** a new white “Live View” skin.

### Live sub-tab layout (logic = industry, chrome = FR/Axiom)

```text
┌─────────────────────────────────────────────────────────────┐
│ ANPR Engine — OK (pill)     [BWC roster] [Start] [Stop]     │
├──────────────────────────────┬──────────────────────────────┤
│  Live tile(s)  (FLV/ZLM)     │  Last detection still          │
│  Connecting → Live           │  plate box overlay (if any)    │
│                              │  red/grade hit strip when list │
├──────────────────────────────┴──────────────────────────────┤
│  Recent plate rail (crops)   │  Hit detail card                 │
│  plate · conf · list badge   │  plate · list · cam · time       │
│                              │  [Ack] [Open map if GPS]         │
└─────────────────────────────────────────────────────────────┘
```

**Operator flow (locked):**

1. Open **ANPR → Live**  
2. Pick BWC(s) from roster (FR-like) → **Start watch**  
3. Video plays from **existing WVP/ZLM** (no second invite storm)  
4. Worker samples low FPS → detect → OCR → **same plate-list matcher** as Snapshot  
5. Every read can update “last still” + rail  
6. **List hit only** → loud alert (toast/HQ/drawer family) + grade colour (Suspicious / Wanted / Blacklist)  
7. Snapshot + Lists tabs unchanged; same engine + same lists  

### Alerts

- Reuse FR alert **patterns** (HQ bar / toast / drawer / chime) — plate wording, not face dossier  
- Live BWC hit: allow map/ops rules later by grade (separate small MOB if needed)  
- Do **not** auto-jump Ops for investigation/offline sources (parity disc)

### Backend (same MOB or immediate follow — do not split invent)

- Attach to ZLM play URL already used by live player  
- Cap concurrent ANPR cams + low `process_fps`  
- Emit socket event e.g. `anpr-list-hit` / `anpr-crop-tick`  
- Detail in `MOB-DISC-ANPR-ZLM-WORKER-STREAM-FANOUT-20260729.md`

---

## 4) Why sub-page under ANPR (not Face)

| Put Live under ANPR | Put Live under Face |
|---------------------|---------------------|
| Plate lists already here | Face = people watchlist |
| License `analyticsAnpr` | Wrong feature gate |
| Snapshot + Live share engine | Confuses operators |
| Matches locked product disc | Breaks “ANPR nav” story |

**Sub-page = ANPR subnav tab “Live”.** Not a new top-level app. Not Face child.

---

## 5) V1 scope vs later (so we don’t boil the ocean)

| V1 in `ANPR-LIVE-ZLM-WATCH-V1` | Later |
|-------------------------------|--------|
| Live sub-tab UI (FR-like desk) | Full 3-col map+MMR vendor clone |
| 1–4 live tiles + roster Start/Stop | 6-tile parity if CPU OK |
| Last still + hit strip + plate rail | Rich event history search |
| List match → alert chrome | Make/model MMR module |
| ZLM sample worker + events | Offline video ANPR desk |

---

## 6) Risk (why design before code)

| Risk | Mitigation |
|------|------------|
| Live ANPR melts CPU | Cap cams + low FPS; license limit |
| Second invite to BWC | ZLM consumer only |
| UI looks like pasted vendor white theme | Axiom tokens only |
| Hit storm / Ops jump | List-hit alerts; FR offline rules for non-live |
| Bundle Snapshot rewrite | Leave Snapshot/Lists IDs alone |

---

## 7) APPLY (when you accept this design)

```
MOB-APPLY ANPR-LIVE-ZLM-WATCH-V1
```

Means: implement **this** disc (ANPR → **Live** sub-tab + ZLM watch + list-hit alerts), not a greenfield white dashboard and not Face embedding.

If you want a thinner first cut (UI shell only, worker next), say so explicitly as a named split — default is **one MOB** with UI + worker enough for operator PASS on one lab BWC.

---

## Lock record

| Item | Decision |
|------|----------|
| Industry screenshot | Logic reference — not pixel clone |
| FR already “has it”? | **Pattern yes, plates no** |
| UI home | **ANPR sub-tab Live** |
| Face panel | **Do not** host ANPR live |
| Map / MMR | Map light later; MMR out of V1 |
| Code in this disc | **None** |
