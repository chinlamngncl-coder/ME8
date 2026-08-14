# MOB DISC — VIDEO-POPOUT-MINIMAP-V1 — plan + risk — 2026-08-11

**Status:** PAPER ONLY — no code until exact `MOB-APPLY VIDEO-POPOUT-MINIMAP-V1`.  
**Read:** `.cursorrules` · Firmware Gold · AxiomFlvManager only · one MOB at a time for **product edits**.  
**Parallel OK:** You run ANPR Colab on your side; agent codes this MOB **only after APPLY** — different machines/tasks, same day fine.

**Weapon tile expand:** PASS (already done).

---

## Goal (Mode B)

| | Ops (Mode A — keep) | Pop-out (Mode B — build) |
|--|---------------------|---------------------------|
| Stage | Map + running pin | **Large live video** |
| Overlay | Small video | **Small map + same pin moving** |
| Chrome | Existing | Mini-map **draggable + resizable** |

Opposite of Ops. One cam focus (the popped cam).

---

## Recommended plan (single path)

**Do not** rewrite Ops map or touch Firmware Gold pin-mirror.

### V1 scope (shippable slice)

1. **Surface:** video pop-out window/page for **one cam** (reuse existing pop-out entry if present; else thin `?popout=video&cam=` shell — decide at APPLY from current `matrix` / wall pop-out path only).  
2. **Video:** `AxiomFlvManager.attach()` only; live-edge chase rules unchanged; on close → `detach` → `pause` → `unload` → `destroy`.  
3. **Mini-map:** **second** Leaflet (or map lib already in app) in its **own** DOM node — **not** the Ops `#map` node.  
4. **Pin:** subscribe to same fleet GPS / camId feed; show **that cam’s pin**; pan/follow lightly (optional center-on-update).  
5. **Panel:** floating box — drag by header, resize handle, session size/pos optional.  
6. **Out of V1:** multi-cam pins on mini-map, draw tools, full Ops chrome clone, Weapon/FR/ANPR parity beyond the pop-out you open from.

### Build order inside the MOB

| Step | Work |
|------|------|
| A | Pop-out shell + large FLV for one cam (if shell incomplete) |
| B | Mini-map container + tile layer + one pin |
| C | GPS bind + destroy on close |
| D | Drag + resize chrome |
| E | Operator PASS checklist |

---

## Risk analysis

| Risk | Level | Mitigation |
|------|-------|------------|
| Touch Firmware Gold pin / dual JSMpeg on Ops | **High** | **Never** edit wall pin-mirror path; Mode B is separate window |
| Second FLV player leak / crash | **High** | Strict destroy on unload/close; one attach per pop-out |
| Two maps fighting one DOM / one Leaflet id | **Med** | Own container + own map instance |
| GPS lag / pin stuck | **Med** | Same socket/API as Ops; smoke with moving BWC |
| Ops map freezes when pop-out open | **Med** | No shared mutable map singleton without clone |
| Scope creep (full GIS in pop-out) | **Med** | V1 = one pin + drag/resize only |
| Parallel with Colab confuses APPLY | **Low** | Colab = your GPU; this MOB = UI only after you type APPLY |
| Credit burn / giant `index.html` tour | **Med** | Prefer small new js + CSS in `global.css`; no rewrite |

**Verdict:** Doable. Risk is **manageable** if scoped to **new pop-out chrome** and **zero** Ops pin-video edits.

---

## Parallel with Colab (how we work)

| You | Agent |
|-----|--------|
| ANPR dataset Colab / train / ONNX when ready | Idle on ANPR until `ANPR-DETECT-DATASET-PACK-V1` / reload APPLY |
| After you type `MOB-APPLY VIDEO-POPOUT-MINIMAP-V1` | Implement Mode B only |
| Hard refresh → PASS/FAIL pop-out | No Colab invent in same APPLY |

Do **not** mix ANPR weights + minimap in one APPLY.

---

## Operator PASS (Mode B)

1. Open video pop-out for cam **kk**.  
2. Large video live.  
3. Small map shows **kk** pin; pin **moves** with GPS.  
4. Drag map panel; resize larger; video stays live.  
5. Close pop-out; reopen Ops — map + pin still OK; no frozen player.

---

## One next step

When you want code (Colab can wait or run on your side):

```text
MOB-APPLY VIDEO-POPOUT-MINIMAP-V1
```

Until then: no product edits for this item.
