# MOB DISC — Call button: HQ→BWC no audio on cam (Chin)

**Date:** 2026-07-17 ~23:20  
**Status:** DISC — **no Soft Open / PTT/call code patch**  
**You:** Call / Hold To Talk — BWC side **no audio** from HQ. Feel call is dead.

---

## Short verdict

**Server is trying to send call audio to Chin.**  
**Cam is not giving you hearable HQ voice.**  
That is a **downlink play / path** problem — **not** “repo restored to ancient Gold,” and **not** “SIP gone” (SOS + live RTP still prove Chin on Fleet).

**No patching tonight** until you name a later APPLY.

---

## Log facts (Chin `…0008`, after classic env)

| Time | What |
|------|------|
| 23:16:19 | `operator talk start` (PTT software path fired) |
| 23:16:27 | **Call audio INVITE** (`mode: audio`, `talk-duplex`, Talk subject) |
| 23:16:27 | **`call audio tx first`** → cam `192.168.1.131:30120` (HQ→field packets leaving PC) |
| 23:16:27 | `call audio rtp` received on local `40132` (field→HQ or echo path) |
| 23:16:52+ | **Live video INVITE 200**, `pool rtp received` **mpeg** from Chin — live path is moving again |
| Ongoing | PTT `login ok` / reconnects on `:29201` |

So:

- **Not** “call button does nothing on server.”  
- **Is** “HQ audio leaves PC; you don’t hear it on the BWC speaker.”

---

## Two different “talk” buttons (easy to mix)

| UI | Path | Log clue |
|----|------|----------|
| Fleet / pin **PTT** | PTT TCP `:29201` downlink | `operator talk start` |
| **Hold To Talk** (call-mic) | Often **SIP Talk / G.711** audio INVITE | `invite sending` `mode: audio` + `call audio tx` |

You used (or triggered) the **call/SIP talk** path at 23:16:27.  
BWC silent while `call audio tx first` exists → cam not playing that stream (volume / half-duplex / Talk profile / busy with live), **or** wrong expectation that Hold To Talk = same as cold PTT.

Known paper (old, still true): during live call, HQ continuous downlink vs BWC half-duplex can fight — see `MOB-DISC-BWC-PTT-DURING-LIVE-CALL.md`.

---

## What is **not** true

- We did **not** restore Firmware Gold (Hold To Talk = current `call-mic.js`).  
- Chin is **not** offline on SIP (SOS worked; live RTP mpeg arrived).  
- Classic env APPLY did **not** delete call code — only `.env` lab WVP off.

---

## Freeze (same as before)

**No** Soft Open UI patches.  
**No** freestyle PTT/`psG711`/`call-mic` edits.  
**No** Gold wipe.  
**No** kk rekey until Chin call/PTT story is clear.

---

## What you can check without APPLY (operator)

1. Chin volume / not muted / earpiece.  
2. Try **cold PTT** (fleet Hold) **without** live open — hear on cam?  
3. Try **Hold To Talk** only with live **stopped**.  
4. Prefer dashboard `http://192.168.1.38:3988` (not only localhost) for mic permissions.  
5. Reply four letters:  
   - Cold PTT cam hear HQ? Y/N  
   - Hold To Talk cam hear HQ? Y/N  
   - Live picture now? Y/N  
   - Field→HQ (cam PTT) you hear in browser? Y/N  

---

## Later APPLY options (you paste — not now)

| Phrase | Meaning |
|--------|---------|
| `MOB DISC call-hq-to-bwc-silent-chin-log-deep` | Deeper log-only (SDP ports, talk vs PTT) — still no code |
| `MOB-APPLY …` | Only after a **named** fix disc you approve |

---

## One line

**Call button is firing SIP talk + `call audio tx` to Chin; BWC speaker silent is the fail — live RTP is back; no patching; report cold PTT vs Hold To Talk Y/N.**
