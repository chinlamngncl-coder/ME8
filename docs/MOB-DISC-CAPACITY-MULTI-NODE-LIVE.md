# MOB DISC — Capacity · multi-node live · many operators × 8 tiles

**Status:** DISC locked 2026-07-13 — **no APPLY** (architecture / license / sales SOP)  
**Trigger:** “8 distinct cams site-wide — if 50 users each open their own 8 BWCs, how do we support it? Bigger servers + multi-node CPU/GPU — can our software do what big Chinese vendors do?”  
**Search:** capacity, multi-node, concurrent live, 50 users, fan-out, federation, live budget, load balance  
**Related:** `MOB-DISC-LIVE-ONE-CAM-MULTI-USER.md`, `ME8-EIGHT-BWC-RULES.md`, `MOB-DISC-VMS-DEPLOY-HIERARCHY.md`, `MOB-DISC-FR-6TILE-MULTI-ADMIN.md`, ZLM discs (media edge — later genre)

---

## Verdict (one page)

| Question | Answer |
|----------|--------|
| Can 50 users watch the **same** 8 busy cams? | **Yes today** — one ingest per cam, **fan-out** to all viewers |
| Can 50 users each have **8 exclusive different** cams (≤400 distinct lives)? | **Not on one ME8 pool** — needs **multi-node + live budgets** |
| Does bigger CPU/GPU alone fix 400? | **Partway** (raise distinct cap on one box) — not forever |
| Can software reach Chinese-vendor scale? | **Yes**, by phases: share → raise → media edge → multi-node — **not** by cloning today’s lab FFmpeg pool × 50 |
| What big vendors actually do | **1 cam → 1 ingest → many viewers**; record/register near edge; stream **on demand**; size WAN for **views**, not all BWCs |

**Locked product rule:**  
**“8 per user” = up to 8 tiles on that desk**, not **8 exclusive pool slots** per login. Same BWC opened by two users counts **1** toward the site live budget.

---

## What we have today (code truth)

### Three different meters (do not collapse them)

| Meter | What it counts | Today |
|-------|----------------|-------|
| **A — Devices** | Registered BWCs | License `maxBwcDevices` |
| **B — Users** | Named dashboard accounts | License `maxDashboardUsers` (env fallback e.g. 500); **super admins** separate (`FM_MAX_SUPER_ADMINS`, default **5**) |
| **C — Concurrent distinct live** | Different cams with an active pool session | `FM_MAX_CONCURRENT_LIVE` / product SOP **8** site-wide |

**BWC count ≠ live streams.** Hundreds online + GPS/SIP is cheap; **decode / INVITE / FFmpeg** is scarce.

### Live model (already vendor-shaped)

```
BWC ──one SIP/RTP──► liveStreamPool (one FFmpeg per camId)
                          │
                          ├── fan-out ► User 1
                          ├── fan-out ► User 2
                          └── fan-out ► User N
```

| Ask | Today |
|-----|--------|
| Same cam, many logins | **Supported** (`liveViewers` ref-count; stop when last viewer drops) |
| Many **different** cams at once | Cap = **site** `DASHBOARD_MAX_LIVE` (default **8**), shared by **all** operators |
| Extra logins unlock more cams | **No** — more viewers of existing lives only |

Detail: `MOB-DISC-LIVE-ONE-CAM-MULTI-USER.md`, `ME8-EIGHT-BWC-RULES.md`.

### Hierarchy (permissions — already partial)

| Desk | ME8 mapping |
|------|-------------|
| All stations | Super admin **or** operator with **See all dispatch groups** |
| Station / team | Operator + **assigned dispatch groups** only |

Do **not** invent a deep org-tree DB for capacity v1. Groups + scope already exist (`MOB-DISC-VMS-DEPLOY-HIERARCHY.md`). Live budget is a **separate** control from “who sees which pins.”

---

## The scary math

| Idea | Number | Reality |
|------|--------|---------|
| 50 users × 8 **different** cams each | up to **400** distinct | **Not** 400 SIP/FFmpeg on one ME8 node |
| 50 users × same **8** incident cams | 50 × 8 players | **1×8** pool sessions + fan-out — **yes** |
| Chinese vendor brochure “50 walls” | Sounds like 400 | Usually **shared ingest + edge media + site shards** |

---

## How enterprise / Chinese-class stacks scale (SOP we copy)

Same industry pattern as Milestone / Genetec-class VMS and large BWC platforms:

1. **Ingest ≠ viewer** — BWC talks to a **media/edge** service; browsers do not each open a private SIP pipeline.  
2. **Distinct live** sized by **edge + WAN + GPU**, not by login count.  
3. **Hierarchy** — Station A’s lives stay on Station A’s node; centre pulls **on demand**.  
4. **Federation** — many small complete sites, thin centre; **do not** backhaul every BWC always.  
5. **License language** — devices + named users + **concurrent live / wall seats** (three SKUs).

Golden rule: **register/presence local; stream only what an operator opens.**

