# MOB DISC — Weapon must not kill Ops live; Weapon open is too slow (2026-08-07)

**Status:** disc only. No code until APPLY.  
**Operator:**

1. Live video **stopped for no reason** — must only stop when **user** stops it. Analytics may stop **its own** tiles.  
2. Starting Weapon analytics is **very slow** — must refresh the software several times.

---

## Product rule (lock)

| Surface | May stop BWC / WVP / Ops live stream? |
|---------|----------------------------------------|
| Ops / user Stop video | **Yes** |
| Weapon / FR / ANPR **Stop video / Stop all / Clear** | **Analytics tiles only** — **must not** stop the fleet live session if Ops (or another surface) still wants it |
| Page refresh / full reload | Unavoidably drops socket → today can release live — **bad UX**; Weapon must open without forcing refresh |

---

## What the code does today (honest)

### Live stop

Weapon UI **does not** emit `stop-live` / remove-viewer. It only `destroy()`s its own FLV player and clears `weapon-watch-slots`.

So a “mystery stop” is usually:

1. **You refreshed** (because Weapon felt stuck) → socket disconnect → `releaseCamStreamWhenUnwatched` → **Ops live dies**.  
2. Or Ops lost its last **liveViewers** ref while Weapon never registered as a viewer (Weapon is “parasite FLV” only). If Ops tile glitches / navigates away, stream can drop even though Weapon still shows a tile.  
3. Heavy still-grabs (ffmpeg) can stress the path; less common than (1).

**Your rule is right.** Analytics stop ≠ kill live. Refresh-to-fix is the trap.

### Slow start

Opening Weapon tab calls `/api/analytics/weapon/health` → sidecar **`/health` loads the full RF-DETR model** on first hit. That can take **many seconds** (cold torch). UI sits on “Checking…” / feels dead → you refresh → live dies → Start watch says **Not live — open on Ops first** → more refreshes.

Also: Start watch needs **already-live** FLV. If live already died from refresh, Weapon cannot start until Ops is opened again.

So slow + refresh loop = one bug family.

---

## Recommendation (one MOB)

**`WEAPON-LIVE-KEEP-AND-FAST-OPEN-V1`**

1. **Keep live:** While Weapon tiles are watching a cam, register a **`weapon` liveViewers surface** (same pattern as other surfaces). Stop/Clear on Weapon removes **only** that surface — does **not** force pool stop if Ops (or anyone) still holds a ref. Never call pool stop from Weapon chrome.  
2. **Fast open:** Sidecar `/health` must **not** block on cold model load (or warm model when `START-WEAPON.bat` starts; health returns “warming” vs “ok” quickly). Dashboard must not require refresh.  
3. **Start watch** works as soon as roster is up — health pill can catch up in background.  
4. No detect accuracy / conf changes in this MOB.

After PASS: you should open Weapon once, Start watch, without F5 — and Ops live should stay until **you** stop it on Ops.

---

## Not this MOB

- Knife/gun accuracy / fine-tune  
- Fake INVITE from Weapon  

---

## APPLY when ready

`MOB-APPLY WEAPON-LIVE-KEEP-AND-FAST-OPEN-V1`
