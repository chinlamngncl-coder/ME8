# MOB DISC — FR Verify ops check (where / how — operator steps)

**Status:** DISC locked — **ops checklist only**. **No code MOB** until you finish this and still FAIL with a written result line.  
**Date:** 2026-07-23  
**Why this exists:** Earlier queue said “ops check first” without saying **where to click**. This file is the map.

**Keep:** WVP / Fleet as-is. Do **not** ask for FR code until Step 5 fails with a real message.

---

## What you are testing

**Face Verify 1:1** = upload two photos → server asks the face service → Match / No match / error text.

It is **already wired**. Fail is almost always: **license**, **face service not running**, or **bad photos** — not “missing feature.”

---

## WHERE (exact clicks)

1. Open the dashboard in the browser (same place as Operations / map).
2. Top nav: click **Analytics**.
3. Under Analytics tabs, click **Verify 1:1** (next to Face recognition / Watchlist).

You should see:
- A short hint about comparing two photos  
- A **status line** under it (grey text) — this is the “ready / not ready” line  
- **Photo A** and **Photo B** file pickers  
- **Run verify** button  

If instead you see a big panel: **“Analytics modules not licensed”** — stop at **Check A (license)** below. Do not hunt for Verify.

---

## Ops checklist (do in order — write PASS/FAIL for each)

### Check A — License (can you open Analytics FR?)

| What you see | Result |
|--------------|--------|
| You can open **Analytics** and click **Verify 1:1** | License path **OK for lab** |
| Full-page **“Analytics modules not licensed”** | **LICENSE FAIL** — FR not enabled on this server |

**Lab fix (IT / agent, not you inventing code):** `.env` needs FR licensed, e.g. `FM_LICENSE_FR=1`, then **restart Fleet**.  
You only report: *“license gate on”* or *“Verify tab opens.”*

---

### Check B — Ready line (sidecar / face service)

On **Verify 1:1**, read the grey status under the hint:

| Status text | Meaning | What you do |
|-------------|---------|-------------|
| **Face matching is ready.** | Service UP | Continue to Check C |
| **Checking face matching…** then never ready | Still starting or stuck | Wait ~30s, refresh once (Ctrl+F5). Still bad → Check B FAIL |
| **Face matching is not available…** / service down | Sidecar not running | Check B FAIL — tell agent; lab often needs restart with `FM_FR_SIDECAR_AUTO=1` or run `START-FR.bat` on the ME8 PC and leave it open |
| **Face recognition is not licensed…** | Same as Check A | LICENSE FAIL |

**PASS for Check B:** you literally see **“Face matching is ready.”**  
Do not guess from live Face watch tiles alone — use this line.

---

### Check C — Two real face photos

1. **Photo A** → choose a clear **front face** JPEG/PNG (person looking at camera, lit, not a blank wall).  
2. **Photo B** → second face photo:
   - Same person → expect **Match** (or high score)  
   - Different person → expect **No match**  
3. Click **Run verify**.

**Bad photos (will FAIL even if service is ready):**
- Black / empty / screenshot of UI  
- Side profile only, sunglasses, tiny face, heavy blur  
- PDF or non-image file  

**Lab sample folder (if present on this PC):**  
`ME8\bench\fr\` — use photos from there if you have enroll faces saved. If empty, use any two clear phone selfies / ID-style faces.

---

### Check D — Read the result box

After **Run verify**, a result box appears under the button:

| Result | Meaning |
|--------|---------|
| **Match** | PASS for “matching works” (same person photos) |
| **No match** | PASS for “pipeline works” if photos are different people |
| **No face found…** | Photos problem — redo Check C with clearer faces |
| **Face matching is busy…** | Wait and retry once |
| **Could not complete…** / red error | Copy the **exact** sentence → send to agent |
| Nothing / stuck on Comparing… | Refresh once; if stuck again → FAIL with “stuck comparing” |

---

## What to reply to the agent (copy template)

```
FR OPS CHECK:
A license: PASS / FAIL — (gate on? / Verify opens?)
B ready line: PASS / FAIL — (exact text you see)
C photos: PASS / FAIL — (what you used: same person / different)
D result: PASS / FAIL — (exact Match / No match / error text)
```

---

## Only after this

| Your outcome | Next |
|--------------|------|
| A–D all PASS | FR verify is OK — no FR code MOB |
| B FAIL (not ready) | Ops/IT: sidecar / restart — still **no code MOB** until ready line is green |
| A FAIL (license) | Ops/IT: `FM_LICENSE_FR` — **no UI code MOB** |
| B PASS + C good photos + D still wrong with a **clear error sentence** | Then: **`MOB-APPLY FR-VERIFY-FAIL-DIAGNOSE-V1`** |

---

## Not this checklist

- Live **Face recognition** watch tiles (different screen)  
- Watchlist enroll (different tab)  
- Centre Summary / Settings layout MOBs  

---

## Agent rule

Do **not** invent FR code from “FR failed” alone.  
Demand the **FR OPS CHECK** template above.  
Code MOB only when **B is ready** and **D still fails** with exact UI text.
