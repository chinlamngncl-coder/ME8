# ME8 checkpoint ritual — stop patching, prove it works

**MOB:** `mob-me8-checkpoint-ritual`  
**Tree:** `C:\Users\user\Desktop\Enterprise Mobility\ME8`  
**Audience:** Ubitron bench + AI agents (not operator handoff)

---

## Why this exists

ME8 is growing. **MOB after MOB without a pause breaks VC, PTT, SOS, and live wall again.**  
A checkpoint is **not a feature** — it is a **gate** before the next MOB.

**You do not have to remember this ritual.** After risky MOBs, the **assistant must remind you** and wait for **CHECKPOINT PASS** or **CHECKPOINT FAIL** before starting another MOB.

---

## Agent rule (locked)

After any MOB that touches **live video, wall, map pin, SIP, PTT, SOS, ZLM, or `server.js` pool**:

1. Agent **stops** — no chained MOB-APPLY in the same turn unless user explicitly says *skip checkpoint*.
2. Agent prints a **CHECKPOINT REMINDER** (mini steps below).
3. Agent **does not** MOB-APPLY again until user replies **CHECKPOINT PASS** or **CHECKPOINT FAIL** (+ what broke).

User may run the steps; agent only needs PASS/FAIL (or skip).

---

## Mini checkpoint (~5 min) — default after 1–2 risky MOBs

| Step | Action | Pass if |
|------|--------|---------|
| 1 | `.\RESTART-FLEET.bat` | Dashboard `:3988` loads, login OK |
| 2 | Browser **Ctrl+Shift+R** | No stale JS after wall/ZLM MOBs |
| 3 | **One BWC** — Start live (Chin/kk) | Picture within ~10 s |
| 4 | **Stop** that slot | Clean stop, no fake “Live” overlay |
| 5 | **Open All** (or 2 cams, 2 slots) | ≤8 live; not all piled on slot 0 |
| 6 | Stop all | Wall + pins clear |

Optional 30 s: map pin **Play** on a cam already live on wall.

**Reply:** `CHECKPOINT PASS` or `CHECKPOINT FAIL` + one line (e.g. “slot 2 black after stop”).

---

## Full checkpoint (~20–30 min) — after a wave or before ship

Use [ME8-SMOKE-CHECKLIST.md](./ME8-SMOKE-CHECKLIST.md) sections **0–4** (pre-flight, wall, pin, PTT, SOS).

With ZLM enabled, add [ME8-ZLM-SCALE-8-CHECKLIST.md](./ME8-ZLM-SCALE-8-CHECKLIST.md) drills.

**Reply:** `CHECKPOINT PASS (full)` or `CHECKPOINT FAIL (full)` + section number.

---

## When to run which

| After | Mini | Full |
|-------|------|------|
| Docs / i18n only | Skip | — |
| Settings UI, auth | Skip unless server restart | — |
| `video-wall.js`, ZLM, pool, SIP, PTT, SOS | **Yes** | — |
| End of ZLM wave (MOBs 3–7) | Yes | **Yes** |
| Before `me8-v1` lock | — | **Yes** |

---

## On FAIL

| Do | Don’t |
|----|--------|
| One fix MOB or restore baseline | Stack more MOBs |
| Re-run mini checkpoint | Assume “small change” |
| Log FAIL in chat | Auto RESTORE unless user says `RUN RESTORE-…` |

---

## Related docs

| Doc | Use |
|-----|-----|
| [ME8-SMOKE-CHECKLIST.md](./ME8-SMOKE-CHECKLIST.md) | Phase A full sign-off |
| [ME8-ZLM-SCALE-8-CHECKLIST.md](./ME8-ZLM-SCALE-8-CHECKLIST.md) | 8 live + ZLM failover drills |
| [ME8-FLEET-SCALE-SOP.md](./ME8-FLEET-SCALE-SOP.md) | Many registered devices, 8 live cap |
| [ME8-POST-RESTORE-CHECKLIST.md](./ME8-POST-RESTORE-CHECKLIST.md) | After baseline restore |

---

**Next risky MOB:** only after **CHECKPOINT PASS** (or explicit user *skip checkpoint*).
