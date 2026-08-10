# MOB DISC — “Toast Title”, “Lb Zoom Hint”, car still false gun (2026-08-08)

**Status:** discuss only. No product edit until you type a named `MOB-APPLY`.  
**Your screens:** popup says **Toast Title**; lightbox footer says **Lb Zoom Hint**; black SUV / bull-bar still alarms as **gun**.

---

## 1. What is “Toast Title”?

Not a feature. Not something smart.

It is **broken English on the orange Weapon popup**.

We meant the top line to say something like **Weapon detection**.  
The code looks up a text key (`analytics.weapon.toastTitle`). That key was **never added** to the language file.

When a key is missing, the language helper invents a title from the key name:

`toastTitle` → **Toast Title**

Same bug on the buttons you see as **Hq Open Weapon** / **Hq Show Map** — those are key-name inventions, not real product wording. Fallbacks like “Open Weapon” exist in code but get **ignored** once the helper invents that fake text.

**Fix (UI only):** add the missing English strings (and keep fallbacks if I18n invents junk).  
Named MOB when you want it: `WEAPON-ALARM-I18N-STRINGS-V1`

---

## 2. What is “Lb Zoom Hint”?

Same class of bug. Not a secret zoom mode.

Under the Weapon snap popup we meant a short tip: **Hover to magnify** (move mouse on the photo → it zooms).

Key `analytics.weapon.lbZoomHint` is also **missing** from the language file → helper invents **Lb Zoom Hint**.

**Same fix MOB** as above (one APPLY can fix toast title + button labels + zoom tip together).

---

## 3. Are we running the new Colab weights?

**Yes.** Lab check right after your reload:

| Check | Result |
|--------|--------|
| Engine 8769 | up, `ready: true` |
| Which weights | `weights_kind: colab_b` (Track B — your Colab file) |
| Your new `.pt` | `ai_engine/weights/weapon_rfdetr_best.pt` — afternoon 8 Aug ~5:32 |
| Sidecar slim | rebuilt ~5:35 from that file |

So the car alarms you see at ~17:44–17:45 are **from the new Track B model**, not the old smoke/A file.

---

## 4. Why is the car still not solved?

Because **retrain did not teach “this car / bar is not a gun” well enough yet**.

- Reload only **loads** the new file. It does not invent accuracy.
- Your stills still show SUV + bull-bar → model still says **gun** (and toast/lightbox correctly show that wrong hit).
- Toast wording bugs ≠ car accuracy. Fixing “Toast Title” will **not** stop car false alarms.

**What still helps accuracy (pick one path next):**

1. **More / harder car+bar negatives** → Colab B again → replace `.pt` → `WEAPON-B-NEGATIVES-RELOAD-V1` again.  
2. Optional band-aid only: raise gun confidence (`WEAPON-CONF-GUN-LAB-BUMP-V1`) — fewer alarms, can also miss real guns. Does **not** replace better training.

---

## Recommended next (one at a time)

| Order | You type | What you get |
|-------|----------|----------------|
| 1 | `MOB-APPLY WEAPON-ALARM-I18N-STRINGS-V1` | Real words: Weapon detection / Open Weapon / Show on map / Hover to magnify — no “Toast Title”, no “Lb Zoom Hint” |
| 2 | More car/bar stills + Colab retrain + reload (or conf bump if you choose band-aid) | Fight the false **gun** on cars |

Operator: restart / refresh after UI APPLY; car PASS = same scene, **no** gun alarm (or rare).
