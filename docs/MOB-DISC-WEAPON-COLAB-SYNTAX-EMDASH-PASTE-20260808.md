# MOB DISC — Colab SyntaxError on em-dash (2026-08-08)

**Status:** disc only. No file edit until you APPLY a cleanup if you want.  
**Error:** `SyntaxError: invalid character '—' (U+2014)` on a line like `Do **not** change architecture — same Track B…`

---

## Cause (not your GPU, not Roboflow)

You pasted **markdown English** from `WEAPON-B-CAR-BAR-COLAB.md` into a **Python** cell.

That line is **documentation**, not code. Python sees `—` and dies.

```text
WRONG: paste the whole .md file into one cell
RIGHT: paste only what is inside each ```python … ``` block
```

---

## How to run (exact)

1. Open `ai_engine/colab/WEAPON-B-CAR-BAR-COLAB.md` on the PC (or in Cursor).  
2. In Colab, create **7 empty code cells**.  
3. Copy **only** the code under:

| Cell | Heading in the md |
|------|-------------------|
| 1 | `## Cell 1 — GPU check + installs` → copy the `python` fence only |
| 2 | `## Cell 2 — Config` |
| 3 | `## Cell 3 — Upload…` |
| 4 | `## Cell 4 — Download…` |
| 5 | `## Cell 5 — Merge…` |
| 6 | `## Cell 6 — Train…` |
| 7 | `## Cell 7 — Download weights…` |

4. Do **not** copy titles, tables, or “Do not change architecture…” lines into code cells.  
5. In Cell 2, paste your Roboflow key / workspace / project / version.  
6. Cell 3: upload `weapon-finetune-dataset/negative_car_bar_pack.zip`.

---

## Optional cleanup APPLY (agent)

If the md still trips you up, say:

`MOB-APPLY WEAPON-B-COLAB-CELLS-PLAIN-PY-V1`

Agent will add a top warning + a `*.py` Colab script (code only, no markdown prose) so you upload one file and run.

---

## Standing

Em-dash error = **wrong paste**, not broken Track B recipe.  
Recipe stays: Medium / 576 / 7 classes.
