# MOB DISC — Batches C D E F in simple English (what is left)

**Date:** 2026-07-31  
**Status:** DISC only — **no commit, no push, no code**  
**Operator:** Stop mumbling. Simple English. Confirm C/D/E/F are only a **few** things left since 27 Jul (for those batches).

---

## Already done (you can ignore these)

| You said | What happened |
|----------|----------------|
| A | ANPR sidecar pushed |
| B | License checker code pushed |
| Live 4×4 | Already pushed earlier |
| China pack | **Stopped / parked** — not in C–F |

---

## What C D E F mean (plain words)

Think of four **shopping bags**. Each bag = one git push when you say APPLY.

### C — Server / video stack (lab PC guts)

**In English:** The main program that starts Axiom, Setup mode, WVP/Docker video bits, restart scripts, package list.

**How many files (about):** ~**19** changed/new files — not hundreds of mystery MOBs.

Examples of names (so you recognise them):
- `server.js`, `run.js`, `bin/me8-server.js`
- Setup / time / viewers helpers
- WVP docker compose + config
- Restart / WVP start scripts
- `package.json` (+ lock), `.env.example` (template only, no secrets)

**One APPLY name later:** `MOB-APPLY lab-git-push-server-wvp-lab`

---

### D — Screens you click (FR / Evidence / Command Wall / UI polish)

**In English:** Face-recognition alarms, evidence screen, command wall / live / matrix pages, language file, dark UI / caret helper.

**How many files (about):** ~**14** files.

Examples:
- `fr-alarm.js`, `evidence-manager.js`, live player helper
- `command-wall.html`, `command-centre.html`, `live.html`, `matrix.html`
- Some login/password/setup HTML, `en.json`, settings CSS, `ax-select-wrap.js`

**One APPLY name later:** `MOB-APPLY lab-git-push-fr-evidence-cw-ui`

---

### E — CAD / RMS hook

**In English:** The CAD tab / API routes for CAD integration.

**How many:** **small** — `cad-hub.js` + `routes/` folder (new).

**One APPLY name later:** `MOB-APPLY lab-git-push-cad-routes`

---

### F — Paper (MOB discs sitting on disk)

**In English:** Almost all the **written MOB DISC / APPLIED notes** from daily work that never went to GitHub.  
This is **not** more product features — it is **saving the paperwork** so history is not only on one PC.

**How many:** about **~90+** doc files still untracked (paper pile).  
We can push them in **one** docs bag, or skip until you care.

**One APPLY name later:** `MOB-APPLY lab-git-push-docs-paper`

---

## “Only so few since 27th?” — honest answer

| Question | Simple answer |
|----------|----------------|
| Did we do a lot of **talk / MOB discs** daily? | **Yes** — lots of paper. |
| Are C+D+E **huge new products** still unpushed? | **No** — together they are about **~35 code/UI files**, not a second ME8. |
| Is F big? | **Yes as paper count**, small as “risk to break Live” — docs only. |
| Is China in C–F? | **No.** Parked. |

So for **product code** left in C/D/E: **a short list**, not “everything since 27 Jul is still a monster.”  
A and B already took the ANPR engine + license engine. Live layout already saved. What is left is **server/WVP**, **other screens**, **CAD**, then optional **docs dump**.

---

## How you use this (no mumbling)

1. You pick **one** bag.  
2. You type the APPLY name.  
3. Agent commits **only that bag** and pushes.  
4. You do not need to know every MOB title — the bag is the unit.

Suggested order: **C → D → E → F** (or skip F if you do not care about paper on GitHub yet).

---

## Lock

- Simple English batches C–F as above.  
- **No push until** you `MOB-APPLY lab-git-push-…` for one bag.  
- China still out.
