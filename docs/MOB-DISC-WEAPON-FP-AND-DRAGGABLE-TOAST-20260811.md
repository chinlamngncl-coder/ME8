# MOB DISC — Weapon FP (trees/map) + draggable analytic toasts — 2026-08-11

**Status:** Got it. **No code this turn.**  
**Read:** `.cursorrules` · one APPLY at a time · simple finish ladder still applies.

---

## What you confirmed

| Good | Bad |
|------|-----|
| Short gun **can** detect (Engine OK + real hit toast) | **False positives:** trees, aerial map, “rubbish” stills labeled `gun · kk` / knife |
| Alert path works (Recent rail + **Weapon detection** overlay toast) | Toast **cannot move** → blocks video / map while watching |

---

## Part A — Rubbish / trees as gun (model quality)

**Not a port bug.** Sidecar is scoring frames; confidence clears `gun ≥ ~0.35` on non-weapon texture (foliage, map UI, phone UI).

| Fix path | Notes |
|----------|--------|
| **Colab Track B negatives** (already in plan) | More **hard negatives**: trees, map/satellite UI, YouTube chrome, indoor clutter — then `WEAPON-B-NEGATIVES-RELOAD-V1` |
| Raise `conf_gun` slightly | Fewer FP, may miss weak guns — only with named APPLY + lab prove |
| Confirm streak / debounce | Already has confirm/dedupe; won’t stop all FP alone |

**Industry:** weapon AI on BWC always needs site negatives; map-on-screen and foliage are classic FP. Product PASS = “clear gun hits + Ack”; perfect zero FP on phone-of-map is train/threshold work, not toast drag.

**Queue:** stay on **Weapon Colab / reload** for FP (Step 0 of simple ladder). Don’t invent a separate “trees MOB” until after more negatives + reload smoke.

---

## Part B — Analytic Ack overlay toast must move (UX)

**Got it.** Fixed bottom-right toast blocking Live / map is **not** acceptable for control-room use.

| Rule | Meaning |
|------|---------|
| **Every analytic pop-out toast** (Weapon, and same pattern for FR / ANPR if same chrome) | Operator can **drag** by header (or grip) to clear video/map |
| Position | Remember for session (optional: localStorage) |
| Not | Don’t redesign Ack / Cases / Open / Map buttons |

Today Weapon toast is **position-fixed**, no drag (code path in `weapon-alarm.js` toast/HQ). FR/ANPR may share the same pain — APPLY should cover **shared pattern** or Weapon first then mirror.

**Recommended APPLY (ops UX, after or beside Colab):**

`MOB-APPLY ANALYTIC-TOAST-DRAGGABLE-V1`

Scope (locked for when you APPLY):

1. Drag Weapon detection overlay toast by title bar.  
2. Same for FR / ANPR alert toasts if they use the same overlay style (parity — one MOB).  
3. No layout freestyle beyond drag; keep ids/`data-*`.  
4. Out of scope: FP model train, conf changes.

---

## Order (fits your simple ladder)

1. Finish **Weapon negatives Colab + reload** (cut trees/map FP).  
2. **SMOKE** gun still hits; fewer tree/map FP.  
3. **`MOB-APPLY ANALYTIC-TOAST-DRAGGABLE-V1`** so Ack toast never permanently blocks wall/map.  
4. Then ANPR Colab genre as planned.

If toast blocks you **today** during Colab testing, you may APPLY **drag first** (Pri swap) — say so.

---

## Next (you pick one)

```text
MOB-APPLY ANALYTIC-TOAST-DRAGGABLE-V1
```

or keep Colab / 

```text
MOB-APPLY WEAPON-B-NEGATIVES-RELOAD-V1
```

No code until that APPLY.
