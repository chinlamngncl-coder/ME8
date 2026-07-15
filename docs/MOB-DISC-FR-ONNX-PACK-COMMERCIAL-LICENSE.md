# MOB DISC — InsightFace ONNX pack commercial legal risk

**Status:** DISC + gate for `mob-fr-onnx-pack-upgrade`  
**Date:** 2026-07-14  
**Not legal advice** — confirm with counsel before customer ship / tender.

---

## Short answer

| Piece | License | Commercial product ship? |
|-------|---------|---------------------------|
| InsightFace **Python library / code** | **MIT** | Yes (with notices) |
| Pretrained packs **`buffalo_sc` / `buffalo_l` / `buffalo_*` / antelope** | **Non-commercial research only** (InsightFace model policy) | **No** — without a **separate commercial model license** from InsightFace |

**Upgrading `buffalo_sc` → `buffalo_l` does not create a new legal class.**  
You are **already** on a non-commercial-restricted model pack in lab. `buffalo_l` is the same vendor policy, stronger weights.

Commercial / tender ship of Ubitron FR that **embeds these weights** needs one of:

1. **Paid commercial license** for the OSS recognition pack — InsightFace contact: `recognition-oss-pack@insightface.ai` (also see insightface.ai enterprise licensing pages), **or**  
2. **Different recognition stack** with clear commercial rights (licensed SDK, self-trained weights you own, etc.).

---

## What MOB-APPLY is allowed to do

| Allowed now | Not allowed by this MOB |
|-------------|-------------------------|
| Lab / R&D: switch pack to `buffalo_l` to **prove ≥70%** | Claiming pack upgrade = **customer-ship cleared** |
| Document the license gate in ME8 docs | Hiding buffalo / InsightFace model terms |
| Keep DeepFace / other engines as rollback paths | Bundling “we licensed it” without a signed agreement |

**Lab proof ≠ ship entitlement.**

---

## Operator / ship desk checklist

Before **customer zip** with ONNX FR enabled:

- [ ] Written commercial license covering the pack you ship (`buffalo_l` or whatever is selected)  
- [ ] Scope matches deploy (on-prem, seats, territory)  
- [ ] `THIRD-PARTY-NOTICES` / ship-desk OSS list updated for InsightFace **code** (MIT) + **model commercial grant** note  
- [ ] If no license yet: ship with FR **off** / alternate cleared engine — do not “quietly” ship buffalo weights

---

## Bottom line

**Yes — commercial legal risk is real** for any InsightFace pretrained buffalo pack.  
**Lab upgrade to `buffalo_l`:** OK to chase match quality at 70%.  
**Customer ship:** blocked until commercial model license **or** engine swap.

Related APPLY: `mob-fr-onnx-pack-upgrade` (lab pack + re-embed + re-debug).
