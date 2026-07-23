# MOB-DISC — Slow online/GPS + group PTT is not BWC-to-BWC mesh

**Date:** 2026-07-20  
**Status:** DISC only — **no code** until named APPLY  
**Operator report:**
1. Takes **minutes** to get all BWCs online + location; often need **browser refresh** — not enterprise feel.
2. SOS group PTT: cold SOS OK, PTT team OK, **HQ → all OK**. But when **another unit** (not on video) presses PTT, **HQ hears**, **kk does not**. Expected “group = everyone hears everyone.”

---

## Part A — Online + location (not fine for enterprise; explainable today)

### Direct answer

**No — waiting minutes + refresh is not the target enterprise behaviour.**  
It is a **known WVP-on-Fleet gap**, not “how Fleet was designed on classic `:5062`.”

You are still on **Fleet UI + roster**. WVP changed **where REGISTER lives** (`:5060`), so Fleet no longer gets instant “cam registered → green dot” the way Jul-18 classic-pass did.

### How classic Fleet worked (Jul 18 PASS)

```
BWC REGISTER → Fleet :5062
  → touchDeviceOnline / register ok
  → emitFleetRoster immediately
  → GPS query on connect
```

Dots and map updated in **seconds**.

### How today works (WVP on Fleet)

```
BWC REGISTER → WVP :5060 (not Fleet :5062)
Fleet online from:
  • wvp acl presence → fleet (keepalive / device-status translator)
  • optional wvpFleetPresence poll (FM_WVP_FLEET_PRESENCE=1)
  • NOT from classic Fleet REGISTER
```

Lab env often has **`FM_WVP_FLEET_PRESENCE=0`** (honest mode — no fake green from WVP API). That is correct for truth, but **slower** until WVP keepalives arrive.

### Why minutes + refresh

| Factor | Today | Effect |
|--------|-------|--------|
| `FM_WVP_FLEET_PRESENCE=0` | No 8s WVP API poll | Online waits on ACL keepalive cadence |
| Boot `seedFleetOnlineFromPersistedState` | Real GB cams start **offline** | No fake greens after restart |
| `replayOnlineDeviceStateToSocket` | Only replays cams **already** `online` in registry | Fresh dashboard connect sees empty if server not marked them yet |
| `GPS_POLL_MS` default **120000** (2 min) | Background GPS poll slow | Location lags even after online |
| `bootstrapOnlineFleetForMap` | Polls GPS for **already-online** only | Does not discover WVP-online by itself |

**Refresh “fixes” it** because by then WVP keepalives have marked cams online, roster cached, GPS queries ran — not because refresh is the product design.

### This is glue, not redoing Fleet

Same Fleet roster/map/PTT product. Missing piece: **fast WVP→Fleet presence + GPS warm on dashboard connect**, without lying about SIP home.

### Ranked APPLYs (online/GPS only)

| MOB | What |
|-----|------|
| **`MOB-APPLY-DASHBOARD-CONNECT-WVP-PRESENCE-WARM-V1`** | On dashboard connect: one-shot WVP device list → `markOnline` + `emitFleetRoster` + forced GPS/status burst for all visible BWCs |
| **`MOB-APPLY-FM-GPS-POLL-LAB-V1`** | Lower `FM_GPS_POLL_MS` for lab (e.g. 15–30s) — env only, discuss ship default separately |
| Optional | Re-enable `FM_WVP_FLEET_PRESENCE=1` with clear “WVP online ≠ Fleet SIP” lab note — only if operator accepts trade-off |

**Not:** full classic restore, not new product UI.

---

## Part B — Group PTT: HQ hears helper, kk does not (design gap, not kk-video bug)

### Direct answer

**This is not because kk has live video open** (primary reason).  
**Group PTT today is hub-and-spoke through HQ desk — not BWC-to-BWC mesh.**

Your test matches **existing Fleet design**:

