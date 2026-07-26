# MOB DISC — VC BWC tiles: can we do 6? (LiveKit / MCU / license — no promise)

**Date:** 2026-07-24  
**Status:** PAPER ONLY — **no code**  
**Trigger:** You named `MOB-APPLY VC-LIVE-STAGE-RESTORE-AND-ESCAPE-V1` then asked Mob disc: **BWC tiles 6 — possible?** Look at LiveKit limits / MCU license first — **do not promise**.  
**Related:** `MOB-DISC-VC-LIVE-STAGE-RESTORE-ESCAPE-FAIL-20260724.md`

---

## This turn

| Asked | Done |
|-------|------|
| Restore APPLY | **Not applied** — you asked Mob disc on the 6-tile question first |
| Promise “yes 6 works in lab” | **No** — facts only below |

When Live stage is usable again, a **separate** cap MOB can raise 4→6 if you still want it after reading this.

---

## Short answer (honest)

| Question | Answer |
|----------|--------|
| Does **LiveKit license** block 6 BWC? | **No.** Self-hosted LiveKit server + ingress + egress are **Apache-2.0**. We already ship them in Docker. No per-stream royalty in the OSS license for “6 tiles.” |
| Does LiveKit OSS hard-code “max 4 ingress”? | **No.** OSS SFU has **no product rule** that says 4. Capacity = **your hardware + our config + our app caps**. |
| Is **6 BWC tiles** free in ME8 today? | **No.** We **self-cap at 4** in Fleet + UI. Raising is a **config/product MOB**, not a license unlock. |
| Can agent promise lab will hold 6 stable? | **No.** Not without a load prove (CPU/bandwidth/ingress). Possible on paper; **unproven** on your PC. |

---

## What we run (MCU face)

| Service | Image (pinned) | License | Role |
|---------|----------------|---------|------|
| **livekit-server** | `livekit/livekit-server:v1.8.4` | **Apache-2.0** | SFU (selective forward — not a classic hardware MCU, but our VC media brain) |
| **livekit/ingress** | `livekit/ingress:v1.8.4` | **Apache-2.0** | RTMP in → WebRTC publisher (each BWC/fixed share) |
| **livekit/egress** | `livekit/egress:v1.8.4` | **Apache-2.0** | Recording |
| **Valkey** | `valkey/valkey:8-alpine` | BSD-3 | Redis-compatible for LiveKit |

**LiveKit Cloud** (SaaS) has its own billing — **we are not on Cloud for lab.** Self-host = no Cloud minute cap. Do not confuse Cloud SKUs with OSS limits.

`.env.example` already notes: *Video conference MCU (LiveKit — open source Apache-2.0)*.

---

## Where “4” actually comes from (us, not LiveKit lawyers)

| Cap | Value | File |
|-----|-------|------|
| Server BWC+fixed ingress | **`MAX_BWC_INGRESS = 4`** | `lib/conferenceStore.js` |
| API reject over max | same 4 | `lib/conferenceModule.js` (“Maximum N camera shares per room”) |
| UI share/BWC tiles | **`MAX_SHARE_TILES = 4`** | `public/js/conference-layout.js` |
| Hub default | `maxBwcIngress \|\| 4` | `public/js/conference-hub.js` |
| Room participants | **`max_participants: 12`** | `docker/livekit.yaml` |

So today: **layout + store choose 4.** LiveKit would accept more ingress sessions if we raised our caps and the node can breathe.

**People tiles** stay **`MAX_PEOPLE = 8`** (separate from BWC content). Filmstrip **6** is people strip width — **not** the BWC ingress cap.

---

## If we raised BWC content to 6 — what must move together

| Piece | Today | For 6 BWC |
|-------|-------|-----------|
| `MAX_BWC_INGRESS` | 4 | → **6** |
| `MAX_SHARE_TILES` | 4 | → **6** (or share pool still shared with screen/doc) |
| `room.max_participants` | **12** | **Must revisit** — each ingress BWC is a **room participant**. Example: **6 BWC + 8 humans ≈ 14** → hits **12** and new joins fail. Need ≥ **6 + 8 + host slack** (e.g. **16–20**) before promising 6+8. |
| Ingress CPU | 1 container transcodes RTMP→WebRTC per session | **6 concurrent transcodes** = real lab risk on one PC |
| UDP RTC ports | `51000–51100` (~101 ports) | Usually enough for 6+8; watch under stress |
| UI Operations grid | Broken void now | Must **PASS restore** before any cap raise or 6 tiles stay invisible |

**Critical:** Raising UI to 6 without raising `max_participants` and server `MAX_BWC_INGRESS` = false hope or random join failures.

---

## License / pack / sell (customer zip)

| Concern | Fact |
|---------|------|
| Redistribute LiveKit in ship | **OK** under Apache-2.0 with notices (keep in legal / THIRD-PARTY) |
| Pay LiveKit per 6th BWC on self-host | **No** (OSS self-host) |
| LiveKit Cloud | Different product — only if customer uses Cloud API keys |
| Axiom license module | Our entitlement can still gate “VC multi-BWC” — independent of Apache |

---

## Feasibility tiers (no promise)

| Tier | Meaning |
|------|---------|
| **Legal / license** | 6 BWC **allowed** on OSS self-host |
| **Config** | 6 needs coordinated bump: store + UI + `max_participants` |
| **Lab hardware** | **Unknown** until prove: 6× WVP→RTMP→ingress + N viewers |
| **Product now** | Live stage **FAIL** (black void). Restore first at **cap 4**; prove **2 BWC visible**. Only then consider **`VC-BWC-INGRESS-CAP-6-V1`** |

---

## Recommendation (one path)

1. **Do not** put “BWC tiles 6” inside `VC-LIVE-STAGE-RESTORE-AND-ESCAPE-V1`. Restore keeps **4**; fix escape + void + toast + **2 BWC visible**.  
2. After restore **PASS**, optional paper→APPLY: **`VC-BWC-INGRESS-CAP-6-V1`** = raise store+UI+`max_participants`, then **operator load prove** (6 BWCs + several people).  
3. If prove FAIL (CPU/lag), stay at 4 or try 5 — do not ship 6 on hope.

---

## Operator next steps

1. Say **BWC6 DISC OK** (or argue: want 6 inside restore anyway — agent still recommends **no**).  
2. Clean restore when ready: **`MOB-APPLY VC-LIVE-STAGE-RESTORE-AND-ESCAPE-V1`** (no mob disc on that line).  
3. Cap-6 only after PASS + separate APPLY.
