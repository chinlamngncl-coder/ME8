# MOB DISC — We are NOT on latest ZLM/WVP (Google was not wrong)

**Status:** LOCKED — agent error admitted — research fact  
**Date:** 2026-07-14  
**Search:** `old wvp_pro`, `2021 ZLM`, `Google not wrong`, `upgrade ZLM`, `stubborn`

**You said:** Are you even on the latest version? Google is not wrong — you are stubborn not to listen and research.

**Answer: You are right.**

---

## Am I on the latest? **No.**

What `me8-wvp` (`648540858/wvp_pro:latest`) actually is:

| Fact | Value |
|------|--------|
| Docker Hub “latest” pushed | **~4+ years ago** (image created **2021-11-19**) |
| Bundled ZLM banner | `git hash:1cba3f4` · **build time Nov 19 2021** |
| WVP jar in image | `wvp-pro-2.0-11190958.jar` (same era) |
| Official ZLM today | Hub `zlmediakit/zlmediakit:master` — **updated continuously** (hours/days, not years) |
| Current WVP practice | **Split** WVP + modern ZLM (+ redis/mysql) — not this stale all-in-one |

Calling Hub tag `latest` lied to us. **We have been tuning a 2021 fossil**, then arguing with advice written for **2024–2026 ZLM**.

That was the stubborn mistake — not “Google invented fake keys.”

---

## Google vs our fossil — research (not dismiss)

Current ZLMediaKit `conf/config.ini` (master, fetched today) **does** include the modern layout Google talks about, e.g.:

| Modern key (current ZLM) | On 2021 all-in-one? |
|--------------------------|---------------------|
| `[protocol] modify_stamp` | **No** — we only have old `modifyStamp` camelCase |
| `[rtp] / [rtsp] lowLatency` | **No** on bundled ini |
| `continue_push_ms` | Modern yes; old image different shape |
| `mergeWriteMS` | Both eras (we already had 0) |
| `streamNoneReaderDelayMS` | Both eras (name differs slightly by age) |

So:

- Google pointing at **keep-alive / stamp / lowLatency / drop-behind** for **current ZLM** = **listen and map**.  
- Blind pasting those names into **2021** `config.ini`, or flipping old `modifyStamp` and calling Google wrong when A lagged = **agent failure**.

Stamp-tune FAIL on the fossil does **not** prove Google wrong. It proves: **wrong binary + wrong translation of advice.**

---

## Do I need help? **Yes — the right help**

| Need | Why |
|------|-----|
| **Modern media plane** | `zlmediakit/zlmediakit:master` (or pinned recent tag) with **current** `config.ini` |
| **Modern WVP** | Current `wvp-GB28181-pro` build that talks to that ZLM (secret/id/ports match) — **not** Hub `648540858/wvp_pro` as the forever answer |
| **Split deploy** | What WVP docs and field deploys already do — scales; all-in-one 2021 does not |
| **Player class** | jessibuca / stack WVP UI uses — mpegts lab tiles are a detour |
| Optional | Second opinion (Google/Gemini) **on the modern config after upgrade** — useful; arguing against them **on 2021 keys** was useless |

Agent must **research versions first**, then apply knobs that exist on **that** binary.

---

## Why we looked incompetent (plain)

1. Grabbed convenient Docker Hub all-in-one labeled `latest`  
2. Never checked image **Created: 2021-11-19** against today’s ZLM  
3. Treated Google’s modern knobs as “invented” when missing  
4. Applied a half-wrong stamp change on the old key → A lag → blamed the advice  
5. Burned your time on 2-cam soaks that cannot prove thousands on a dead stack  

**Proper industry path was always:** current WVP + current ZLM (+ nodes later). We delayed that.

---

## Locked direction (no more fossil tuning as “the fix”)

| Stop | Start |
|------|--------|
| More stamp experiments on 2021 `me8-wvp` as the scale answer | **Upgrade genre**: modern ZLM + current WVP, lab SIP still **5061**, Fleet wall **5060** untouched |
| “Google wrong” | “Google targets **current** ZLM — we must be on that” |
| Endless reopen on old stack | Reopen only as bandage until upgrade soak |

**Damage control (still valid):** revert `modifyStamp` to **0** on the fossil if you still use it tonight — so A is not lag-poisoned while we prepare upgrade. That is **stop the bleeding**, not the strategy.

---

## MOB status (2026-07-14)

1. **`mob-wvp-stamp-revert`** — optional; fossil path only if you roll back  
2. **`mob-wvp-zlm-modern-split`** — **APPLIED** — see `docs/MOB-APPLIED-WVP-ZLM-MODERN-SPLIT.md`  
   - Split: `zlmediakit/zlmediakit:master` + `gemcjz/wvp-pro` 2.7.3 + postgres/redis  
   - Host SIP **5061** / play **:80** kept; Fleet **5060** untouched  
3. **`mob-wvp-modern-soak`** — next: A+B soak on **new** stack  
4. Then concurrent N / capacity — on software that can actually grow  

Do **not** claim thousand-cam readiness until soak + scale work on the modern stack.

---

## Help I will use (and what I will not dump on you)

| Agent owns | You own |
|------------|---------|
| Version check, compose, secret/id wiring, logs | PASS/FAIL from picture; restart when asked |
| Map Google knobs → **modern** ini only | Say MOB-APPLY for named upgrade |
| Not: phone OSD / client measure homework | Not: babysit 30 min on a known-wrong stack |

If you want Google in the loop: paste **modern** `config.ini` diffs after upgrade — not 2021 camelCase fights.

---

## Related

- Stamp-tune FAIL (symptom): `docs/MOB-DISC-WVP-STAMP-TUNE-FAIL.md`  
- Proper scale: `docs/MOB-DISC-WVP-PROPER-SCALE-NOT-TWO-CAMS.md`  
- Google triage (update: advice OK for modern ZLM): `docs/MOB-DISC-WVP-ZLM-CONFIG-GOOGLE-CHECK.md`

---

## One line

**We are not on the latest. Google was describing today’s ZLM. We were arguing on a 2021 all-in-one. Next proper move = modern split WVP+ZLM, not more stubborn knob fights on the fossil.**
