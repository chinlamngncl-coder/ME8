# MOB DISC — Weapon tile “Not live” vs roster “Live 1” (2026-08-06)

**Status:** disc only. No code until APPLY.  
**Operator pic:** Weapon Engine OK; tile 1 = **Not live — open on Ops first**; roster kk = green online + **Live 1**.

---

## Short answer

Engine OK ≠ video.  
Weapon **does not INVITE** the BWC. It only attaches if that cam is **already streaming** (Ops / Command Wall / matrix opened it first).

Your tile is telling the truth. Roster **Live 1** is **misleading** — it means “assigned to tile slot 1,” not “FLV is playing.”

---

## What the UI is doing

1. You Start watch → kk goes into slot 1.
2. Browser calls `GET /api/analytics/weapon/already-live?camId=…`
3. Server only returns `flvUrl` if WVP handoff has a **cached FLV** for that cam (or pool streaming).
4. No `flvUrl` → tile paints **Not live — open on Ops first**.
5. Roster badge `Live 1` = `tileBadgeHtml` when `slotCam[0] === kk` — **does not check** proven FLV / `is-live` class.

So: engine PASS. Video path blocked by **already-live lock** (by design from Weapon shell MOB). Confusing chrome = roster badge.

---

## What you do (no APPLY)

1. Go **Operations**.
2. Open **kk** live until you see real video (Ops wall / pin).
3. Stay on that session (don’t stop the stream).
4. Open **Analytics → Weapon** again.
5. Keep kk selected → **Start watch**.

Tile 1 should go Connecting → picture. Then stills / Recent can run.

If Ops itself cannot play kk → that is Ops/WVP, not Weapon.

---

## Optional later MOB (only if you want clearer UI)

**`WEAPON-ROSTER-BADGE-PROVEN-LIVE-V1`**  
- Show **Live N** only when tile has proven video (`is-live`).  
- While waiting / not-live: show **Connecting…** or **Open on Ops** — not fake Live.

Not required to play video. Operator path above is enough.

---

## Not broken

- Weapon Engine — OK (transformers pin worked).
- kk online / in watch / group PP.
- Locked product rule: already-live only (no silent fleet INVITE).