| Direction | Path | Who hears |
|-----------|------|-----------|
| **HQ hold PTT** | `ptt-start` → `ptt-audio` → `sendPttAudioToDevice` **each** team cam | All BWCs on team (you said **PASS**) |
| **BWC hardware / field PTT** | `:29201` inbound → `handleInboundPttAudio` → `emitPttRxAudio` | **HQ dashboard speakers only** |

There is **no code** that relays Chin’s field uplink to kk (or any other team member).

```326:356:lib/pttServer.js
function handleInboundPttAudio(camId, alawPayload, callbacks) {
    // ...
    if (typeof onPttRxAudio === 'function') {
        // alaw → PCM → onPttRxAudio(id, pcm)  →  io.emit('ptt-rx-audio')  →  HQ only
    }
}
```

```9011:9013:server.js
function emitPttRxAudio(camId, pcmBuf) {
    io.emit('ptt-rx-audio', { camId }, pcmBuf);
}
```

**SOS team XML** puts units in the same **group config** so they share a channel for **desk-initiated** talk and firmware group semantics. It does **not** add server-side **field→field audio relay**.

### What you observed (expected with current code)

1. PTT team ON — Chin + kk in group  
2. HQ holds PTT → **all hear HQ** ✓ (outbound fanout works — TX proof confirmed)  
3. Chin (helper, no video) presses PTT → **HQ hears** ✓ (`rx from field` → desk RX)  
4. **kk does not hear Chin** ✓ — **no relay to kk exists**

That is **not** “grouping failed.” Grouping worked for **HQ → all**. **Field → other BWCs** was never implemented on the server.

### Is kk-on-video a secondary factor?

Maybe, but **secondary**:

- If we **did** relay field audio to kk, firmware might still struggle to **play** downlink while alarm cam is in SOS + live (half-duplex). Worth testing **after** relay exists.
- Today kk cannot hear because **nothing is sent to kk’s `:29201` socket** when Chin transmits.

### Not call path

Field PTT uses `handleInboundPttAudio` / `ptt-rx-audio`, not `start-bwc-call` / intercom.

---

## What “group should mean” — product choice

| Model | Behaviour | Today |
|-------|-----------|-------|
| **A — Classic hub (current)** | All field TX → HQ; HQ TX → all team | **Implemented** |
| **B — True radio mesh** | Any team member field TX → HQ **and** all other team BWCs | **Not implemented** |

Months of classic PASS tuned **model A**. Operator expectation sounds like **model B**.

Implementing B needs a **named MOB**, e.g.:

**`MOB-APPLY-SOS-GROUP-FIELD-RX-RELAY-V1`**

- On `handleInboundPttAudio`, if cam is in active SOS/dispatch team, also `sendPttAudioToDevice` to **other** online team members (exclude speaker).
- Must not touch locked cores without naming files; likely `server.js` callback wrapper only.
- Operator test matrix: Chin TX → kk ear, kk on video vs not, HQ still hears.

**Do not assume** this MOB until you explicitly order it — it is new behaviour, not a restore.

---

## Summary table

| Issue | Root cause | Redo Fleet? | Next step |
|-------|------------|-------------|-----------|
| Minutes to online + refresh | WVP `:5060` home; presence off; slow GPS poll; roster waits for marks | **No** — warm presence on connect | `MOB-APPLY-DASHBOARD-CONNECT-WVP-PRESENCE-WARM-V1` |
| kk deaf to Chin on group | Field TX → HQ only; no BWC-to-BWC relay | **No** — missing feature vs expectation | Discuss `MOB-APPLY-SOS-GROUP-FIELD-RX-RELAY-V1` |
| HQ → all OK | Working as designed | — | Closed |
| Choppy 1:1 | TCP churn / device playout (separate track) | — | hold-skip refresh MOB applied |

---

## One line

**Slow online/location is WVP presence glue — fix with connect-time warm, not refresh habit.**  
**kk not hearing Chin on group PTT is not “group broken” — field audio only goes to HQ today; true team mesh needs a separate named relay MOB if you want it.**
