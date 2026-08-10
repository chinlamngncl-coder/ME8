# MOB DISC — What Roboflow values for Cell 2 (plain) (2026-08-08)

**Status:** disc only.  
**Anger fair.** Here are the exact fields — no “guess.”

---

## Why I said “4” and you see “3”

Cell 2 has **four settings**. Three look like names; one is the **version number**.

| # | Line in Cell 2 | What it is |
|---|----------------|------------|
| 1 | `ROBOFLOW_API_KEY` | Secret key (password to Roboflow) |
| 2 | `ROBOFLOW_WORKSPACE` | Your workspace **slug** (short name in URL) |
| 3 | `ROBOFLOW_PROJECT` | Your project **slug** (dataset name in URL) |
| 4 | `ROBOFLOW_VERSION` | Dataset **version number** (integer: 1, 2, 3…) |

So: **3 name/key fields + 1 version = 4 values.**  
Not three Roboflow companies. Four fill-ins.

---

## Where to get each (on Roboflow website)

Open the **same** project you used when Google helped you train Track B.

### 1) API key

1. Log in at [https://app.roboflow.com](https://app.roboflow.com)  
2. Click your account / settings  
3. **API Keys** (or “Roboflow API”)  
4. Copy the key → paste into:

```text
os.environ["ROBOFLOW_API_KEY"] = "rf_........"
```

(Use your real key; do not leave `PASTE_KEY`.)

### 2) Workspace + 3) Project (from the URL)

When your dataset page is open, the browser URL looks like:

```text
https://app.roboflow.com/YOUR_WORKSPACE/YOUR_PROJECT/ ...
```

Example shape only:

```text
https://app.roboflow.com/ubitron-lab/weapon-7class/2
                         └─workspace─┘ └─project──┘ └ version
```

Then:

```text
ROBOFLOW_WORKSPACE = "ubitron-lab"
ROBOFLOW_PROJECT = "weapon-7class"
ROBOFLOW_VERSION = 2
```

Use **your** URL words — not this example.

### 4) Version

On the project page, open **Versions**.  
Pick the version you trained B from (or the latest with the 7 classes).  
Put that number only, e.g. `3` — not `"v3"`.

```text
ROBOFLOW_VERSION = 3
```

---

## Agent cannot invent your values

Your Roboflow account / project / key are **yours**.  
They are **not** stored in ME8 for me to read (and must not be pasted into chat if you care about secrecy).

If you forgot which project was B: in Roboflow, open the project that has classes  
**Handgun, Knife, Missile, Rifle, Shotgun, Sword, Tank**.

---

## Cell 2 after fill (shape)

```python
os.environ["ROBOFLOW_API_KEY"] = "rf_YOUR_REAL_KEY"
ROBOFLOW_WORKSPACE = "your-workspace-slug"
ROBOFLOW_PROJECT = "your-project-slug"
ROBOFLOW_VERSION = 2
```

Then ▶ Cell 2.

---

## Next

Cell 2 PASS → Cell 3 upload `negative_car_bar_pack.zip`.
