# MOB DISC — What “new box + pip train” means (2026-08-08)

**Status:** disc only.  
**Ask:** What is `!pip -q install "rfdetr[train,loggers]"`? Run on a new box?

---

## Plain English

**New box** = one more empty **code cell** in Colab (click **+ Code**).

It is **not** a Windows Command Prompt.  
It is **not** Cell 6 itself.  
It is a **small extra cell** you add **just above Cell 6** (or anywhere) to install missing train packages.

Then you run that small cell **once**, then run Cell 6 again.

---

## Exact clicks

1. Scroll to **Cell 6** (the train cell).  
2. Click **+ Code** so a **blank** cell appears (often above or below — either OK).  
3. In that blank cell, paste **only** this one line:

```
!pip -q install "rfdetr[train,loggers]"
```

4. Click the **▶** on **that** blank cell.  
5. Wait until it finishes (no red error). May take 1–3 minutes.  
6. Click **▶** on **Cell 6** again (the train cell).

---

## What the line means

| Bit | Meaning |
|-----|---------|
| `!pip` | Install Python packages in Colab |
| `-q` | Quiet (less spam) |
| `"rfdetr[train,loggers]"` | RF-DETR **plus** training extras (fixes missing `pytorch_lightning`) |

Same idea as Cell 1’s installs — this one is the **extra** piece Cell 1 missed.

---

## Standing

New box = one Colab code cell. Paste the one pip line → ▶ → then ▶ Cell 6.
