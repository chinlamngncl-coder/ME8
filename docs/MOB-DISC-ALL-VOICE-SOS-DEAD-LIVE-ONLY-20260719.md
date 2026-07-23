# MOB DISC — Cold SOS / SOS / PTT / Call / cold PTT all dead · live only (NO APPLY)

**Status:** DISC only — 2026-07-19 ~16:30 +08 · **no code**  
**Subject:** `MOB-DISC-ALL-VOICE-SOS-DEAD-LIVE-ONLY`  
**Operator:** “same — cold sos, sos, ptt, call, cold ptt all dead. nothing works except live.”

---

## Short verdict

**Live picture working ≠ voice / SOS stack working.**

Right now the lab is split across **two brains**:

| Brain | Port | What still works |
|-------|------|------------------|
| **WVP → ZLM** | SIP **5060** + FLV **18088** | **Open live / wall picture** |
| **Fleet / ME8 Node** | SIP **5062** + PTT **29201** | Cold SOS pull, classic INVITE, Call-via-PTT, cold PTT channel — **mostly dead for you** |

ZLM-watch APPLYs only tried to fix **“Call thinks not live”** after ZLM picture. They **cannot** by themselves restore **Fleet marriage** (SOS MESSAGE, SIP contact, PTT device online).

You are not crazy. The desk is half-alive on purpose of the dual-home mess — not because you failed one refresh.

---

## Evidence from service log (this session)

### 1) Both cams “online” from WVP paint — not Fleet REGISTER

```text
sip listening … port 5062
device online from wvp presence …00009
device online from wvp presence …00008
```

So the map/fleet **row can look online** from **WVP presence mirror**, while Fleet may still have **no real SIP contact** on **5062** for that cam.

That pattern matches: **picture yes · cold SOS / Fleet invite / PTT brain no.**

### 2) ZLM-watch race (before remount fix) left viewers at 0

Last watch lines (~16:23) still show register → unregister loops, ending:

```text
zlm-watch-unregister …00008 remainingViewers:0
zlm-watch-unregister …00009 remainingViewers:0
```

After that: **no new `zlm-watch-register`** in the log through ~16:30.

So even the Call unlock path was **cleared**. If the browser did not hard-refresh the **no-unregister** build and **Play again**, Call still sees “not live” on the server.

### 3) Call

No `start-bwc-call` / “Start live video before calling” lines in the latest slice — either Call never reached the server, or UI blocked earlier. After watch=0, server Call gate still fails `isLiveForVoiceCall`.

Even with watch=1, Call still requires:

```text
pttServer.isDevicePttOnline(camId)
```

→ alert **“BWC not on PTT channel — wait after live start”** if PTT TCP never joined.

### 4) PTT

Repeated:

```text
operator fleet ptt wake …00008 / …00009
```

Wake is **attempted**. That is not the same as **PTT device online / talk TX / cold RX banner**. Wake without a Fleet/PTT marriage = button feels dead.

### 5) SOS

No fresh `sos-alarm` / cold pull success in this slice. Cold SOS needs the alarm path to hit **Fleet** (or a designed WVP→Fleet bridge). Cam married only to **WVP :5060** often delivers **no** Fleet cold SOS even when ZLM live works.

### 6) Residual Fleet INVITE noise

```text
invite requested …00008 / …00009
```

Still appears (fallback / other surface). That is **not** healthy classic live for WVP-only cams (often 408). It does **not** fix Call/PTT by itself.

---

## Feature matrix (why “all dead except live”)

| Feature | Needs | Status now (lab) |
|---------|--------|------------------|
| Open live (ZLM) | WVP session + broker FLV | **Works** |
| Call | Watch/streaming **and** PTT online | **Dead** (watch cleared +/or PTT offline) |
| PTT TX (live pin/wall) | PTT channel online + hold path | **Dead** (wake only) |
| Cold PTT / missed banner | BWC PTT TCP + RX events | **Dead** without PTT marriage |
| Cold SOS | Alarm to Fleet + contact / pull | **Dead** if cam not on Fleet SIP home |
| SOS while live | Fleet SOS + wall assign | **Dead** same family |

---

## What the recent APPLYs did / did not do

| APPLY | Intent | Limit |
|-------|--------|--------|
| `ZLM-WATCH-REGISTER-CALL-PTT` | Viewer ref without INVITE | Undone by unregister race |
| `ZLM-WATCH-NO-UNREGISTER-ON-REMOUNT` | Stop race | **Frontend only** — must hard refresh + Play; does **not** invent Fleet SOS/PTT |
| Panel bank size / 5+3 | Layout | Irrelevant to SOS/PTT death |

**None of these replace “cam REGISTER / MESSAGE home = Fleet 5062” for classic cold SOS/PTT.**

---

## Do **not** hear this as “change both BWCs to 5060”

Locked: `MOB-DISC-TWO-BWC-TWO-SIP-HOMES-NO-FORCE-5060-20260719.md`

- Keep your two platforms if you want.  
- Expect **asymmetric** cams: WVP cam = picture; Fleet cam = SOS/PTT; mix = pain.  
- Agent must not pretend one ZLM-watch MOB fixes the whole voice/SOS stack.

---

## Honest paths forward (pick later — NO APPLY now)

### Path A — Prove Call only (smallest)

1. Hard refresh Ops (`video-wall.js?v=20260719-zlm-watch-stable`).  
2. Play live again → confirm log **`zlm-watch-register` viewers≥1** and **no** immediate unregister.  
3. Click Call → if still fail, read exact alert (live vs PTT channel).  
→ Named APPLY only for the next gate that fails.

### Path B — Restore Fleet voice/SOS for a cam (product choice)

One cam (or both) must actually **speak Fleet :5062** for cold SOS/PTT — **only if you order that genre**. Not forced 5060 unify.

### Path C — Architecture genre (large)

All voice/SOS via WVP-side design (no Fleet SIP) — **not** started without your named APPLY. Huge.

### Path D — Classic revert genre

Invite-on-play + Fleet live again — brings 408 noise back; only if you name it.

---

## Agent rule for next replies

- Do **not** claim “Call/PTT fixed” after ZLM-watch alone.  
- Do **not** nag “change all to 5060.”  
- Separate: **picture** vs **Fleet contact** vs **PTT online**.  
- One APPLY at a time after you choose A/B/C/D.

---

## Status

**DISC only.**  

**Bottom line:** Live = WVP/ZLM. Cold SOS / SOS / Call / PTT / cold PTT = Fleet+PTT stack still not married. ZLM-watch race made Call worse until remount fix; even fixed, it cannot resurrect cold SOS/PTT alone.

Waiting for your path letter + APPLY name — not freestyle.
