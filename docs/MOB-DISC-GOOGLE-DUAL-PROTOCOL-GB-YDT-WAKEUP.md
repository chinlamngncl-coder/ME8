# MOB DISC — Google dual protocol (GB28181 + YDT) · wake-up MOB list

**Date:** 2026-07-17 ~02:32  
**Status:** Paper only — **no APPLY tonight** · you sleep · work when you wake  
**Source:** Google “MASTER DIRECTIVE: DUAL-PROTOCOL SPLIT & NATIVE VIDEO RESOLUTION”  
**Your plan:** Morning = set BWC to **GB28181 + YDT**

---

## Does Google’s method make sense?

**Yes — better than “WVP steals all of 5060 and Fleet dies.”**

| Brain | Port | Job |
|-------|------|-----|
| **WVP** | **5060** | GB28181 video only (INVITE / play / native FLV) |
| **Fleet (Node)** | **5062** | YDT — GPS, hardware buttons, telemetry bridge |
| **Msg WS** | **6000** (already) | Keep if YDT/msg path uses it — do not invent a fight |

Why this fits tonight’s FAIL: camera must have **one real video SIP marriage**. That becomes WVP. Fleet stops competing for video on 5060. Buttons/GPS stay on a **second protocol** so we do not lose stop/SOS/GPS when video moves.

This also matches lab truth: physical video button often **does not** show up as GB SIP XML on Fleet (`MOB-DISC-BWC-VIDEO-BUTTON-GB-REPORT-TEST-20260715.md`). YDT (or msg WS) is the right place for buttons — then Fleet calls `wvpLab.stopPlay`.

---

## Where Google is wrong for *our* lab (do not copy blind)

| Google said | Our lab |
|-------------|---------|
| ZLM hooks → `127.0.0.1:18080` | **No** for Docker — keep `http://me8-wvp:18080/...` (already proven) |
| Rename media id to `zlm_primary` | **No need** — keep working pair `me8-zlm-modern` + matching secret |
| Flush Valkey + restart as first step again | Only if media list is red — already green earlier |
| Phase 2 as if “no ZLM” is still the blocker | Tonight’s blocker was **cam not answering WVP video SIP**, not dead ZLM |

Phase 2 = hygiene checklist, not the hero. **Phase 1 port split + real GB register to WVP** is the hero.

---

## What you do on the BWC when you wake (hardware — you)

On each lab cam (Chin / kk), dual-protocol UI:

1. **GB28181** → Server = your Wi‑Fi PC IP (e.g. `192.168.1.38`), port **5060**, WVP platform id/password (lab sheet).  
2. **YDT** → Same PC IP, port **5062** (after Fleet is moved).  
3. Save / reboot cam if the UI requires it.  
4. Do **not** leave GB still pointed at old Fleet-only 5060 while WVP also wants 5060 — one video SIP only.

Agent does not click BWC UI. You do.

---

## Wake-up MOB list (order locked — one APPLY at a time)

Say **`MOB-APPLY <name>`** for the next row only. Prove before the next.

### M0 — Paper lock (optional first line when you wake)
**`mob-dual-protocol-gb-ydt-lock-v1`** (disc-only APPLY / “go ahead lock”)  
- Lock this disc as the genre bible  
- Supersedes “never move 5060” for **this** dual-protocol plan  
- Does not change code alone

### M1 — Free 5060 for WVP · Fleet SIP → 5062
**`mob-fleet-sip-port-5062-v1`** — **APPLIED 2026-07-17** → `MOB-APPLIED-FLEET-SIP-PORT-5062-V1.md`  
- `.env` / config: Fleet GB/SIP listen **5062** (not 5060)  
- Restart Fleet · prove SIP listen log shows **5062**  
- WVP compose / START: WVP (or host proxy) owns host **5060**  
- Kill obsolete “mirror REGISTER into 5061” as the main path (or park it)  
- **You:** point BWC GB→5060 (WVP), YDT→5062 (Fleet)

**Prove:** WVP device list online with LAN · Fleet still gets YDT/GPS or msg — not black hole.

### M2 — Wall play = WVP native only
**`mob-wall-play-wvp-flv-only-v1`**  
- Soft Open / wall → WVP `/api/play/start` → HTTP/WS-FLV  
- Log must show **`live broker wvp-zlm primary`**  
- Plan B openh264 **off** for normal wall (keep emergency flag only if you want)  
- TCP-PASSIVE on WVP device (already often set — verify)

**Prove:** Chin/kk sharp native res · not 640×480 · not 10× lag.

### M3 — YDT / button → stop WVP play
**`mob-ydt-stop-bridges-wvp-v1`**  
- On YDT (or msg) “stop video” / equivalent → `wvpLab.stopPlay(camId, camId)`  
- Emit `video-stream-stopped` · `reason: device_button_stop`  
- Do not claim stop works until log shows both YDT event **and** WVP stop

**Prove:** Physical stop ends wall picture without STOPPED-BY-BWC lies.

### M4 — GPS / SOS / battery on YDT (or msg) path
**`mob-ydt-telemetry-bridge-v1`**  
- GPS into existing `gpsTrack`  
- SOS / alarms into existing alarm path  
- Battery: if YDT carries it, map in; if still on MESSAGE XML, define which pipe (YDT vs leftover) — **no silent loss**

**Prove:** Map pin moves · SOS still works · battery not “—”.

### M5 — PTT / talk (must not forget)
**`mob-ptt-after-dual-protocol-v1`**  
- PTT today is tied to Fleet SIP world — after split, prove talk still works (YDT, WVP API, or documented path)  
- **Do not** ship wall-only and discover PTT dead

**Prove:** Operator PTT pass/fail.

### M6 — Cleanup / honesty
**`mob-retire-plan-b-wall-default-v1`**  
- Remove Soft Open default to zlm-relay/ffmpeg for normal play  
- Disc + log: Plan A only on wall  
- Optional: baseline checkpoint after genre PASS

---

## Hygiene (not a separate hero MOB unless media goes red)

- Hooks stay **`me8-wvp`** DNS, not `127.0.0.1`  
- Keep existing media id/secret unless something is actually mismatched  
- Redis flush only if `media_server/list` status false  
- Revert whole rot lane anytime: **`RUN RESTORE-ME8-PRE-GATE-C`**

---

## Expected outcome (when genre PASS)

- Wall = native GB video via WVP→ZLM (1080/4K as cam sends)  
- Buttons / GPS = YDT → Fleet → bridge stop/telemetry  
- No more split-brain INVITE timeout on video  
- Plan B not the daily picture

---

## First thing when you wake

1. Read this disc.  
2. Say **`MOB-APPLY mob-fleet-sip-port-5062-v1`** (or M0 lock first if you want).  
3. After M1 code + restart: set both BWCs GB→5060 / YDT→5062.  
4. Then M2 play prove.

---

## One line

**Google dual split is the right genre: WVP=video 5060, Fleet=YDT 5062, stop button bridges to WVP stopPlay. Wake → APPLY M1 then M2. Do not copy 127.0.0.1 hooks.**
