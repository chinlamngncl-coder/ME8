# MOB DISC — Weapon catches black / misses clear gun (2026-08-07 ~16:27)

**Status:** disc only. No code until APPLY.  
**Operator:** “Shit. Only catches black. Real weapon shows — doesn’t catch. Only non-weapon. WTF.”

---

## Confirm (you are not crazy)

What you see matches a **bad smoke model + UI that does not draw boxes on live**.

Engine badge **OK** is true: `weapon-sidecar` on 8769, `weights_kind: pistol_smoke`, ready.

That does **not** mean accuracy is good.

---

## What the screenshot shows

| Surface | What it does today | Your read |
|---------|-------------------|-----------|
| Live 2×3 tile | FLV only — **no** gun box overlay | “Real gun in frame but nothing catches” |
| Recent rail | Context crop + label `gun · kk` when poller confirms | Dark clothes / TV text / doorway = “caught non-weapon” |

So: live can show a clear pistol while Recent still shows **old wrong** crops, or new crops that are **wide scene** around a false dark box — looks like “only black / only words.”

---

## What logs say (after sidecar restore)

Ticks around 16:24–16:26 on `…29000009`:

- Real detect again: `detect_ms` **400–2800**, not 3 ms  
- Mix of `hits:1/2` and `hits:0` even seconds apart → **unstable** on the same stream  
- New crops written ~16:24–16:25 (`wd_17860911…`) — pipeline **is** firing sometimes  

Poller gates (not “color = gun” code):

- Gun floor **0.35** (low → more dark false guns)  
- Need **CONFIRM_N = 2** streak before Recent  
- **DEDUPE ~20 s** — won’t spam new cards every tick even if gun stays in frame  

No rule says “if black → gun.” The **pistol-smoke head** (40 pistols, **0 negatives**, auto boxes) **behaves** like dark blobs = gun, and often **misses / flickers** on a clear hold-out gun in a garage (different look than train stills).

---

## Honest verdict

1. **False positives on black / screen / people** — expected weakness of this smoke weight. Fair product fail for ops trust.  
2. **“Doesn’t catch real weapon” on the live tile** — partly **missing overlay** (never built), partly **miss / flicker** from the same weak head + confirm/dedupe.  
3. **Market tools look better** — yes, with labeled boxes + negatives + often GPU. We already locked: off-the-shelf / smoke ceiling → fine-tune with **negatives**, not threshold theater alone.

---

## Recommendation (one path)

**Do not** keep “tuning conf down” to chase recall — that made black worse.

| Order | MOB | Why |
|-------|-----|-----|
| 1 | Operator: drop **negatives** (no-gun black clothes, hands, TV UI, garage empty) into `weapon-finetune-dataset/negative/` | Data the smoke lacked |
| 2 | `MOB-APPLY WEAPON-FINETUNE-NEGATIVES-AND-GATE-V1` | Rebuild COCO + retrain; raise gun floor until FP drop; keep 8769 = sidecar |
| Optional parallel (UI honesty) | `WEAPON-LIVE-BOX-OVERLAY-V1` | Draw detect box on live tile so “I see gun / model says X” is visible — **does not** fix accuracy alone |

**Temporary lab A/B (only if you APPLY):** rename/move `checkpoint_pistol_smoke.pth` aside → reload **Threat** weights and compare same video 5 minutes — proves smoke vs base, **no** destroy of smoke file.

---

## Standing

Wrong port / ai_engine mess is **fixed**.  
Remaining pain = **accuracy + no live box**, not “Fleet broken.”  
Zero creativity hardcode of “ban black.” Fix with negatives + retrain (or Threat compare) on APPLY.
