# MOB DISC — Floor plan raw error on screen (ZERO-RAW violation)

**Date:** 2026-07-26  
**Status:** **LOCKED failure** — agent broke existing rule  
**Existing lock:** `MOB-DISC-ZERO-RAW-ERRORS-UI.md`  
**Symptom:** Floor plan strip showed  
`Unexpected token '<', "<!DOCTYPE "... is not valid JSON`

---

## Apology / ownership

You already forbade **raw codes** on operator UI.  
Blueprint UI still did `setStatus(err.message)` on fetch failures. That is a **hard fail** against the lock. Own it — not your fault.

---

## What you saw (plain English)

The desk asked the server for floor-plan data. The server answered with a **web page** (HTML), not a normal answer. The browser tried to read it as data and blew up. The **crash text** was painted on the Floor plan strip.

Operators must never see that. They need something like:

- **Could not load plans — restart Fleet and try again**  
- or **Session expired — sign in again**  
- never `Unexpected token` / `<!DOCTYPE` / `JSON`

---

## Likely cause (agent note)

`r.json()` on a non-JSON body (404/login HTML, wrong route, server not restarted with new DELETE/PATCH).  
Catch path printed `err.message` → raw parser text.

---

## Locked fix (one MOB)

**`TACTICAL-BLUEPRINT-ZERO-RAW-ERRORS-V1`**

1. Never show `err.message` / `err.stack` in Floor plan status.  
2. Safe parse: if body is not JSON → map to plain i18n (`tactical.bpListFail`, `bpSaveFail`, `bpRemoveFail`, `bpUploadFail`, session expired).  
3. Log raw detail to **console only** (agent/debug).  
4. Same helper pattern as Centre / ZERO-RAW disc — no new jargon on glass.

Also: if Remove/Clear was the click that failed, after fix the button must say a human line, not the HTML parse scream.

---

## Rule reminder (no debate)

| Never on screen | Always on screen |
|-----------------|------------------|
| `Unexpected token…` | Short plain sentence |
| `<!DOCTYPE` / stack | What to do next (retry / restart / sign in) |
| HTTP dumps | Optional green/red status class only |

---

## Next

Say **`MOB-APPLY TACTICAL-BLUEPRINT-ZERO-RAW-ERRORS-V1`** to patch Floor plan (and harden parse).  
No code until APPLY.
