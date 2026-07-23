# MOB DISC — Plan summary: Fleet owns functions · WVP/ZLM is the video gate (NO APPLY)

**Status:** DISC only — 2026-07-19 · **no code**  
**Subject:** `MOB-DISC-PLAN-FLEET-FUNCTIONS-WVP-ZLM-VIDEO-GATE`  
**Operator question:** Fleet has every function. Put WVP/ZLM on top. All videos go through WVP/ZLM — right? Protocols (ONVIF, GB, …) still work. Is WVP/ZLM **only the video gate**?

---

## Short answer

**Yes — that is the plan.**

| Layer | Owns | Does **not** own |
|-------|------|------------------|
| **Fleet / ME8 (Axiom desk)** | Call, PTT, SOS, GPS, fleet roster, auth, evidence, wall UI, FR hooks, everything that is “product” | Native GB startPlay / FLV decode path |
| **WVP + ZLM** | **Live picture pipe** — cam stream in → playable URL out to the wall/pin | Call / PTT / SOS / “is the operator product” |

**WVP/ZLM = video gate (media path).**  
**Fleet = brain for operator functions.**  
Protocols stay: devices still speak **GB / ONVIF / SIP / PTT TCP** as they do today; WVP/ZLM does not replace those protocols — it **terminates or relays the video side** of GB (and play-out).

---

## One picture

```
BWC / cam
  │
  ├─ GB / SIP (video home) ──► WVP ──► ZLM ──► wall / pin  <── VIDEO GATE
  │
  └─ Fleet channels (PTT TCP, SOS/alarm path, Call voice,
       GPS, roster, desk APIs)                 <── PRODUCT FUNCTIONS
```

- **Open live** should prefer: WVP `startPlay` → ZLM FLV → dashboard player.  
- **Fallback** (lab only if WVP path fails): classic Fleet INVITE + FFmpeg — not the long-term story.  
- **Call / PTT / SOS** must keep working **without** pretending “ZLM picture = Fleet INVITE live.” They need an honest bridge (watch flag, PTT channel, alarm ingest) — that is unfinished work, not a change to the plan.

---

## Your three checks

### 1) “All videos are related to WVP/ZLM?”

**Target: yes for Ops live video** (wall + pin mirror of that live).

| Surface | Target |
|---------|--------|
| Wall live | WVP → ZLM |
| Pin while wall live | Mirror of wall (same picture), not a second SIP INVITE |
| Classic FFmpeg live | Fallback / legacy — not the primary story |

Not “every byte in the product” (recordings, evidence files, FR stills may still use other paths). **Live ops picture = WVP/ZLM gate.**

### 2) “Protocols still work — ONVIF, GB, wherever?”

**Yes.**

| Protocol | Role under this plan |
|----------|----------------------|
| **GB28181** | Still how many BWCs register / publish video; WVP is the GB platform for the **video home** |
| **ONVIF** | Still for devices that use ONVIF — WVP/ZLM does not delete ONVIF |
| **SIP (Fleet)** | Still for Fleet-side voice / contacts / SOS marriage where the cam has a Fleet home |
| **PTT TCP** | Still Fleet PTT server (`29201`) — not ZLM |
| **Dashboard HTTP/WS** | Still ME8 |

WVP/ZLM does **not** mean “throw away protocols.” It means **video play-out goes through the media gate.**

### 3) “WVP/ZLM is the gate **only** for video?”

**Yes — that is the locked reading of the plan.**

- **In scope for WVP/ZLM:** register/play for live media, FLV/HLS (or proxy) to browser, scale/stability of picture.  
- **Out of scope for WVP/ZLM:** replacing Call, PTT hold, cold SOS, GPS, login, evidence UI.

If Call/PTT/SOS feel dead while picture is up, that is **not** “ZLM failed.” That is **Fleet-era gates still requiring Fleet INVITE/contact** while picture already left that path — bridge work under the same plan (WVP video + Fleet functions).

---

## What we already decided (do not re-litigate)

- **WVP on top of Fleet** — not “go back to Fleet-only live as the product story.”  
- **No restore** as the answer to this architecture.  
- **Do not force every BWC onto one SIP port** as homework instead of an honest dual-home / bridge design.  
- Micro-MOBs (panel CSS, one Call gate) are **not** the whole pack — but they can still unlock one button when you name APPLY.

---

## Honest lab status (vs plan)

| Plan | Lab today (approx.) |
|------|---------------------|
| Video gate = WVP/ZLM | **Mostly true** when ZLM primary mounts |
| Fleet owns Call/PTT/SOS | **Code still partly true** — but cams on WVP-only video home often lack Fleet contact → those buttons feel dead |
| One coherent “live” flag | **In progress** (ZLM watch / Call-on-ZLM-live APPLY) |

Plan is clear. **Pack finish** = finish bridges so Fleet functions accept “video already live via WVP/ZLM.”

---

## Genre order (paper — APPLY when you say)

1. **Video gate stable** — WVP→ZLM open live (done path; keep).  
2. **Call on ZLM live** — live gate + voice without Fleet video INVITE (APPLY in flight / test).  
3. **PTT without Fleet INVITE** — wake / online for WVP-present cams.  
4. **SOS without Fleet-only cold pull** — alarm → WVP live + Fleet SOS UX.  

Until you name the next APPLY, this disc is the **one-screen plan**.

---

## Operator one-liner

> **Fleet = product. WVP/ZLM = live video gate. Protocols stay. Picture through the gate; Call/PTT/SOS still Fleet-side, bridged to that picture.**
