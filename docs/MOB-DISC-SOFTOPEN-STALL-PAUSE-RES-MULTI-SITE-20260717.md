# MOB DISC — Soft Open stall vs pause · pin vs wall look · multi-site / SIM / HQ / cloud

**Date:** 2026-07-17  
**Status:** DISC only — no code  
**Context:** Dual Soft Open soak; KK stall / signal-lost while BWC still lit; keepalive/reopen applied as **band-aid**; operator asks how to prevent, how BWC can pause, why pin looks sharper than wall, and how networking survives SIM / dynamic IP / HQ fixed / cloud / multi-node without another 2-day firefight.

---

## 1) How do we prevent “dead tile while cam still lit” — without endless reopen?

### Honest split

| Layer | What failed in lab | Fix class |
|-------|-------------------|-----------|
| **SIP / GB invite** | Cam accepted INVITE (`200 OK`) | Already PASS when Soft Open works |
| **WVP → ZLM media** | Session can stay “live” on device while **browser FLV** stalls | Media / player / ZLM, not “call again” |
| **Browser mpegts** | Frozen `currentTime`, ERROR, Play fail until Stop→Play | Viewer-side; reopen is recovery, not prevention |

**Keepalive / auto-reopen is not the product answer.** It is a **viewer recovery** when the FLV pipe or MSE demux stalls. Calling StartPlay / re-fetch forever is wrong: burns WVP/ZLM, looks like flicker, and fights a BWC that **intentionally** stopped sending.

### Prevention (preferred order — discuss before any APPLY)

1. **One authority for “stream wanted”**  
   - Operator Soft Open / Stop = HQ wants picture.  
   - BWC stop / pause / lens-off / battery / toilet = device no longer sends.  
   - UI must distinguish: **viewer lost** vs **cam ended stream** (OSD copy later MOB).

2. **Server-side session health (not browser spam)**  
   - Watch WVP/ZLM: readers, bitrate, last media packet age.  
   - If ZLM has no media → mark session dead once; do **not** loop StartPlay from the browser.  
   - If ZLM still has media but browser stalled → **one** silent viewer reopen (budget already 12) then “viewer lost — cam may still be live”.

3. **Stop bridge stays sacred**  
   - Operator Stop → `wvpLab.stopPlay` (already).  
   - Player fail must **never** auto-BYE (already locked).  
   - BWC-side end → WVP should notify / stream gone → UI clears without HQ re-INVITE storm.

4. **Do not “keep calling”**  
   - Soft Open = at most one StartPlay per open.  
   - Reopen = re-attach **same** play URL / same WVP session when possible; re-StartPlay only if WVP says stream gone.  
   - Cap + backoff already; next MOB should prefer **reuse streamId** over new invite.

**Verdict:** Prevent by **honest session state + media health**, not by more INVITEs. Reopen = last resort for viewer stall only.

---

## 2) BWC must be able to close / pause video (toilet, privacy, battery)

**Yes — required product behavior.** HQ Soft Open must not trap the wearer.

| Actor | Action | Expected |
|-------|--------|----------|
| **BWC wearer** | Stop record / end live / privacy / power button (vendor-dependent) | Media stops; HQ tile goes idle / “cam ended”; **no** auto re-invite from HQ |
| **HQ operator** | Stop on wall | BYE / WVP stopPlay; cam free |
| **Neither** | Browser tab freeze / FLV stall | Cam may still send; HQ shows reconnect or “viewer lost” — **not** force cam off |

### Design rule (lock when you APPLY later)

- **Device end = end.** Never treat BWC stop as a bug to reopen against.  
- **Viewer end ≠ device end.** Keepalive may reopen viewer; never restart cam if WVP reports stream stopped.  
- Optional later: BWC “pause live” signaling (if vendor exposes it) → HQ banner “paused by wearer” without SOS noise.

Toilet use-case = **device-controlled pause/stop**, not HQ keepalive fighting them.

---

## 3) Why pin looks sharp / good and wall looks soft / “scaled down”?

**Not** “we always auto scale down the wall for quality on purpose.” Soft Open wall and pin are **same bitstream** today (pin RAF-mirrors wall `<video>`).

| Surface | What you see | Why it feels different |
|---------|--------------|------------------------|
| **Wall** | Large tile, `object-fit: contain`, letterbox | Same low pixels stretched over a **big** rectangle → soft / blocky |
| **Pin** | Small popup; mirror canvas sized to `videoWidth×videoHeight`, CSS `width/height:100%` | Same pixels in a **small** box → looks sharper (downscale hides encode mush) |

So: pin “good” is often **display size psychology**, not a higher-res stream. Wall is not secretly a second lower stream in Soft Open path after pin-mirror MOB.

### If wall must look as crisp as pin (later named MOBs — pick one)

| Option | Meaning |
|--------|---------|
| A | Demand **higher encode** from BWC/WVP (main stream / HD) — real pixels |
| B | Wall fullscreen / focus mode uses native aspect without soft upscale mush |
| C | Separate HD Soft Open path (parked until dual soak stable) |

