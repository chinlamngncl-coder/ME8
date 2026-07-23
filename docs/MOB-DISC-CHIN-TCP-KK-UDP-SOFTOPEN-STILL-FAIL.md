# MOB DISC — Chin TCP vs kk UDP (Soft Open still FAIL both)

**Date:** 2026-07-17 ~15:45  
**Status:** Paper lock — hardware A/B · **no APPLY**  
**Related fail:** WVP `点播失败 -1024: 消息超时未回复` · fleet `receive_stream_timeout`

---

## BWC typing (unchanged)

Server IP = PC **`192.168.1.38`** · port **5060** · WVP platform ids. **Do not change IP.**

---

## Operator A/B (what you set)

| Cam | Register / SIP transport | Audio | Soft Open (now) |
|-----|--------------------------|-------|-----------------|
| **Chin** | **TCP** (register TCP) | **TCP** | Still **FAIL** (black / no picture) |
| **kk** | Not changed (still **UDP** path) | Not changed | Still **FAIL** |

**Conclusion from this test:** TCP on Chin alone did **not** fix Soft Open. Both cams fail the same class of error → blocker is **not only** “Chin still UDP.”

---

## Log class (same for both when Soft Open)

```
WVP: 点播失败 -1024: 消息超时未回复
Fleet: wvp_soft_try_timeout / receive_stream_timeout
```

Meaning: **INVITE / SIP reply timeout** — cam does not complete the play handshake (or INVITE never reaches cam / reply never returns). Not TooManyResults (that is fixed).

---

## Lab state that still holds

| Item | Value |
|------|--------|
| Channels | 1 per cam |
| hostAddress | Chin `.131:…` · kk `.132:…` (real LAN) |
| WVP streamMode | **TCP-PASSIVE** |
| REGISTER peer WVP sees | Often `172.21.0.1` (Docker) |

---

## What this A/B rules out / leaves open

| Ruled out | Still open |
|-----------|------------|
| “Only flip Chin to TCP and Soft Open works” | INVITE path Docker → real LAN (routing / port / Contact port) |
| Duplicate channel 500 | Cam never answers INVITE (firewall, wrong SIP port, media TCP vs signal TCP) |
| | WVP should INVITE via **host SIP proxy** again vs direct LAN (tradeoff with keepalive) |

---

## Ask Google (one paragraph)

Chin set **register TCP + audio TCP**; kk left UDP. Soft Open **fails both** with WVP `-1024 消息超时未回复` while devices online, `host_address` = real LAN, `streamMode` = TCP-PASSIVE, one channel each. REGISTER arrives as `172.21.0.1` via host proxy `:5060`. Need correct INVITE reachability: direct to BWC Contact port vs relay via host proxy; and whether signal TCP + media TCP-PASSIVE must match on both cams.

---

## Operator next (no code until APPLY)

1. Optionally set **kk** same as Chin (register TCP + audio TCP) so both match — for cleanliness, not proven fix.  
2. Do **not** change server IP/port.  
3. Wait for named MOB after Google / next diagnose (e.g. invite-via-proxy again, or RTP port publish check).

---

## One line

**Chin TCP vs kk UDP — both Soft Open FAIL; problem is INVITE timeout path, not “Chin still UDP only.”**
