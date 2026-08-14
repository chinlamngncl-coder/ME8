# MOB DISC — Weapon “Engine OK” but no gun hit on phone/news clip — 2026-08-11

**Status:** Diagnosed from live lab. **No code this turn.**  
**Read:** `.cursorrules`

---

## Is it up and running?

**Yes — the Weapon engine is up.**

Lab probe now:

```json
{"ok":true,"ready":true,"engine":"rfdetr-threat-apache","classes":["gun","knife"],
 "conf_gun":0.35,"conf_knife":0.42,"weights_kind":"colab_b","host":"127.0.0.1","port":8769}
```

| What you see | Meaning |
|--------------|---------|
| Green **Weapon Engine — OK** | Sidecar healthy (matches `/health`) |
| Slot Live + news video | **Video path** works (FLV/watch) |
| No box / no toast on that frame | **Detect did not fire a hit** (or hit below threshold / not shown as on-video box) |

So: **running ≠ every frame alarms.** Engine OK only means “sidecar ready to score frames,” not “I already saw a gun.”

---

## Can I “see” the gun in your screenshot?

As a human looking at the still: there is a person at a counter in a **phone/YouTube-style news clip** on the BWC (or phone held to cam). A dark object in hand can look like a gun to you.

That does **not** prove the model scored `gun ≥ 0.35` on the **frames the poller sent**.

Common reasons this exact scene fails:

1. **Screen-of-a-screen** — BWC filming a phone playing Firstpost; compression, glare, tiny weapon pixels.  
2. **Conf gate** — `conf_gun: 0.35`; weak/partial views drop below.  
3. **Poll cadence** — not every video frame is inferred; easy to miss a brief raise.  
4. **Product UI** — many builds alert via **toast / HQ bar / rail**, not a permanent YOLO box on the live tile. No box ≠ engine dead.  
5. **Class mapping** — sidecar maps to `gun` / `knife` only; odd props may not score.

---

## What to check (operator — smoke, no APPLY)

1. Keep **one** Weapon sidecar (8769). Health: open `http://127.0.0.1:8769/health` → `ready:true`.  
2. Prefer a **real** clear still or lab prop in front of BWC (not a news phone screen) for PASS/FAIL.  
3. Watch for **HQ / toast / Weapon alert chrome**, not only an on-tile box.  
4. If still zero hits on a clear lab gun for 30s+ with Engine OK → say FAIL + time; then we dig poller/sidecar logs (named MOB only if broken).

---

## Verdict

| Question | Answer |
|----------|--------|
| Engine up? | **Yes** |
| Video up? | **Yes** (your Live 1) |
| “Obvious gun” guaranteed detect? | **No** — especially phone-screen news |
| Port issue? | Unrelated; 8769 is listening and serving health |

No APPLY. Next: clear lab prop test, or CONFIRM “Engine OK but zero alerts on clear gun” for log dig.
