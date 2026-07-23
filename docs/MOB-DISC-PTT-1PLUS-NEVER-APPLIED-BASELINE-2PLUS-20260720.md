# MOB DISC — PTT-GROUP-SELECT-1PLUS: never applied; baseline says 2+ always

**Date:** 2026-07-20  
**Status:** DISC only — **no code, no restore, no patch**  
**Operator:** `MOB-APPLY-PTT-GROUP-SELECT-1PLUS-CROSS-GROUP-V1` does not work; used to work; sick of patching — check baselines.

---

## 1. First fact: that MOB was never applied

Searched tree + git:

| Check | Result |
|-------|--------|
| `MOB-APPLIED-*1PLUS*` | **None** |
| `public/index.html` `n < 2` / `pick.length < 2` | **Still present** |
| `server.js` `team.length < 2` | **Still present** |
| `pickNeedOne` / `1PLUS` in code | **None** |

Only paper: `docs/MOB-DISC-PTT-GROUP-SELECT-LOGIC-WRONG-20260720.md` (proposed MOB).

So **nothing broke because we applied 1PLUS and failed** — the **1PLUS change never landed**. You are still on the **same select rules** as Jul-18 classic PASS.

---

## 2. Baseline comparison (all the same 2+ gate)

Checked:

| Snapshot | `dispatch-ptt-group` | UI `n < 2` | Server `team.length < 2` |
|----------|---------------------|------------|---------------------------|
| **Current `server.js` / `index.html`** | ✓ | ✓ | ✓ |
| **`baseline/2026-07-18-classic-pass`** | ✓ identical | ✓ identical | ✓ identical |
| **`ship-build-test/customer-pack`** | ✓ identical | ✓ identical | ✓ identical |
| **`run.js` (bundled)** | ✓ identical | — | ✓ |
| **Git `b1027dc`** (mob-me8-operator-voice-unified — when PTT GROUPS + route landed) | ✓ | ✓ | ✓ |

**Jul-18 restore did not remove 1PLUS logic** — because 1PLUS never existed. Restore put you back on the **same 2+ dispatch UI** that shipped with operator-voice-unified.

**Cross-group merge** (fleet ticks + map group at once): **not in any baseline** — `fullPttCandidatesMeta()` has always been **dropdown OR pinned fleet**, not both.

---

## 3. What “used to work” actually was (baseline truth)

Three different “PTT grouping” mechanisms — easy to mix up:

| Mechanism | What it does | 1 BWC? | Cross-group? | In Jul-18 PASS |
|-----------|--------------|--------|--------------|----------------|
| **A. Always-on `pushPttGroupForCamera`** | On register / refresh → pushes **full fleet roster** XML to each online BWC (gtid 49) | ✓ per device | ✓ whole fleet list | ✓ **still runs** |
| **B. PTT GROUPS box → Join** | Operator picks map group or 2+ fleet ticks → **dispatch team** (snid 78) | ❌ need 2+ BWCs on team | ❌ adhoc only if dropdown **empty** + 2+ ticks | ✓ same 2+ rules |
| **C. SOS PTT team** | Alarm + helpers banner button | ❌ need alarm + helper(s) | helpers from nearby | ✓ separate API |

When you say **“it used to work”**, baseline evidence points to:

- **A** — automatic group XML on register (you hear PTT when 29201 login OK) — **not** the Join button with 1 member.
- **B** — Join worked when **map group had ≥2 devices** and **≥2 were online** (e.g. Chin + kk in PP group).
- **Not** Join with **PP - Chin (1)** only — that was **always blocked** (UI + server).

Your screenshot (**1 member, Need 2+**) is **expected on every baseline**, not a WVP regression.

---

## 4. Why it feels broken *now* (after WVP settle) — different layer

Even when Join **succeeds** (2+ online, 2+ picked), WVP lab can make **PTT feel dead**:

| Layer | Classic Jul-18 | After WVP handoff |
|-------|----------------|-------------------|
| Group XML push | Fleet `:5062` MESSAGE | Often **`:5060` WVP relay** (`wvpPttGroupRelay`) |
| BWC TCP **`:29201` login** | Worked when Fleet SIP home | Often **no `login ok`** when cam homes on WVP only |
| HQ hold fanout | Fleet path | Same if 29201 up |

So: **select/Join may PASS** in logs (`dispatch ptt group`, `group config sent`) while **ear still FAIL** — that’s **29201 / contact**, not the 1PLUS MOB.

Session MOBs (camId map, group dedupe, hold skip refresh) fixed **parts** of that — not the **2+ Join gate**.

---

## 5. Why 1PLUS MOB “does not work” if you tried it

| Expectation | Reality |
|-------------|---------|
| Named MOB applied | **Never applied** — no code change |
| Restore to get old select | **Useless** — baseline = same 2+ |
| Patch chip UI only | Won’t fix server `team.length < 2` or 29201 |

---

## 6. What actually matched your intent (product, not in tree)

Your described logic:

- **1+** units OK (including single map group member).
- **Cross-group** pick from fleet (mix colours).
- **Or** whole map group in one click.

**Never shipped** in ME8 baselines checked. Would need **one new APPLY** (when you want it):

`MOB-APPLY-PTT-GROUP-SELECT-1PLUS-CROSS-GROUP-V1`

— client + server + i18n + `resolvePttTalkCamIds` length check — **single MOB, no restore, no bundle with WVP video**.

---

## 7. How to test group PTT today (no patch)

| Path | Needs |
|------|--------|
| **PTT GROUPS Join** | Map group with **≥2 device IDs** in Server → Map groups **and** **≥2 online** on fleet (or clear dropdown, tick 2+ pins) |
| **SOS PTT team** | Cold SOS + helper |
| **Always-on** | Watch logs for `group config sent` / `login ok` on 29201 per cam — not Join |

**PP - Chin (1)** alone → **cannot Join on any baseline**.

---

## 8. Do not restore for this

| Action | Effect on PTT select |
|--------|----------------------|
| `RESTORE-ME8-CLASSIC-PASS` | **Zero** — same 2+ dispatch UI |
| `RESTORE-ME8-FIRMWARE-GOLD` | Pin/video — **not** PTT GROUPS select |
| Another handoff patch | Won’t fix 2+ gate |

---

## 9. One line

**`MOB-APPLY-PTT-GROUP-SELECT-1PLUS-CROSS-GROUP-V1` was never applied** — Jul-18 classic, ship pack, and current tree **all require 2+** for Join; what **used to work** was likely **2+ member groups** or **automatic always-on fleet push**, not 1-person / cross-group Join; fixing your intent needs **one deliberate APPLY**, not another restore or patch loop.
