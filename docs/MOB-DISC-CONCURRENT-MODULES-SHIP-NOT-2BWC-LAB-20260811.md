# MOB DISC — Concurrent modules ship plan (not 2‑BWC lab cheat)

**Date:** 2026-08-11  
**Status:** DISC — product truth for **selling** Mobility Axiom with **everything online together**  
**Operator anger (valid):** Designing for concurrent modules then behaving like a **2‑BWC lab** is cheating the ship. This disc locks the real plan.

**Read with:**  
`MOB-DISC-ANPR-FLEET-CONCURRENT-MODULES-SHIP-20260811.md`  
`.cursorrules` / zero-change / WVP finish-no-park / one APPLY at a time  

---

## Plain English — what went wrong

We built **many modules** (Ops wall, live map, pin mirror, VC, FR, ANPR, Weapon, tactical surfaces) and told ourselves they run “at once.”

**Truth today:**

| Work | Where it runs | Ship risk if all on |
|------|----------------|---------------------|
| SIP REGISTER / presence / roster | **Fleet Node main** | Starves → Online/Offline flap |
| Socket.IO dashboard | Main | Lag / reconnect feel |
| WVP / FLV video handoff | Main + ZLM | OK if main breathes |
| Live map / GPS / pins | Main + UI | Needs presence stable |
| VC (conference) | Main + media path | Needs presence + sockets |
| **FR live poller** | **Same main Node** (`frLivePoller.start`) | Same starve class as ANPR |
| **ANPR live poller** | **Same main Node** (`anprLivePoller.start`) | Proven flap under load |
| **Weapon live poller** | **Same main Node** (`weaponLivePoller.start`) | Same class — will hurt when hot |
| FR / ANPR / Weapon **sidecars** | **Separate Python** | Correct isolation |

Sidecars were designed right.  
**Live pollers were bolted onto the SIP process.** That is the cheat: lab with 1–2 cams + one analytic looks fine; **customer concurrency does not.**

This is **not** “ANPR too fast.”  
This is **wrong process boundary for all analytics ingest.**

---

## What “everything online together” means (sell contract)

Customer must be able to run **at the same time**, without roster flap or dead SIP:

1. Many BWCs Online (presence truth)  
2. Ops / Command wall live video  
3. Live map + moving pins  
4. Tactical / matrix surfaces as product allows  
5. Video conference  
6. FR live watch  
7. ANPR live watch (multi-lane, aggressive grab)  
8. Weapon live watch  

**PASS bar for ship concurrency:** presence stable + sockets alive + analytics still hitting while those are open — not “ANPR alone in a quiet lab.”

---

## Architecture ending (one plan — no park)

```text
┌─────────────────────────────────────────────────────────┐
│  Fleet Node MAIN (sacred)                               │
│  SIP · presence · roster · Socket.IO · WVP handoff APIs │
│  Hit ingest only (FR/ANPR/Weapon results → store/UI)    │
└────────────▲────────────────────────────────────────────┘
             │ hits / watch-slot control (IPC or localhost)
┌────────────┴────────────────────────────────────────────┐
│  Analytics ingest isolate (worker or child Node)        │
│  Shared frame grab budget → FR / ANPR / Weapon consumers│
│  Keep aggressive cadence; drop-oldest under pressure    │
└────────────┬────────────────────────────────────────────┘
             │ HTTP
┌────────────┴──────────┬─────────────────┬───────────────┐
│  FR sidecar (Python)  │ ANPR sidecar    │ Weapon sidecar│
└───────────────────────┴─────────────────┴───────────────┘
```

**Rules:**

- Main Node **never** does tight grab→`writeFileSync`→sidecar storms for FR/ANPR/Weapon.  
- Grab rate **not** “slowed to save SIP” — isolate instead.  
- Multi-cam = **shared budget + drop-oldest**, not infinite parallel ffmpeg on main.  
- Video/VC/map stay on existing Fleet/WVP paths — finish parity; do not rebuild Fleet.

---

## APPLY ladder (genre: concurrent-modules — one MOB at a time)

Operator confirms PASS before next. No bundling. No “80% fine.”

| Step | APPLY | Why |
|------|--------|-----|
| **C0** | (optional bridge) `ANPR-PRESENCE-YIELD-KEEP-GRAB-V1` | Lab calm only — async I/O + yield + OCR in-flight cap. **Not** the ending. |
| **C1** | `ANPR-POLLER-ISOLATE-WORKER-V1` | First isolate — ANPR off main (grab stays). Prove presence + ANPR together. |
| **C2** | `FR-POLLER-ISOLATE-WORKER-V1` | Same pattern for FR. |
| **C3** | `WEAPON-POLLER-ISOLATE-WORKER-V1` | Same pattern for Weapon. |
| **C4** | `ANALYTICS-SHARED-GRAB-BUDGET-V1` | One grab pool feeding FR/ANPR/Weapon — many cams without N× storms. |
| **C5** | `CONCURRENT-MODULES-SMOKE-PACK-V1` | Paper + operator smoke: wall + map + VC + FR + ANPR + Weapon together ≥10–15 min. PASS required before pack talk. |

If worker_threads still shares enough pain after C1: escalate that poller to **child process** (`…-CHILD-PROCESS-V1`) — still no grab cut, still no park.

**WVP video phases** (wall / command / FR tiles / pin) stay on existing WVP finish ladder — **orthogonal** to this genre; do not park handoff.

---

## Explicit rejected endings (cheating)

- “Works on 2 BWC” as ship proof  
- Slow every analytic so SIP looks fine  
- Stretch offline timeout to fake Online  
- Turn off FR/ANPR/Weapon when VC or map is open  
- “Pick which module to run” as product design  
- Pretend sidecars alone = concurrency done while pollers sit on main  

---

## Recommendation (one line)

**Next product APPLY for this genre:** `MOB-APPLY ANPR-POLLER-ISOLATE-WORKER-V1`  
Then FR, then Weapon, then shared grab budget, then full concurrent smoke — **that** is the sell plan, not a 2‑cam demo.
