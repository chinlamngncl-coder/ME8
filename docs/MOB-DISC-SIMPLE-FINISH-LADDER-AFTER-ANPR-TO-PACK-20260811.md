# MOB DISC — Simple finish plan (one-by-one after ANPR → pack) — 2026-08-11

**Status:** LOCKED operator plan. **No code this turn.**  
**Read:** `.cursorrules` · one MOB / one smoke at a time · no ship nag until pack step.

Ignore the giant leftover encyclopedia. **Follow this ladder only.**

---

## How we work

| Step type | You do | Agent does |
|-----------|--------|------------|
| **SMOKE** | Restart / hard refresh / try once → PASS or FAIL | No APPLY |
| **CONFIRM** | Say PASS or FAIL + what you saw | Next step or diagnose |
| **APPLY** | You type exact `MOB-APPLY …` | Small patch only |
| **PACK** | Only when we reach Step 9 | Print pack gather + pre-ship gate |

Do **not** skip ahead to pack/manuals while AI or live smoke is FAIL.

---

## The ladder (after you finish Colab genres)

### Step 0 — Weapon close (if not done)

1. **SMOKE/Colab:** Finish Weapon Track B Colab if needed.  
2. **APPLY:** `MOB-APPLY WEAPON-B-NEGATIVES-RELOAD-V1`  
3. **SMOKE:** Knife/gun still hit; car/bull-bar fewer false alarms → **CONFIRM PASS**

→ Only then Step 1.

### Step 1 — ANPR Colab genre

1. **APPLY:** `MOB-APPLY ANPR-COLAB-PLAN-V1` (paper/cells/dataset — locked FastALPR live path)  
2. You run Colab per that plan.  
3. **APPLY:** train/reload name from the plan (e.g. `ANPR-WEIGHTS-RELOAD-V1`)  
4. **SMOKE:** live BWC plate read OK; hard cases better → **CONFIRM PASS**

→ Step 2.

### Step 2 — Desk SOS smoke (no APPLY unless FAIL)

**SMOKE checklist (one lab pass):**

- SOS raise → live + tone/speech  
- Ack + mute-hold OK  
- Stop live → device stop-record (log + LED)  
- Ledger last frame OK  

**CONFIRM PASS** → Step 3.  
**FAIL** → one named fix APPLY only for that FAIL.

### Step 3 — Auth + alert tones smoke

**SMOKE:**

- Users search / Role / Stations  
- Custom tone Preview vs Save  

**CONFIRM PASS** → Step 4.

### Step 4 — Live video “big” leftover (one genre)

**Only the next locked WVP item that still fails in smoke:**

1. **SMOKE:** Ops wall Stop / signal lost / stall chrome under FLV  
2. If FAIL → **APPLY** lifecycle MOB (name after diagnose) → re-SMOKE → PASS  
3. Then **SMOKE** wall listen audio (if still broken) → one audio APPLY if FAIL  

Do **not** open conference + PTT + pin in the same week unless demo needs them. Park extras until after manuals if PASS enough for customer.

**CONFIRM “live good enough for pack”** → Step 5.

### Step 5 — Dock dual-record (only if dock on desk)

**SMOKE** or **APPLY** `OPS-CASE-DUAL-RECORD-AUTO-DOCK-MUST-V1` if still required.  
If no dock → **skip**, note for later.

### Step 6 — Languages

**SMOKE:** flip header Language across en + your ship locales (th/id/ko/fil as needed).  
Fix only **broken/missing** strings with named copy APPLYs (no whole-file rewrite).  
**CONFIRM PASS** → Step 7.

### Step 7 — Manuals finalise

Named manuals APPLY(s) only — teach in manuals, not teach-strips on every page.  
**CONFIRM PASS** → Step 8.

### Step 8 — Pre-pack smoke

One clean run: login → SOS → live → evidence glance → analytics glance → settings auth.  
**CONFIRM PASS** → Step 9.

### Step 9 — Pack / ship

You say **ship / pack / customer pack**.  
Agent prints **PACK GATHER** + pre-ship gate.  
TOTP / license / `build:ship` / desk smoke per gate.  
**No pack before Step 8 PASS.**

---

## Where you are **right now** (today)

| Done? | Item |
|-------|------|
| ? | Weapon Colab + reload + lab PASS |
| No | ANPR Colab plan / train |
| Later | Steps 2–9 |

**Today’s one line:** finish **Weapon** close (Step 0) → then **ANPR** (Step 1). Nothing else until those PASS.

---

## What we deliberately defer (don’t read as homework)

Conference BWC, PTT 29201 polish, per-action tones, session mute button, ZLM latency, full WVP phase book — **after** Step 8 unless a smoke FAIL forces one named APPLY.

---

## What you type next

```text
Weapon Colab done. MOB-APPLY WEAPON-B-NEGATIVES-RELOAD-V1
```

or (if Weapon already lab PASS):

```text
MOB-APPLY ANPR-COLAB-PLAN-V1
```

No APPLY this disc.
