# MOB DISC — Gate A soak PASS (2026-07-06)

**Status:** **Operator PASS** — 30+ min Open All, no false stops; agent log-verified  
**Search:** `Gate A`, `soak`, `30 min`, `VIDEO SIGNAL LOST`, `Stopped by BWC`

---

## What you reported

- **Open All** both BWCs for **~30 minutes**
- **No** VIDEO SIGNAL LOST
- **No** false **Stopped by BWC** / stall overlay

---

## Agent verification (`storage/fleet.log`)

| Time | Event |
|------|--------|
| **13:59:43** | `pool invite sending` — Chin + kk (Open All) |
| **14:00:50** | `pool ws client attached` — live pipeline running |
| **13:59 → 14:33** | **No** `pool remote bye`, **no** `register_expired`, **no** `device offline` |
| **14:33:13** | Clean stop — `pool stop — no dashboard viewers` (you ended session) |

**Duration:** ~**33 minutes** continuous live (exceeds Gate A 10+ min bar).

**Earlier kk drop (13:28)** was a **real** BWC `register_expired` + BYE — separate incident, resolved before this soak.

---

## What this proves

| Area | Result |
|------|--------|
| Firmware Gold wall + pool | **Stable** for 30+ min with 2 live cams |
| False “Stopped by BWC” during soak | **None** (operator + logs) |
| Gate B ZLM lab | **Unrelated** — wall stayed FFmpeg; no pool regression |

---

## Gate A — remaining (optional)

| Item | Status |
|------|--------|
| 10+ min Open All, 2 cams | **PASS** 2026-07-06 |
| Alt-tab soak (Opera ↔ Cursor) with background-tab MOB | **Not retested** this session — see `MOB-DISC-BWC-STOPPED-FLICKER.md` |
| Formal **GATE A PASS** genre commit | Parked until you confirm alt-tab OK or waive |

---

## Next (your choice)

- **`pause`** — bench is in good shape; continue other work
- **Alt-tab retest** — Open All 10 min, switch Cursor ↔ Opera once; reply PASS/FAIL
- **Gate C** — only after you’re happy with wall stability

---

## Related

- `docs/MOB-DISC-BWC-STOPPED-FLICKER.md`
- `docs/MOB-DISC-ZLM-GATE-B-PASS.md`
- `docs/MOB-DISC-LAB-IP-ROLES.md`
