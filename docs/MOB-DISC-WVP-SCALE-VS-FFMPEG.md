# MOB DISC — Why WVP+ZLM scales; can FFmpeg do 8×10?

**Status:** talk only — **no code**  
**Date:** 2026-07-14  
**Search:** `WVP scale`, `super admin many viewers`, `8x10`, `ffmpeg vs ZLM`, `mvpro`

**You asked:** Chinese stacks with ZLM + **WVP-Pro** look easy at many streams. We struggle. Is WVP a ghost? Without it, can FFmpeg carry super-admin / many users seeing lots of video (e.g. **8 cams × 10 users ≈ 80 views**)?

---

## Plain answer

| Question | Answer |
|----------|--------|
| Is WVP-Pro a ghost? | **No.** It is the **front desk for many cameras** (register, invite, list channels). ZLM is the **media box** that fans picture out to many browsers. |
| Why they look “easy”? | That pair is **built for many cams + many watchers**. One cam → one media path → many viewers **copy the same stream**. |
| Can FFmpeg alone do 8×10? | **Not the way we use it today.** FFmpeg is a **converter**, not a **many-viewer gateway**. |
| Do we still need that class of box? | **Yes**, if super-admin / many desks must watch many lives at once. |

---

## Two different jobs (stop mixing them)

```
WVP-Pro     = who is online, start/stop live, GB rules, big device list
ZLM         = hold the video, give each browser a play URL (many readers OK)

Our Fleet today:
SIP + Node  = invite cam
FFmpeg      = convert EACH live cam into a format our wall player likes
JSMpeg wall = one (or few) operators on one PC
```

Chinese “easy” demos usually show **WVP UI + ZLM play** — not “8 FFmpeg processes per operator PC.”

We spent months making **8-BWC SIP + PTT + SOS + wall** rock solid. That is a **different product**. Scale many-viewer live is the **other** product. Treating WVP as a side lab made it look like a ghost — wrong for **your** super-admin story.

---

## Why FFmpeg cannot “just do” 8×10

**What we do now (rough):**  
Each live cam → **one FFmpeg** convert for the wall path.

**8 cams live** ≈ 8 converts on the server. Painful but lab-doable.

**8 cams × 10 users watching:**

| Bad idea | Why it dies |
|----------|-------------|
| 80 separate FFmpeg converts | CPU melts; one PC cannot |
| One FFmpeg per cam, but each browser opens a **new** heavy pipe | Same problem if every viewer triggers work |
| Keep MPEG1 + pile more WebSocket clients | Open All already showed **invite / client pile-up**; 10 dashboards makes it worse |

**What scale systems do instead:**

1. **One** ingest / one encode (or none — keep cam H.264) **per camera**  
2. Put that stream in a **media box (ZLM)**  
3. **10 users** all read the **same** stream (cheap copies)

That second box is why WVP+ZLM feels easy. WVP handles **many cams registering**. ZLM handles **many eyes**.

FFmpeg can still sit **once** per cam (or not at all if cam→ZLM direct). FFmpeg is **not** the fan-out for 80 eyes.

---

## Your target (super admin / many users)

Imagine:

- Many BWCs online  
- Super admin + assigned users  
- Walls like **8×10** views (many tiles × many people)

That is **exactly** the WVP+ZLM class:

| Piece | Role for Ubitron |
|-------|------------------|
| **WVP-Pro** (or same job we build later) | Big fleet register / channel / play control |
| **ZLM** | Many concurrent plays without 80 FFmpeg |
| **Our Fleet UI** | Ops, SOS, PTT, evidence, roles — **embed or open** those plays |

Day-to-day **8-cam SIP wall** can stay.  
**Scale live** should not pretend FFmpeg+JSMpeg is the gateway.

---

## Honest “how could FFmpeg do it?”

Only if we abuse the word “FFmpeg”:

- **Farm:** many machines, each runs some converts — still need a **fan-out** in front  
- **One FFmpeg per cam → push once into ZLM** — then FFmpeg is ingest helper; **ZLM does the many viewers**  
- **Pure FFmpeg + file/UDP tee to 80 clients** — not a real product; no one ships that for super-admin

So: **FFmpeg alone ≠ large streaming gateway.**  
**ZLM (with or without WVP in front) = gateway.**  
**WVP-Pro = large GB desk in front of that gateway.**

---

## Why we look behind (not because you’re wrong)

1. We locked **Fleet SIP wall** as sacred (good for 8-cam ops).  
2. We tried to **bolt ZLM onto** that path (side relay / pool tee) → Open All broke.  
3. We treated **WVP** as a lab toy instead of the **scale desk**.  
4. Chinese demos start from **WVP+ZLM**, not from “fix PTT then add 80 viewers.”

---

## Direction lock (DISC — for when you leave talk)

**Keep both jobs clear:**

| Track | Use |
|-------|-----|
| **A — Ops Fleet** | 8-cam SIP, PTT, SOS, wall — FFmpeg/JSMpeg OK for **few** eyes |
| **B — Scale live** | WVP-Pro (or equivalent) + ZLM for **many cams / many users / super-admin walls** |

Do **not** ask Track A’s FFmpeg to become Track B’s gateway.  
Do **not** ghost Track B if the sales story is super-admin × many videos.

**How to build B:** `docs/MOB-DISC-TRACK-B-SCALE-LIVE.md` (locked train B0→B4).

---

## Related

- Track B how-to: `docs/MOB-DISC-TRACK-B-SCALE-LIVE.md`  
- WVP lab: `docs/MOB-DISC-ZLM-GB28181-WVP.md`  
- Speed vs wall: `docs/MOB-DISC-WVP-TOP-SPEED-VS-WALL.md`  
- Open All + lab ZLM noise: `docs/MOB-DISC-OPEN-ALL-KK-AFTER-FAST-REVERT.md`
