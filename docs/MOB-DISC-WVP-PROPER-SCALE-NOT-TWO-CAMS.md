# MOB DISC — Do this properly: not locked to 2 BWCs / not endless lab

**Status:** LOCKED talk — architecture + honesty — **no APPLY in this message**  
**Date:** 2026-07-14  
**Search:** `hundreds BWCs`, `thousands`, `WVP ZLM proper`, `bundled config`, `not 2 cam only`

**You asked:** Find WVP bundled ZLM config → careful stamp/lowLatency → make sure PASS is **not** only these 2 cams. Hundreds/thousands coming. No time to keep looping. Why can’t we do it properly?

---

## Straight answer

**We can do it properly.** Others already do: **WVP (GB desk) + ZLM (media) + a real live player**, then **more ZLM nodes** when one box fills up. That design is **not** “kk + chin forever.”

What we have been doing for days is a **lab proof on one PC**: two Fleet tiles, one all-in-one `me8-wvp` Docker, mpegts, reopen patches. That proves **the path class**, not **fleet scale**.

| Claim | True? |
|-------|--------|
| 2-tile soak PASS = ready for thousands | **No** |
| 2-tile soak PASS = these 2 device IDs only work | **No** — if path is correct, **any** GB cam on that WVP desk uses the same Play → ZLM → browser chain |
| FFmpeg 8-cam wall = scale to thousands of viewers | **No** — Track A stays ops; Track B is WVP+ZLM class |
| One laptop Docker = production for thousands of cams | **No** — need sized servers + multi-ZLM when load grows |

**Proper = stop pretending lab patches are the product. Product = industry stack, sized right, Fleet as the face.**

---

## Bundled ZLM config — FOUND (fact)

Inside running container `me8-wvp`:

| Item | Path |
|------|------|
| ZLM binary | `/opt/media/MediaServer` |
| **Config** | **`/opt/media/config.ini`** |
| Build age | ZLM note in file: **Nov 19 2021** (old all-in-one image) |

**This** is the config that served Tile A/B — **not** `docker/zlm-config/config.ini` (that is Fleet `me8-zlm`).

### What is already in bundled ini (relevant)

| Key | Bundled value | Note |
|-----|---------------|------|
| `mergeWriteMS` | **0** | Already “instant write” |
| `modifyStamp` | **0** | Different from Fleet ZLM’s `modify_stamp=2` |
| `maxStreamWaitMS` | **15000** | |
| `streamNoneReaderDelayMS` | **18000** | |
| `rtp_proxy.timeoutSec` | **15** | |
| `http.keepAliveSecond` | **15** | |
| `lowLatency` | **missing** | This 2021 ini has **no** `[rtp] lowLatency` — Google’s knob may **not exist** on this binary |

So “careful stamp/lowLatency soak” must mean:

1. **Persist** a mount of `/opt/media/config.ini` (else Docker wipe loses it)  
2. Change only keys **this binary understands** (verify after restart)  
3. Soak again — still **path proof**, not thousand-cam proof  

Do **not** paste Google keys that are not in this file.

---

## Why it felt like we “can’t” (honest)

| Mistake | Effect |
|---------|--------|
| Treated WVP as side lab | Path worked in WVP UI; our tile lagged / died |
| Used **mpegts** instead of WVP’s usual player class (jessibuca / ws-flv properly) | Browser drops → reopen patch |
| Tuned **wrong** ZLM (`me8-zlm`) first | Track B never saw those knobs |
| One all-in-one container on a desk PC | Fine for 1–2 cams; **not** the thousand-cam architecture |
| Called reopen “stable” | You correctly rejected that |

Industry does **not** run “Open All + 8× FFmpeg × N users.” They run **register many / play few / fan-out from media nodes**.

---

## What a 2-cam PASS actually means (and does not)

### DOES prove (if soak PASS without reopen spam)

- **Any** GB28181 cam that can register to **this** WVP desk can use the **same** Play → ZLM → Fleet tile path  
- Not locked to IDs `…0008` / `…0009` — those were **samples**  
- Latency class can match WVP when path is short  
- Track B direction is correct (WVP+ZLM), Track A stays for PTT/SOS/8-ops

### Does NOT prove

- Hundreds of cams registered at once on **one** desk PC  
- Hundreds of concurrent **plays**  
- Many operators watching many tiles  
- Cellular edge cases for every unit  
- Customer ship without Docker / sizing  

**Rule:** PASS on 2 cams = **green light for architecture + next load stage**, not “ship thousands tomorrow.”

---

## Proper architecture (what “sure” looks like)

```
Hundreds–thousands of BWCs (GB28181)
        │ register / heartbeat / invite
        ▼
   WVP desk (1+)          ← signaling; can add WVP nodes later
        │ start play
        ▼
   ZLM media (1 → N)      ← one stream per playing cam; many browsers read it
        │ FLV / WS-FLV / fmp4
        ▼
   Fleet UI (Axiom)       ← login, who may watch, tiles — NOT the FFmpeg wall
```