**Do not** “fix” by upscaling harder — that makes wall worse. Crisp wall = more source pixels or accept letterbox at native size.

Older “pin ≠ wall path” discs (Fleet JSMpeg pin vs ZLM wall) do **not** apply to Soft Open after pin-mirror-from-video — Soft Open pin is mirror of wall video.

---

## 4) SIM / dynamic IP · HQ fixed IP · cloud · multi-node — how do we not lose 2 days again?

### What burned lab time (pattern)

| Trap | Symptom |
|------|---------|
| Docker / WSL `172.x` as “server IP” | INVITE / REGISTER peer wrong (locked: never prescribe 172) |
| Browser talking to `127.0.0.1` ZLM from another PC | Dead FLV |
| Publishing LAN `192.168.x` into descriptor for WAN operators | Works in lab, fails on SIM/HQ |
| Proxy + direct + ws chain all at once | Hard to know which hop failed |
| Per-lab SQL / NAT patches | Pass once; next topology breaks |

### Target model (product architecture — paper)

```
BWC (SIM / dynamic IP)
    │  GB28181 / vendor SIP  (outbound or via APN reachable to platform)
    ▼
Edge / Platform SIP + media  (HQ fixed IP today · cloud VIP later)
    │  WVP (+ ZLM) per site or regional
    ▼
Fleet / Axiom API  (operator browser → HTTPS only)
    │  FLV/HLS via same-origin proxy or signed CDN URL
    ▼
HQ browser (fixed office · or anywhere)
```

**Hard rules for ship / multi-site**

1. **BWC never dials the operator’s laptop IP.** Cameras register to a **stable platform address** (HQ public IP / DNS / cloud LB). Dynamic SIM IP is normal on the cam side; platform is the stable end.  
2. **Browser never needs raw ZLM `:18088` on the WAN.** Lab LAN direct FLV was a **lab speed hack**. Ship path = **same-origin proxy** (or HTTPS CDN) so HQ only knows one dashboard host.  
3. **One config surface for “where is this site”**  
   - Site id → SIP host, WVP URL, ZLM internal, public play base.  
   - No hardcoded `192.168.1.38` in UI for customer packs.  
4. **Multi-node**  
   - Node A / B each run Fleet + WVP(+ZLM) or share regional WVP.  
   - Operator session sticks to a site/node; playback URLs are minted by **that** node’s broker.  
   - Shared state (devices online, SOS) later = Valkey/DB genre — not in-memory Maps across machines (already noted in hardening disc).  
5. **Cloud next**  
   - Same contract: BWC → cloud SIP/media VIP; browser → cloud Axiom HTTPS; media play still proxied/signed.  
   - Lab Docker bridge lessons stay internal; customer never configures Docker SNAT.

### What to keep vs park from today’s lab

| Keep | Park / replace for ship |
|------|-------------------------|
| Soft Open = WVP ZLM picture path | Browser→LAN ZLM direct as default |
| Stop bridge / no auto-BYE on player fail | Endless StartPlay reopen |
| Broker mints play URL | Hardcoded lab IP in client |
| Proxy fallback in chain | Treating proxy as “debug only forever” |

**Verdict:** Multi-site survival = **stable platform address + browser same-origin play + site/node config**, not more proxy experiments per incident. SIM dynamic IP is fine if cams **outbound-register** to HQ/cloud; HQ fixed IP (or cloud VIP) is the anchor.

---

## 5) Suggested genre order (no APPLY yet)

| # | Topic | Why |
|---|--------|-----|
| 1 | Soak keepalive reopen (current APPLY) | Confirm dual Soft Open >10 min |
| 2 | OSD: viewer lost vs cam ended | Stops false “call again” |
| 3 | Reopen = reuse stream, not new invite | Prevents call storm |
| 4 | Wall sharpness = encode/HD (optional) | Only after soak PASS |
| 5 | Ship play URL = same-origin only | Before SIM/HQ field trial |
| 6 | Site/node address table | Before multi-HQ / cloud |

---

## One-line answers

| Question | Answer |
|----------|--------|
| Prevent stall without endless call? | Media health + one viewer reopen budget; never re-INVITE storm; device stop wins |
| BWC toilet / pause? | Yes — device end must stop HQ picture and must **not** be auto-reopened against |
| Pin good, wall soft? | Same Soft Open pixels; wall looks worse because tile is larger — not a secret downscale stream |
| SIM / HQ / cloud / multi-node? | Stable platform SIP+media; browser HTTPS+proxy; site/node config; no lab LAN IP in ship |

---

## You decide next

Reply which to paper-lock or APPLY later, e.g.:

- `lock softopen-session-health-not-call-storm`  
- `MOB-APPLY softopen-viewer-lost-osd-v1`  
- `MOB DISC ship-play-same-origin-only` (deeper)  
- or soak first and park the rest