---

## Target architecture (phased)

```
                    ┌─ Node A (station / region) — live budget e.g. 32
  BWCs ──SIP/GB──►  ├─ Node B — live budget 32
                    └─ Node C — live budget 32
                              │
                         control plane (auth, groups, map, SOS, license)
                              │
                    Ops desks / walls  (many viewers, few distinct streams)
```

| Phase | Capability | Distinct live (order of) | Software note |
|-------|------------|---------------------------|---------------|
| **P0 — now** | One pool, share cam, cap **8** | Lab / small TOC | ME8 SOP |
| **P1** | Same design, bigger box, raise `FM_MAX_CONCURRENT_LIVE` **after soak** | ~16–32 one site | Env + hardware proof — **named MOB**, not silent |
| **P2** | Media edge (ZLM / WVP-class) + proxy; Fleet = control plane | Tens–low hundreds **viewed**; ingest per site | Separate **genre**; ZLM latency parked until you say so |
| **P3** | Multi-node + **per-station live budget** + federation | Many desks × 8 tiles **if** streams **shared** or **sharded by site** | True “Chinese vendor” reach |

**What does not scale forever:** one Node process + one FFmpeg per cam × hundreds on one PC.

---

## Suggested license / capacity SKU language

| Entitlement | Meaning |
|-------------|---------|
| `maxBwcDevices` | Registered cameras |
| `maxDashboardUsers` | Named operators |
| `maxSuperAdmins` | Break-glass / IT (keep small, ~5) |
| `maxConcurrentLive` | Hard decode/INVITE budget **per site/node** (today 8) |
| Optional later | `maxConcurrentLivePerStation`, analytics source caps |

### Rough planning ratios (tender talk — not hard law)

| Fleet BWC | Named users (order of) | Concurrent **distinct** live (one control room / node) |
|-----------|------------------------|--------------------------------------------------------|
| ≤50 | 10–30 | **8** |
| 300 | 50–150 | 8–16 (bigger box / second wall) after soak |
| 500–1000+ | 100–500 | Still **tens of lives per node**, not hundreds — **groups + federation** |

---

## Permissions + streaming (keep simple)

| Role | Sees | Live |
|------|------|------|
| Super admin | All stations | Full — still hits **site live budget** |
| Operator + see-all | All groups | Same |
| Operator assigned | Own groups | Same budget, smaller fleet/map |
| Viewer (future seat) | Watch only | No invite / no ack — optional later |

**Auth SOP:** named accounts, MFA where required, group scope for **data**; **separate** live budget so 50 logins cannot open 50 exclusive streams.

---

## Load balance (honest)

| Approach | When |
|----------|------|
| Raise one-node cap | P1 — after CPU/SIP/LAN soak |
| Edge ingest + proxy | P2 — media plane off Fleet process |
| Multi-node live budgets | P3 — station shards; centre on-demand |
| DNS “LB” alone | **Not enough** — video state is sticky per cam |

Do **not** sell “users × 8 exclusive lives” without saying **shared pool** + **multi-node**.

---

## What we are NOT doing in this DISC

- ❌ Raising `FM_MAX_CONCURRENT_LIVE` without a named MOB + soak  
- ❌ Binding face sidecar to LAN IP “for capacity” (unrelated; keep `127.0.0.1`)  
- ❌ Claiming ME8 lab **8** is a permanent commercial ceiling **or** that one GPU box = 400 exclusive lives  
- ❌ Mixing ZLM latency experiments into this capacity plan until you name that genre  
- ❌ Deep org-tree UI before groups + live budgets work

---

## Future MOB names (parked — apply only when you say)

| MOB | Phase | Delivers |
|-----|-------|----------|
| `mob-capacity-live-budget-ui` | P1 | Show “6/8 live · N operators” so desks see the shared pool |
| `mob-capacity-raise-live-soak` | P1 | Documented raise of concurrent live + checklist |
| `mob-capacity-per-station-budget` | P3 | Live budget scoped by dispatch group / site node |
| `mob-capacity-federation-control` | P3 | Centre pulls on-demand from site nodes |
| Media edge genre | P2 | ZLM/WVP-class ingest — separate DISCs |

---

## Apply / write rules

- This file is **DISC only**. No runtime change from writing it.  
- Capacity code changes need explicit **`MOB-APPLY <name>`**.  
- Genre push for related docs: only when you say (e.g. later ops/capacity genre).

---

## Bottom line

| | |
|--|--|
| **Today** | 8 **distinct** lives site-wide; unlimited **viewers** of those lives |
| **50 × same 8** | Supported by design |
| **50 × exclusive 8** | Multi-node + budgets + edge media — **software can**, in phases |
| **Chinese vendors** | Same idea we already use (1 ingest, many viewers) — we still need **nodes + budgets** to match their scale |

**Operator one-liner:**  
Many people can watch the same cameras. Opening more **different** cameras at once needs a bigger live budget and, at city scale, more than one server — not more logins alone.
