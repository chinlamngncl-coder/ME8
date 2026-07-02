# Enterprise pre-ship discussion (ME8)

**Purpose:** Architectural alignment, enterprise MOB order, and review gate for **ME8** commercial ship.

**Product tree:** `C:\Users\user\Desktop\Enterprise Mobility\ME8`  
**Ship lock target:** **`me8-v1`** (not `trial-gold-2.0-enterprise` — that name was trial-era; ME8 uses `me8-v1`).

**Trial anchor (unchanged):** `Enterprise Mobility\SaaS Mobility` — `trial-gold-1.10.1` for existing users.

**Lab donor:** `Lab-8BWC-v2` / lock `8wc-v2` — archive only.

**Master roadmap:** [../ME8-ROADMAP.md](../ME8-ROADMAP.md)

---

## Documents (read in order)

| # | File | Use |
|---|------|-----|
| 1 | [01-GOOGLE-DIAGNOSTIC-SUMMARY.md](./01-GOOGLE-DIAGNOSTIC-SUMMARY.md) | Google prompt + code verification |
| 2 | [02-AGREE-DISAGREE-MATRIX.md](./02-AGREE-DISAGREE-MATRIX.md) | Alignment matrix |
| 3 | [03-ENTERPRISE-PRE-SHIP-PLAN.md](./03-ENTERPRISE-PRE-SHIP-PLAN.md) | **MOB order** — apply on **ME8** |
| 4 | [04-DIALOGUE-GOOGLE-VS-MOBILITY.md](./04-DIALOGUE-GOOGLE-VS-MOBILITY.md) | Q&A for external review |
| 5 | [05-REVIEW-GATE-BEFORE-SHIP.md](./05-REVIEW-GATE-BEFORE-SHIP.md) | Gate before **`me8-v1`** lock |
| 6 | [06-OPEN-SOURCE-LICENSE-AUDIT.md](./06-OPEN-SOURCE-LICENSE-AUDIT.md) | OSS audit |
| 7 | [07-DEGRADE-TESTS-AND-PG-RESYNC.md](./07-DEGRADE-TESTS-AND-PG-RESYNC.md) | Degrade + PG resync tests |
| 8 | [08-FFMPEG-DECOUPLE-BLUEPRINT.md](./08-FFMPEG-DECOUPLE-BLUEPRINT.md) | FFmpeg decouple |
| 9 | [09-LANE-A-LOCKED-SCOPE.md](./09-LANE-A-LOCKED-SCOPE.md) | Trial lane scope |

---

## ME8 vs legacy doc wording

| Legacy (doc 03/05) | ME8 meaning |
|--------------------|-------------|
| `trial-gold-2.0-enterprise` | **`me8-v1`** lock on this tree |
| 8 BWC “parked / separate” | **In ME8** — seeded from lab |
| Live app = SaaS Mobility | **ME8** for enterprise work; SaaS Mobility = trial only |

---

*Copied to ME8 2026-06-30 — `mob-me8-roadmap-doc`. Edit enterprise MOBs on ME8 only.*
