# MOB DISC — Weapon: slow crop, knife weak, shotgun miss (2026-08-06)

**Status:** disc only. No code until APPLY.  
**Operator:** context crop better (1 whole-body hit). Still: **cropping slow**; **knife not accurate**; **shotgun carried earlier not captured**.

---

## What is working

- Engine OK + already-live video + Recent fill.  
- Context crop MOB helped — you got **at least one person-in-frame** hit. Good.

---

## Why it feels slow (not “bad CSS”)

v1 path is stacked delay:

1. Still grab from live FLV (~1–2s ffmpeg)  
2. Poll every **~3s** (`FM_WEAPON_POLL_SEC`)  
3. Need **2 confirming frames** (`CONFIRM_N`) before Recent keeps a hit  
4. RF-DETR + big context JPEG encode  

So first useful Recent can land **~6–12s** after the weapon is visible. That is by design of the stills MOB, not magnify.

Click Recent → lightbox (CONTEXT-MAG) should still work on **new** hits after hard refresh. If click does nothing, say so — separate chrome bug.

---

## Why knife feels wrong

Locked weights: **Subh775 Threat RF-DETR** (research card). Classes we allow: **gun + knife** only.

Knife on CCTV / BWC is hard: phone, tool, stick, fence line → false gun/knife or miss. Author said not deployment gospel. **Tightening knife** needs threshold / class gate / lab reject list — not more pad on the crop.

## Why shotgun was not captured

Same model labels a broad **“gun”** — long gun / shotgun in profile or on shoulder is often:

- below confidence floor (`FM_WEAPON_CONF` default **0.50**), or  
- never two clean frames while walking, or  
- still poll missed the moment (3s + confirm).

We do **not** have a separate “shotgun” class. Miss ≠ “forgot shotgun type” — it missed the **gun** detect for that pose/time.

Live tile can show the person; Recent only keeps what the still path confirmed.

---

## Recommendation (one next MOB)

Fix **speed first** (ops trust). Accuracy tuning second.

### `WEAPON-STILL-FASTER-V1`

1. Poll **2s** (or 1.5s) default instead of 3s.  
2. Keep **2-frame** confirm (do not drop to 1 — false Recent storm).  
3. Reuse last good JPEG path / skip redundant work where safe (no silent INVITE).  
4. Log one line per cam: grab_ms + detect_ms (so we can see which half is slow).

**Not in that MOB:** knife threshold surgery, shotgun class, alarm/nearby.

### After PASS — next disc

**`WEAPON-CLASS-THRESH-LAB-V1`** — raise knife floor or gun-only until knife PASS; optional slightly lower gun conf for long guns in lab only. Separate APPLY.

---

## APPLY when ready

`MOB-APPLY WEAPON-STILL-FASTER-V1`
