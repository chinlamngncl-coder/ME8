# MOB DISC — What happened to resolution · next point · Google or WVP?

**Status:** LOCKED 2026-07-17 ~00:02  
**Search:** `what happened resolution`, `suggest a point`, `ask google or wvp`  
**Log:** `Invalid frame dimensions 0x0` after `geometry: stable-v1` prime  

---

## What happened to resolution (say it straight)

| Layer | What happens |
|-------|----------------|
| Fleet wall (under) | Cam → SIP → pool → **JSMpeg** (native wall size, stable) |
| Soft ZLM (on top) | Same pool WS (mpeg) → **re-encode openh264** → ZLM FLV → overlay |

When soft overlay proves, you **see the re-encoded stream**, not the JSMpeg canvas.

Log says the re-encoder still hits:

`[mpeg2video] Invalid frame dimensions 0x0`

So ffmpeg sometimes starts (or keeps) decoding **before width/height are valid**. Output size jumps / glitches → **resolution change on panel**.  

Geometry MOB (prime 256KB + bigger probe + even scale) **reduced crash risk** but **did not kill 0x0**. Res = **still FAIL**.

Not “browser look.” Not pin. **Relay decode/encode geometry.**

---

## Suggested next point (one clear pick)

### Option A — Fix res on Plan B (recommended if you want panel ZLM-relay usable)

**`MOB-APPLY mob-zlm-relay-fixed-output-size-v1`**

Force a **fixed** output size in relay (e.g. scale to **1280x720** or wall’s known size), drop/skip until `iw>1 && ih>1`, don’t let 0x0 reach openh264.  
Goal: panel soft ZLM stops flipping resolution.

### Option B — Ask Google (after A fails, or if you want their call on mpeg→FLV)

Send them:

1. `docs/MOB-DISC-LOG-EXPORT-FOR-GOOGLE-20260716.txt` (old) **plus** new lines: `geometry: stable-v1` + still `0x0`  
2. Ask: *Fleet pool WS is mpeg/mpeg2 for JSMpeg; re-encode to FLV with libopenh264 still gets Invalid frame dimensions 0x0 after 256KB prime — fix args or abandon this ingest?*

Do **not** ask Google “are we on ZLM” — we already know: **`zlm-relay primary`**, not WVP.

### Option C — Push WVP Plan A now

**`MOB-APPLY mob-wvp-zlm-media-online-v1`**

WVP still **`未找到可用的zlm` / startPlay fail** · `wvp-zlm primary = 0`.  
Plan A is the **scale** path. But it does **not** fix tonight’s overlay res by itself until WVP sees ZLM and play works.  
Res on Plan B can stay broken while you chase A.

---

## Google more vs MOB first vs WVP now

| Choice | When |
|--------|------|
| **MOB first (A)** | You want **stable panel res** on current soft path — do this next |
| **Ask Google** | After A still 0x0, or you want them to rewrite relay args |
| **WVP now (C)** | You accept panel res FAIL for now and chase **real WVP-ZLM** |

**Agent recommendation (low confidence, one pick):**  
**MOB A first** (`fixed-output-size`) — cheapest proof on what you’re already running.  
Then WVP media-online. Google only if A still fails.

---

## Pin reminder

Pin ≠ panel until a separate pin soft-ZLM MOB. Not the res root.

---

## One line

**Res breaks because soft ZLM re-encodes mpeg and still sees 0x0. Next: `mob-zlm-relay-fixed-output-size-v1` — or WVP media-online — ask Google only if fixed-size still fails.**
