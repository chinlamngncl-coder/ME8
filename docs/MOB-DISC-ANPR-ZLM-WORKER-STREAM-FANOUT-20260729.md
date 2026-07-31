# MOB DISC — ANPR worker on ZLM stream: multi-viewer / BWC load arguments

**Date:** 2026-07-29  
**Status:** **DISC** — architecture review only; no APPLY  
**Search:** ANPR ZLM worker, YOLO PaddleOCR, multi stream, concurrent viewers, BWC load, fan-out  
**Trigger:** Operator paste `ZLM_ANPR_Worker` + question: can one BWC feed many places; does WVP/ZLM distribute?

---

## Plain answer

**Yes — you should think about streaming, but the worry is mostly in the right place.**

| Layer | Who carries the load? | Worry level for “many viewers” |
|-------|----------------------|--------------------------------|
| **Body-worn camera (BWC)** | Sends **one** uplink to the server (SIP/GB path → WVP) | **Low** for extra dashboard viewers — camera does **not** open a new encode per browser |
| **WVP + ZLM** | Holds the live media source and **fans out** play URLs (FLV/RTSP/etc.) to many consumers | **This is the distributor** — designed for multiple readers of the same stream |
| **Each consumer** (Operations wall, Command Wall, pin mirror, ANPR worker, FR grab) | Pulls from ZLM/proxy; burns **server CPU/GPU/RAM/bandwidth** | **Medium–high** if you add heavy AI on every camera |

So: **same BWC can support many “places” watching** because WVP/ZLM redistributes.  
The BWC is **not** opening N separate live sessions to N dashboards.  
**ANPR must not open a second invite storm to the camera** — it should attach to the **already-playing ZLM/WVP output** (the idea in the paste is directionally right).

---

## How our product already thinks (aligned)

| Pattern we already use | Meaning |
|------------------------|---------|
| Pin **mirrors** wall video | One live decode path; pin does not start a second FLV when wall is live |
| WVP `startPlay` + reuse / handoff cache | Avoid hammering play-start for the same cam |
| FR / probes that pull JPEG from FLV | Analytics can sip from the distributed stream, not from the BWC directly |

ANPR worker = another **downstream consumer** of ZLM, like a smart viewer — not a second camera uplink.

---

## Arguments / concerns on the pasted Python worker

### What is good

1. **Attach to existing ZLM URL** — correct distribution model.  
2. **`process_fps` (e.g. 5)** — do not run YOLO/OCR on every 30 fps frame; protects CPU.  
3. **Region → OCR language map** — fine for KR/TH/EN footprint.  
4. **Metadata out** (plate JSON) separate from video routing — ZLM keeps doing video; AI emits events.

### What to argue / fix before APPLY

| Issue | Why it matters |
|-------|----------------|
| **Hard-coded `rtsp://127.0.0.1:554/live/camera_01`** | Our play path is WVP/ZLM via product URLs / proxy (`flvUrl`, lab proxy) — must use **real stream IDs from WVP play**, not invented demo paths |
| **One OpenCV capture per worker forever** | Fine for 1–few cams; at fleet scale you need a **manager** (which cams are “ANPR armed”), start/stop workers, and caps |
| **YOLO + PaddleOCR on same box as dashboard** | Heavy. At many concurrent ANPR cams, use dedicated AI host or strict cam limit + license entitlement |
| **No tie to our license gate** | Must check `analyticsAnpr` (or equivalent) — placeholder `_verify_crm_license` is not enough |
| **No durable event path** | `logging.info` is not product; need Socket.IO / API / DB into **Analytics** UI |
| **Stream drop / reconnect loop** | OK sketch; production needs backoff, and **don’t** call WVP startPlay on every reconnect if play already active |
| **Weapon detection** | Same pattern (consume ZLM, sample FPS) — separate model; still one uplink from BWC |
| **Class name `ZLM_ANPR_Worker`** | Internal OK; customer manuals say **ANPR**, not ZLM slang |

### Verdict on the snippet

**Direction: PASS as a lab sketch.**  
**Not ship-ready.** Do not drop into production without a named MOB that wires: entitlement, real FLV/RTSP URL from our play broker, event bus, and CPU caps.

---

## Direct answers to your questions

### 1) Do we need to worry about streaming as we add more places?

**Worry about server/ZLM fan-out capacity and AI CPU — not about the BWC growing N uplinks.**

Places that only **play** the same ZLM source (wall, Command Wall, extra operators, ANPR pull) share one camera session upstream (once play is up).

Places that each call **startPlay / invite** carelessly can still hurt — our handoff code already tries to **reuse**. ANPR must join that reuse model.

### 2) Can the same BWC support so many streams?

**One uplink from BWC; many downstream readers.**  
Limits are:

- Radio/battery/encode on device (usually one live video session to server)  
- How many **concurrent plays** WVP/ZLM and the host can serve  
- How many **AI workers** you run (often the first bottleneck)

### 3) Will WVP/ZLM handle distribution to all functions?

**Yes — that is their job.**  
ZLM multiplexes one media source to many clients (FLV/RTSP/…).  
WVP owns device play/start and ties GB/SIP into that media path.

**Functions should:**  
Operations / Command Wall / pin / ANPR / FR → **consume ZLM/WVP play output**  
**Not:** each function open its own SIP video invite to the BWC.

---

## Recommended architecture (locked for later ANPR MOB)

```
BWC  --(one live uplink)-->  WVP/ZLM  --fan-out-->  browser players
                                      \--fan-out-->  ANPR worker (sample 2–5 fps)
                                      \--fan-out-->  weapon worker (sample …)
                                      \--fan-out-->  other analytics
```

Rules:

1. Start play once (or reuse existing play).  
2. AI attaches to published URL.  
3. Cap AI FPS and max concurrent AI cams.  
4. License gate before worker starts.  
5. Emit events to dashboard — do not re-encode video for AI unless required.

---

## Do we APPLY this Python now?

**No.** Park with analytics software genre. When you order ANPR product work, name a MOB that uses **our** stream URLs and license features — not this demo `camera_01` script as-is.

---

## Lock record

| Question | Answer |
|----------|--------|
| Worry about multi-place streaming? | Yes — at **ZLM/server/AI**, not N BWC uplinks |
| Same BWC, many viewers? | Yes via WVP/ZLM fan-out |
| Paste worker direction? | Good; not production yet |
| Code edits | **None** |
