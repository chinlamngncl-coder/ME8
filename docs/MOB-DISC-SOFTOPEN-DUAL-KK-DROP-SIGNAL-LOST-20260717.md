# MOB DISC — Dual Soft Open Chin+KK: WVP ZLM confirmed · KK drop / signal lost

**Date:** 2026-07-17 ~19:05–19:11  
**Type:** Paper only — confirm + park next MOBs  
**Operator:**
- Chin + KK another ~5 min Soft Open — **OK passed** (wall + pin)
- Double-confirm wall + pin = **WVP ZLM**?
- KK **dropped** after ~1+ min
- Panel **Play** to call KK back → **failed**
- Stop KK → Play again → runs → then **video signal lost** suddenly
- BWC still **lit / video on** (cam side still live)

---

## 1) Double confirm — wall + pin Soft Open = WVP ZLM?

**YES for both Chin and KK.**

Same Soft Open stack for wall and pin:

| Layer | Path |
|-------|------|
| SIP / play | WVP GB `startPlay` (Soft Open only — no Fleet INVITE) |
| Media | Modern ZLM HTTP-FLV **`192.168.1.38:18088`** |
| Wall UI | mpegts Soft Open overlay (`me8-zlm-soft-overlay`) |
| Pin UI | RAF **mirror** of that wall video (not a second Fleet WS) |

Broker proof (dual open ~19:05:32–35):

```
Chin …0008  live broker wvp-zlm primary  uiFlvHost 192.168.1.38:18088
KK   …0009  live broker wvp-zlm primary  uiFlvHost 192.168.1.38:18088
```

(Repeated for both cams as Soft Open / pin sync re-fetched descriptors — still always `source: wvp-zlm`, never Fleet FFmpeg primary.)

Stop proof (WVP BYE bridge, not pool-only):

```
19:08:27  KK  wvp softopen stop bridge  tracked:true  → wvp stopPlay ok
19:10:45  KK  stop bridge again (after replay)
19:11:00  Chin stop bridge tracked:true
```

**Pin is not a second media plane** — it paints from the Soft Open wall `<video>`. If wall is WVP ZLM, pin is WVP ZLM too.

---

## 2) Session timeline (KK focus)

| Time | Event |
|------|--------|
| **19:05:33** | KK Soft Open start — `wvp-zlm primary` `:18088` |
| **19:05:32+** | Chin Soft Open start — same |
| **~1+ min later** | Operator: KK **dropped** (UI) — cam may still be pushing |
| Panel **Play** | Fail to recover (see §3) |
| **19:08:27** | Operator **Stop** KK → WVP `stopPlay` ok |
| **19:08:37** | Soft Open / Play KK again → `wvp-zlm primary` again |
| After that | Operator: **video signal lost** on panel; BWC light still on |
| **19:10:45** | Stop KK again |

Chin dual-open soaked until **19:11:00** stop — consistent with “both OK ~5 min” for Chin; KK less stable.

---

## 3) Why “Play to call back” failed (after drop)

Soft Open wall is **WVP-only**. After mpegts / ZLM **player** drops:

- Dashboard may show black / idle / error while **cam still live** (INVITE not BYE’d — by design after no-auto-stop)
- Panel **Play** does **not** mean “Fleet INVITE again”
- Soft Open Play needs a clean **descriptor / softAttach** again; if UI still thinks session is half-alive, or WVP stream id stuck, Play can fail until **Stop** (BYE) then Play

That matches: Stop → Play again **worked**, then later signal lost again.

---

## 4) Why “video signal lost” but BWC still lit

Classic **player / ZLM reader stall**, not “cam stopped”:

| Side | What happens |
|------|----------------|
| Cam | Still in live / recording (light on) — RTP may still push |
| Dashboard | mpegts ERROR / stall / Soft Open prove fail → **Video signal lost** OSD |
| Same class | Lab WVP tiles: Opera/Chromium long HTTP-FLV stall (`MOB-DISC-WVP-TILE-STABILITY-FIX`, nomute / auto-reopen) |

Soft Open wall has G.711-off + micro-volume, but **does not** yet have lab-tile **auto-reopen / keepalive** on Soft Open overlay. Dual Soft Open (two FLV readers) stresses ZLM/browser more than Chin alone.

Signal lost UI is honest about **dashboard decode**; it does **not** mean WVP already sent BYE.

---

## 5) Locked facts

| Fact | Status |
|------|--------|
| Soft Open Chin wall+pin = WVP ZLM | **CONFIRMED** (prior + this dual session) |
| Soft Open KK wall+pin = WVP ZLM | **CONFIRMED** (19:05 / 19:08 starts) |
| Not Fleet FFmpeg/JSMpeg for Soft Open picture | **CONFIRMED** |
| Stop → WVP BYE | **CONFIRMED** when Stop pressed |
| KK long soak / recovery Play without Stop | **WEAK** — drop + Play fail + signal lost with cam still live |

---

## 6) Next MOBs (paper — wait for APPLY)

| Priority | Sketch name | Intent |
|----------|-------------|--------|
| 1 | `mob-softopen-zlm-keepalive-reopen-v1` | Port lab-tile keepalive / auto-reopen onto Soft Open mpegts (dual Soft Open soak) |
| 2 | `mob-softopen-play-recovers-without-force-stop-v1` | Panel Play after drop re-softAttaches / re-startPlay without requiring Stop first (careful vs ghost sessions) |
| 3 | `mob-softopen-signal-lost-vs-cam-still-live-copy-v1` | OSD copy: “viewer lost — cam may still be live — Stop then Play” (UX only) |

Park: HD / main stream until Soft Open dual soak is stable.

---

## One line

**Chin+KK Soft Open wall+pin = WVP ZLM `:18088` confirmed; KK drop/Play-fail/signal-lost with BWC still lit = player/ZLM stall class — next = Soft Open keepalive/reopen, not leave WVP.**
