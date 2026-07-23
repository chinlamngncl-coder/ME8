# MOB DISC — Compare now vs `PANEL-WALL-5-PLUS-3-PAGES` PASS (NO APPLY)

**Status:** DISC only — 2026-07-19 · **no code**  
**Subject:** `MOB-DISC-COMPARE-5PLUS3-VS-NOW`  
**Operator:** “PANEL-WALL-5-PLUS-3-PAGES — check this. You have done it using this. Check and compare.”  
**After:** undo-cover APPLY = **FAIL**

---

## Short verdict

**Yes — the PASS look you remember was built by `MOB-APPLY-PANEL-WALL-5-PLUS-3-PAGES` (5 taller panels + `contain`, not cover).**

**Now:** the **5+3 skeleton is still mostly in the tree**, but a **later APPLY** changed bank B height, and the **cover thrash** burned trust. Undo-cover alone ≠ “back to 5+3 PASS.”

---

## What `5-PLUS-3-PAGES` locked (PASS intent)

From `docs/MOB-DISC-PANEL-WALL-5-PLUS-3-PAGES-20260719.md` (status APPLIED):

| Piece | Locked meaning |
|-------|----------------|
| Visible bank A | **5** panels (not 6) → each **taller** in the same rail |
| Bank B | **3** panels (6–8) → when shown, **even taller** (only 3 share height) |
| Fit | **`contain`** — full frame like pin; **no cover** |
| Why taller | “closer to 16:9 → **bars shrink** / less need to crop” |
| Tabs | Next 6–8 / Next 1–5; **keep-live** when hidden |
| Forbidden | Panel scroll stack · **cover** · freestyle pin/SOS |

That is the **PASS machine**: **taller stages + contain**, not “flip to cover.”

---

## What is still true in code today (matches 5+3)

| Check | Today |
|-------|--------|
| `SLOT_COUNT = 8` | Yes (`video-wall.js`) |
| `BANK_A_COUNT = 5` | Yes |
| Tab UI `#video-wall-bank-tabs` | Yes |
| `data-bank` a/b + `is-bank-hidden` off-screen keep-live | Yes |
| Panel ZLM `object-fit: contain` | Yes (after undo-cover) |
| Video config 8 channels | Yes |
| Wall softAttach **no** `objectFit: 'cover'` | Yes (after undo) |

So: **agent did not delete the 5+3 product.** Tabs/8 slots/contain are still there.

---

## What diverged after 5+3 (compare = why FAIL)

| After 5+3 | What it did to the PASS |
|-----------|-------------------------|
| **`MOB-APPLY-PANEL-BANK-B-MATCH-A-SIZE`** | Bank B panels forced to **~1/5 rail height** (same as A), blank below. **Undoes** 5+3’s own promise: “Bank B with only 3 → stages **much taller**.” |
| Cover restore APPLY | Put **known FAIL** (cover crop) back — not part of 5+3 |
| Undo-cover APPLY | Removed cover only — **did not** undo bank-B match-A; **did not** re-verify A height vs PASS day |

**5+3 PASS math (bank B):**

```
3 visible → each ~1/3 of rail → tall → contain ≈ little/no side bars
```

**Now (bank B after match-A):**

```
3 visible but each capped ~1/5 → short-fat → contain → side bars again
```

**Bank A** under pure 5+3: five `flex:1` slots sharing the rail (hidden bank out of flow). That part is **still the 5+3 rule**. If bank A still fails your eye, it is not “missing 5+3 code” — it is either window height / chrome eating stage, or something else on the live path — **not fixed by cover.**

---

## Side-by-side

| | **5+3 PASS (as designed)** | **Now** |
|--|----------------------------|---------|
| Banks / tabs / 8 slots | Yes | Yes |
| Fit | contain | contain |
| Bank A height | 5 share full rail (taller than old 6) | Same rule still |
| Bank B height | **3 share full rail (tall)** | **Capped to ~1/5 (short)** ← drift |
| Cover | Forbidden | Undone (good) but trust burned |

---

## Why undo-cover FAIL’d (honest)

You asked to restore **real PASS**.  
Agent only **undid cover**.  

Real PASS = **5+3 geometry + contain**.  
**Bank B match-A is still sitting on top of 5+3** and fights the tall-panel part of that PASS.

So FAIL is fair: **not “back to 5+3 PASS.”**

---

## Agent rule from this compare

1. Do **not** touch panel fit until you name APPLY.  
2. Do **not** bring cover back.  
3. If next APPLY is “restore 5+3 PASS,” scope must **compare to this disc** — likely **remove or reverse bank-B ~1/5 cap** so B is tall again as 5+3 wrote — **only if you order that exact APPLY**.  
4. No option menu. No proof ask.

---

## One line

> **PASS was 5+3 (taller panels + contain). Skeleton still here; bank-B match-A + cover thrash drifted it. Undo-cover alone ≠ 5+3 PASS.**
