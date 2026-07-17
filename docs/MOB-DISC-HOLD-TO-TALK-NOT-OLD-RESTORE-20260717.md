# MOB DISC — “Hold To Talk” ≠ restored to old Fleet / Gold

**Date:** 2026-07-17  
**Status:** DISC — fact check — **no code**  
**You:** Saw **Hold To Talk** / channel free UI → think agent cheated and restored a very old version.

---

## Short answer

# NO — we did **not** restore Firmware Gold or an ancient tree.

What you see is the **current** operator **call / mic hold** chrome (`public/js/call-mic.js`), not a wipe to July‑6 Gold.

---

## Proof (checked now)

| Check | Result |
|-------|--------|
| `git HEAD` / GitHub `main` | `9155950` (ops keep) + `0dc4486` (redact) — **far after** Firmware Gold |
| Gold vs HEAD | Gold is an **ancestor** of HEAD — we did **not** reset *to* Gold |
| Soft Open storm restore | Only wall / player / broker / docker / WVP lab scripts — **never** `call-mic.js` |
| Tonight’s env APPLY | Only `.env` flags — **no** UI file checkout |
| `index.html` | Still has **Seeta redact** CSS (`ev-redact`) from safety commit |
| “Hold to talk” source | `call-mic.js` → `tr('call.holdToTalk', 'Hold to talk')` — in tree since **operator-voice** genre (`b1027dc` / FR genre era), still on current `main` |

---

## What that button actually is

```text
Map ops dock
  └─ Call / mic hold UI (call-mic.js)
       └─ “Hold to talk” when not pressing
       └─ Hint when channel free / busy
```

It is **not** proof the whole product rolled back to “old Fleet only.”  
It **is** the call-path hold button showing because you are in an ops/call context (and live may still be failing — separate issue).

Fleet list PTT also uses similar wording in locales (`ptt.holdTalk`, `fleet.colPttTitle`) on **current** `en.json` — same product language for years of this stack, not a restore artifact.

---

## What we **did** change recently (so you are not gaslit)

1. Soft Open **storm files** → put back to `9155950` (remove Soft Open UI band-aids)  
2. Chin SIP → **5062** (you typed)  
3. `.env` → classic live flags (`FM_LAB_WVP=0`, presence off)  

**None** of those = “restore old Gold” or rewrite `call-mic.js`.

---

## Why it feels “old”

Soft Open months trained the eye to **WVP picture / Soft Open chrome**.  
Classic call hold **Hold to talk** looks “old” next to Soft Open — but it is still **this** ME8 tree’s call UI, with redact still present.

Live black + PTT software pain = **path/env**, not “repo age.”

---

## Forbidden takeaway

Do **not** run Firmware Gold restore to “fix” Hold To Talk.  
That **would** risk losing Seeta redact / later commits.

---

## One line

**Hold To Talk is current `call-mic.js` on today’s `main` — not a Gold/old-tree cheat; Soft Open restore never touched it; redact still in `index.html`.**
