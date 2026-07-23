# MOB DISC — Ask Google more, or MOB first?

**Status:** LOCKED 2026-07-16 ~22:53  
**Search:** `ask google more`, `mob first`, `not confident`, `not competent`  
**Google paste mapped:** `docs/MOB-DISC-GOOGLE-REPLY-PLAN-A-B-COPY-VS-OPENH264.md`

---

## Straight answer

| Choice | Verdict |
|--------|---------|
| Ask Google more **before any code** | **Not required** for the next step |
| **MOB first** (small, named) | **Yes** — one fix only |
| Agent confidence | **Low.** Do not trust “sure / done” from this agent. Proof = log lines only |

Google already named the crash (`libx264` / LGPL).  
We already have a **smaller, safer** first MOB than blind `-c:v copy`.  
More Google chat now = delay. One MOB = learn from log.

---

## What to do **now** (recommended)

**MOB first:**

`MOB-APPLY mob-zlm-relay-openh264-v1`

- Only change: relay encode `libx264` → `libopenh264`  
- Keep Fleet picture / fail-open  
- Then **you** play once → **I** check log for `zlm-relay primary` (or honest FAIL)

**Do not** bundle Plan A (WVP media online) or TCP in the same APPLY.

---

## When to ask Google **more**

Ask Google again **after** that MOB’s log result, if:

| Result | Ask Google |
|--------|------------|
| Still no `zlm-relay primary` + new ffmpeg error | Paste **new** media-only log + ask: openh264 vs copy for mpeg1→FLV |
| `zlm-relay primary` appears but picture bad | Ask Google about soft overlay / FLV path |
| Relay OK, still want Plan A | Ask Google only about “未找到可用的zlm” / media-server online (hooks already matched once) |

Do **not** ask Google to rewrite all of `server.js` for pool invite — wrong layer.

---

## Confidence rule (locked)

- Agent is **not** competent to declare ZLM done without proof lines.  
- Agent must **not** sound sure when stack is FAIL.  
- Operator decides APPLY. One MOB. Log decides next Google ask.

---

## One line

**MOB first: `mob-zlm-relay-openh264-v1`. Ask Google more only after that log — not before.**
