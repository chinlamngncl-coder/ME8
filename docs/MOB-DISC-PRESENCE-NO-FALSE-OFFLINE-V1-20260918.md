# MOB-DISC PRESENCE-NO-FALSE-OFFLINE-V1 — 2026-09-18

**Status:** paper only. No product code in this MOB until the operator types **`MOB-APPLY PRESENCE-NO-FALSE-OFFLINE-V1`**.
**Not this MOB:** PTT / `lib/pttServer.js` / SOS / Open All / health overlay / AES.
**Why now:** 4G pin blinks and GPS goes empty. Earlier presence/GPS MOBs did not stop **false offline** or **GPS wipe**. That is a code hole, not operator error.

## What the operator sees

WVP re-REGISTER / keepalive about every minute. Map goes grey then green. GPS can vanish. Hold Talk / commands look like the radio is there when it is not, or gone when it is still on air.

## Root (one)

Fleet treats a **refresh** as **death**, then **wipes session GPS**.

- GB28181 / RFC 3261: refresh REGISTER is **not** logout. Logout is **Expires: 0**. New Contact **replaces** the old one.
- Our log: WVP `register` / `keepalive` ~60s → presence → heartbeat. That is **still alive**.
- `markDeviceOffline` today **deletes `sessionGpsByCam`**. Blink → empty pin.
- If live video is open, Fleet **skips grey** (`offline skip — live session`). Pin stays green. **PTT is a different pipe (29201).** Green ≠ can talk.

## Locked product rules (bake these in)

1. Map colour = **presence**, not PTT, not “video frames exist”.
2. Do **not** seed fake GPS while the radio is **live**.
3. Do **not** wipe last coords on a **blip**.
4. New register / keepalive / Contact **wins immediately**. No freeze timer that blocks the new socket.
5. Grey clock = Fleet **`lastSeen`**. WVP keepalive/register **touches** it. WVP still listing a row does **not** keep the pin green if lastSeen is stale.
6. One camera ID. No lab names in code.

## Four traps — already vs bake in

| Trap | Today | This MOB must |
|---|---|---|
| **1 Ghost green PTT** | Live watch **blocks** offline. Green while 29201 can be dead. | **Do not** use live video as proof of control. Presence green ≠ PTT. PTT stays a later MOB. Commands/PTT may fail while green; do **not** lie that Hold Talk is ready. |
| **2 Immortal WVP** | Poller only marks online. List row is **not** a timeout. | Grey on **stale lastSeen**, even if WVP still lists the id. Poller cannot veto grey. |
| **3 Re-register lockout** | Fleet REGISTER overwrites Contact. Do **not** add a ghost timer that ignores the new REGISTER. | Sliding debounce: new register/keepalive **overwrites now**. |
| **4 Teleport GPS** | True/false offline **wipes** session GPS (empty pin). | Keep last coords. On **true** grey: faded **Last Known Location**. Next real GPS moves it. No yesterday-as-live colour. |

## What we will change (when APPLY)

**In:** `server.js` — `markDeviceOffline` / stale loop / `touchDeviceOnline` (presence only; no PTT socket logic). `lib/wvpEventBus.js` ingestPresence (register = alive). Map pin last-known style in existing presence/map JS + `public/css/global.css` if a class is required.

**Out:** `lib/pttServer.js`, `lib/sipServer.js`, video-wall Open All, health gate.

## What will not crash if APPLY is only this

Live FLV, SOS alarm path, Open All layout, PTT audio path (untouched).

## What can still fail (honest)

- Hold Talk while green if 29201 is dead — **Trap 1, parked until a PTT MOB**.
- Pin at last place after a real power-off until new GPS — **Trap 4, faded on purpose**.
- If WVP and Fleet both miss a hard drop, grey is delayed up to stale window (~3 min today). Better than blinking every 60s.

## PASS (operator)

4G unit stays **one colour** through WVP re-register. GPS does **not** blank on that blink. Power-off long enough → **faded last known**, not live. Wi‑Fi units unchanged. No Sign In. No PTT test required for this MOB.

## Double-check (locked mechanics — 2026-09-18)

Google/GB28181: keepalive XML ≠ REGISTER expiry. Refresh REGISTER is not logout. New Contact replaces old.

**Gap 1 — WVP list is not a death clock (disagree with “grey when WVP is not listing”).**  
If WVP keeps `online: true` forever, “not listing” never happens. Our poller also **never** marks Fleet offline.  
**Locked:** the only grey clock is **Fleet `lastSeen`**. WVP REGISTER/keepalive **touches `lastSeen`**. The poller may **mark online**, never **veto grey**. If lastSeen is old, grey even if WVP still has a row. We do **not** depend on WVP deleting the row. If WVP keeps sending keepalives for a corpse, that is WVP’s timeout — out of this MOB.

**Gap 2 — Sweep race, not a per-id timer.**  
There is **no** queued “mark offline at T+30” job. There is a **20s sweep** (`findStale` + two-strike grace).  
**Locked:** before `markDeviceOffline`, **re-read `lastSeen`**. If a REGISTER/heartbeat already touched, **skip**. Also **clear `offlineStaleStrikes`** on every touch. Do not invent extra timers.

**Gap 3 — Pin state is not `map-pin-layer.js`.**  
That file is cluster/GPS batch only. Presence is **`global-device-presence.js`**: `device-offline` already accepts **lat/lon**. Server wipe of `sessionGpsByCam` is why the pin goes empty.  
**Locked:** do **not** delete session GPS on offline. Keep emitting `device-offline` **with** lat/lon. Add `lastKnown: true`. CSS fade on last-known (existing pin class + `global.css`). No new websocket name required. Binary `online` stays; last-known is **grey + coords + fade**, not delete.

**Gap 4 — PTT fail-before-press is NOT this MOB (disagree).**  
`ptt-device-state` already exists. Pin PTT uses `pttOnlineDevices`. A new `ptt-offline` event here would edit PTT/UI cores we said we would not touch. Half-open 29201 is a **later PTT MOB**. Presence must **not** change `lib/pttServer.js`. Green map ≠ PTT ready — already true if 29201 emit is honest; we do not bundle it.

## APPLY (operator types this after reading)

`MOB-APPLY PRESENCE-NO-FALSE-OFFLINE-V1`