| Scale | What you add |
|-------|----------------|
| Lab / POC (now) | 1× `me8-wvp` all-in-one, 2–8 cams, 1–2 viewers |
| Site tens–low hundreds | Separate WVP + **dedicated ZLM** on real LAN/server; BWC bitrate policy |
| Hundreds–thousands | **Multi-ZLM** (WVP media node list / load balance); enough CPU/NIC/RTP ports; optional multi-WVP groups |

WVP-Pro itself documents: stream/media **cluster**, WVP and ZLM **split**, access count limited by **server + network**, not by “two hard-coded BWCs.”

**Fleet Axiom** stays the customer face. We do **not** force clients into Chinese WVP UI. We do **use** that stack properly under our login.

---

## Locked product split (stop mixing)

| Track | Job | Scale role |
|-------|-----|------------|
| **A** | SIP 5060, Open All, PTT, SOS, 8-cam ops | Keep rock solid; **not** thousand-viewer path |
| **B** | WVP + ZLM + Fleet scale tiles | **The** path for many cams / many eyes |

Never stuff Track B into Track A pool FFmpeg again.

---

## How we get sure without you retesting forever

| Stage | Who soaks | Pass bar | Your job |
|-------|-----------|----------|----------|
| **S0** Config found + persisted | Agent | Mount `/opt/media/config.ini` from host | Restart WVP when asked |
| **S1** Stamp/timeout tune (only real keys) | Agent + **one** 30+ min soak | B does not die/reopen every few min; A stays | PASS/FAIL once |
| **S2** N-cam path (not “these two IDs”) | Agent script + 4–8 online GB if you have them | Start/stop Play on **random** deviceIds; no hardcode kk/chin | Point cams at 5061 once |
| **S3** Concurrent plays | Agent | e.g. 4–8 simultaneous plays on one ZLM; log RTP/player deaths | PASS/FAIL |
| **S4** Capacity plan (paper → hardware) | Agent | Disk of: cams registered, concurrent plays, ZLM count, NIC | Approve budget / servers — **not** daily tile babysit |

If S1 FAIL after correct bundled config: next is **player** (jessibuca-class), not more reopen.

If S3 FAIL on one PC: that is **expected** — move to split ZLM / bigger box — not “secret kk magic.”

---

## Proposed APPLY order (when you say go)

1. ~~**`mob-wvp-bundled-zlm-persist`**~~ — **APPLIED** 2026-07-14 — host `docker/wvp/zlm-bundled/config.ini` → `/opt/media/config.ini`  
2. ~~**`mob-wvp-bundled-zlm-stamp-tune`**~~ — APPLIED then **FAIL** (~2 min: A lag, B stop/play) — `docs/MOB-DISC-WVP-STAMP-TUNE-FAIL.md`  
2b. **`mob-wvp-bundled-zlm-stamp-revert`** — **NEXT** — `modifyStamp` back to **0**  
3. **`mob-wvp-play-any-device`** — only after path not making A lag / B loop  
4. **`mob-wvp-concurrent-play-N`** — N=4 then N=8 concurrent; agent logs  
5. Later genre: **split ZLM / multi-node** — when S3 hits hardware ceiling  

Stamp/lowLatency Google list: **only keys that exist** in bundled ini. `lowLatency` may need **newer ZLM** (separate image / split deploy) — that is a real scale step, not a fantasy toggle on 2021 all-in-one.

---

## Why “others can, we can”

Because the product is not “invent a new video internet.” It is:

1. Use **WVP+ZLM as designed**  
2. Put **Fleet** in front (brand, auth, scope)  
3. Use a **player that matches the stack**  
4. **Grow media nodes** when camera/play count grows  
5. Keep Track A for the ops wall you already proved  

We failed when we treated it as “hack two tiles until reopen looks OK.”  
We succeed when we treat it as **deploy that stack properly**.

---

## Forbidden

- Declaring thousand-cam ready after 2-tile PASS  
- Hardcoding only kk/chin in product logic  
- Editing Fleet `zlm-config` and calling Track B fixed  
- Endless reopen as “stability”  
- Asking you to phone-time / OSD / client measure docs  
- Mixing Open All FFmpeg into Track B  

---

## Related

- Soak facts: `docs/MOB-LOG-WVP-TILE-SOAK-2026-07-14.md`  
- Google triage: `docs/MOB-DISC-WVP-ZLM-CONFIG-GOOGLE-CHECK.md`  
- Reopen ≠ stable: `docs/MOB-DISC-WVP-REOPEN-IS-PATCH-NOT-STABLE.md`  
- Scale vs FFmpeg: `docs/MOB-DISC-WVP-SCALE-VS-FFMPEG.md`  
- Track B ladder: `docs/MOB-DISC-TRACK-B-SCALE-LIVE.md`

---

## What you say next

| You say | Meaning |
|---------|---------|
| `MOB-APPLY mob-wvp-bundled-zlm-persist` | Start proper path — mount real config |
| `MOB-APPLY mob-wvp-bundled-zlm-stamp-tune` | After persist — one careful soak |
| Hold | Stay on ops Track A; Track B paper locked |

**One line:** Proper = WVP+ZLM architecture for **any** GB cam, sized for load — lab 2 cams only **prove the pipe**, they do not **define** the fleet.
