# MOB DISC — Lab map went China because pack leaked into source (WRONG)

**Date:** 2026-07-31  
**Status:** DISC — **lab FAIL** caused by agent; **no code in this disc**  
**Operator:** *Why is my map China? Packing China and my software are 2 different things right?*  
**Answer:** **YES — two different things.** Agent violated that wall.

---

## Plain English

**Packing a China partner zip** must change **only the zip / staging**.  
**Your lab ME8** must stay **your** map / language / country.

Agent **wrongly edited the live lab source** while doing CN pack scaffolding:

| Lab file (source tree) | Wrong change |
|------------------------|--------------|
| `public/index.html` meta | `fm-default-lang=zh`, `fm-locales=zh,en`, `fm-map-countries=cn` |
| `public/index.html` map fallback | Singapore `1.3521, 103.8198` → Jiangsu `32.0617, 118.7630` |
| `public/login.html` meta | same zh defaults |
| Other JS fallbacks (`dashboard-boot.js`, `maplibre-primary.js`, `tactical-shell.js`, `mobility-map-gis.js` cn preset) | Jiangsu / CN partner defaults baked as **product defaults** |

So your desk opens Analytics/map → **China / Chinese** — because **lab source** was poisoned, not because you chose China.

The packer was *supposed* to inject CN-only bits **into `dist/…` staging HTML**. That part can stay for the partner zip. **Lab source must not wear the partner face.**

---

## Locked wall (life and death for pack vs lab)

| Genre | May change |
|-------|------------|
| **China pack** | `scripts/PACK-CN-*.ps1`, `dist/Mobility_Axiom_Deploy/**` only, pack README, trial license for zip |
| **Lab software** | Your normal ME8 defaults (EN / your map — historically SG fallback `1.3521, 103.8198` unless you say otherwise) |

**Forbidden:** “While packing China, also set lab to zh/cn/Jiangsu.”  
**Forbidden:** Mixing ANPR Live CSS chats with China pack chats with lab map defaults.

Agent already admitted this risk in `MOB-APPLIED-CN-AXIOM-ENTERPRISE-PACK-20260731.md` (“if lab should stay EN/SG, revert”) — then **left the poison in**. That is on the agent.

---

## What to do (one named APPLY — when you order it)

`LAB-RESTORE-MAP-LANG-NOT-CN-V1`

1. Restore lab `public/index.html` / `login.html` metas to **non-CN** lab defaults (e.g. `en` default; map countries **not** forced `cn`).  
2. Restore map fallback coords to **pre-CN** lab (Singapore `1.3521, 103.8198` unless you name another site).  
3. Keep **CN inject only inside packer** for `dist/` zip (partner still gets zh/cn when they unzip **their** pack).  
4. **Do not** touch ANPR Live layout in that MOB.  
5. Hard refresh lab → map/lang **not** China.

**PASS:** Lab map/language back to your desk (not Jiangsu/zh). Partner zip (if rebuilt later) can still be Chinese via packer-only inject.  
**FAIL:** Lab still opens China after refresh.

---

## Lock

- Pack ≠ lab. Operator is right.  
- Lab China map = **agent error**, not operator request for desk.  
- **No revert code until:** `MOB-APPLY LAB-RESTORE-MAP-LANG-NOT-CN-V1`
