# 04 — Dialogue: Google vs Mobility (pre-ship enterprise)

**Status:** Google responses recorded **2026-06-27**.  
**Follow-up:** [07-DEGRADE-TESTS-AND-PG-RESYNC.md](./07-DEGRADE-TESTS-AND-PG-RESYNC.md) (split-brain / replay tests).

---

## Topic A — “Should Redis + Postgres be done before shipping?”

### Question for Google

> We want to ship an **enterprise** SKU, not defer Redis and Postgres to post-ship Phase B. Our plan is **dual-write with fallback** to SQLite/JSON so v1.9 behaviour survives if Redis/Postgres fails. Do you agree this is sufficient for a first enterprise release, or do you require **full cutover** (no SQLite) before ship?

### Mobility position (pre-call)

**Yes, do Redis + Postgres before ship** — but as **dual-write + fallback**, not big-bang cutover.

### Google (record here)

Implementing Redis and Postgres before the enterprise ship is the right move, but a "dual-write with fallback" strategy carries high risk for data consistency. If Postgres fails and the system falls back to SQLite, you create a "split-brain" scenario. How does the local SQLite data safely merge back into Postgres once it recovers?

For an enterprise v1, it is often safer to rely on Postgres and Redis native High-Availability (HA) configurations (e.g., replication and failover) rather than building complex application-level fallback to local files. If you proceed with dual-write fallback, the re-sync mechanism must be bulletproofed and heavily tested prior to shipping.

### Mobility response (post-call)

**Accepted.** We will **not** silently dual-write catalog to SQLite and Postgres in parallel.

**Revised plan:**

| Store | Enterprise default | Degrade |
|-------|-------------------|---------|
| **Valkey** | Primary cache | Memory + JSON; last-write-wins by `ts` (doc 07 §3) |
| **Postgres** | Primary catalog | **HA compose** preferred OR **queue + WAL replay** — not silent split-brain (doc 07 §2) |
| **SQLite** | Shadow / migrate source | Pending queue only when `FM_CATALOG_ALLOW_SQLITE_QUEUE=1` |

SOS / live / PTT **never** depend on Postgres or Valkey.

### Outcome checkbox

- [x] Google agrees Redis + Postgres **before** ship  
- [x] Google flagged split-brain — **Mobility revises Wave 3** (doc 07)  
- [ ] Google confirms queue+replay OK — ask if needed  

---

## Topic B — “Fatal error handlers — remove or keep?”

### Mobility position

**Pair** supervisor with narrowed policy. Blanket removal without restart policy **increases** outage time on single-node installs.

### Google (record here)

Your proposed approach is correct. Blanket swallowing of `uncaughtException` leads to unpredictable zombie processes. Implementing a narrow fatal policy—where you handle anticipated boundary errors (like a SIP timeout) but allow unexpected exceptions to crash the process—is the industry standard. Pairing this with a robust supervisor like systemd or NSSM ensures the service restarts cleanly and predictably with a fresh memory state.

### Mobility response

**Aligned.** Wave 1: `mob-stability-fatal-policy` + NSSM/systemd documented in enterprise install kit.

### Outcome checkbox

- [x] Agreed approach  

---

## Topic C — “FTP must become SFTP/S3 before enterprise ship”

### Mobility position

**SFTP is not a drop-in** for current BWCs. Security = **network placement + secrets** short term; **S3 archive** for evidence blobs enterprise tier.

### Google (record here)

Given the strict hardware limitations of the legacy BWC docks, binding FTP to a heavily segmented and firewalled LAN is an acceptable, pragmatic mitigation for v1. Bridging that local ingress immediately into S3/MinIO for the long-term archive is exactly what you should do. However, be prepared for friction during enterprise infosec audits; you will need to clearly document this network boundary isolation. A transition to HTTPS or FTPS for ingestion must remain a high-priority roadmap item.

### Mobility response

**Aligned.** Wave 4: `mob-ftp-bind-lan` + infosec boundary doc + `mob-archive-s3-optional`. Roadmap: FTPS/HTTPS when BWC supports.

### Outcome checkbox

- [x] WAN-segmented FTP accepted for v1  
- [x] S3 archive bridge — in enterprise pack  
- [x] FTPS/HTTPS — roadmap (not ship blocker)  

---

## Topic D — “Load balancer + horizontal scale before ship?”

### Mobility position

**No multi-instance cutover pre-ship.** Prepare Redis adapter; prove state externalized on single node.

### Google (record here)

Multi-instance horizontal scaling does not need to block the first enterprise ship, provided the state has genuinely been externalized. Delivering a single-node enterprise deployment connected to external Redis and Postgres proves your architecture is decoupled. Given the severe complexities of load balancing SIP and RTP traffic (which typically require specialized proxies like Kamailio, not standard HTTP ALBs), pushing horizontal scaling to Phase 2 is a sound engineering decision.

### Mobility response

**Aligned.** Enterprise v1 = **one Mobility node + external Valkey + Postgres**; Phase 2 = Kamailio/NLB media scale.

### Outcome checkbox

- [x] Single-node enterprise + external stores OK  
- [x] Multi-instance deferred — Phase 2  

---

## Topic E — “External review before ship (Google + Claude)”

### Google (record here)

Yes, this is an excellent and pragmatic review scope. The 24-hour soak metrics and the explicit degrade test logs (demonstrating exactly how the system behaves when Redis or Postgres goes down) are exactly the artifacts needed to validate system stability before an enterprise release.

### Mobility deliverables

1. `VERIFY-TRIAL-GOLD` → `trial-gold-2.0-enterprise` N/N  
2. [05-REVIEW-GATE-BEFORE-SHIP.md](./05-REVIEW-GATE-BEFORE-SHIP.md) completed  
3. [07-DEGRADE-TESTS-AND-PG-RESYNC.md](./07-DEGRADE-TESTS-AND-PG-RESYNC.md) — all matrices passed  
4. Diff summary Wave 0–4  
5. Degrade test log: Valkey down, Postgres down, both down, PG replay  

### Claude review (record here)

```
[ pending — run after implementation using doc 05 + 07 ]
```

### Outcome checkbox

- [x] Google agrees to review scope  

---

## Topic F — “8 BWC parked — does enterprise pack conflict?”

### Google (record here)

No objection. Keeping product concurrency limits (like handling 8 live streams) isolated in a separate branch from the core infrastructure stabilization (Redis/Postgres wiring) is solid release management. Do not mix the branches until the infrastructure baseline is proven stable.

### Mobility response

**Aligned.** Ship tree: enterprise infra only. 8 BWC: separate folder + firmware after `trial-gold-2.0-enterprise` stable.

### Outcome checkbox

- [x] No conflict — branches stay separate  

---

## Final alignment statement

**Date of call:** 2026-06-27

**Agreed scope for pre-ship enterprise:**

```
• Redis + Postgres (Valkey + PostgreSQL) BEFORE ship — confirmed
• Single-node Mobility + external Valkey + Postgres — no multi-instance LB pre-ship
• Valkey degrade: memory + JSON, newest-ts wins
• Postgres: HA compose preferred OR queue+WAL replay — NOT silent split-brain dual-write
• Narrow fatal-error policy + systemd/NSSM supervisor
• LAN-segmented FTP + S3 archive bridge + infosec documentation
• 24h soak + degrade test artifacts (doc 07) before ship
• External review gate (doc 05) — Google + Claude
• 8 BWC parked — separate branch/firmware
• OSS audit (doc 06) — Valkey, THIRD-PARTY-NOTICES, OSM attribution, FFmpeg review
```

**Explicitly deferred:**

```
• Multi-instance horizontal scale / Kamailio SIP farm (Phase 2)
• 8 concurrent live BWC product work (separate firmware)
• FTPS/HTTPS BWC ingest until device support
• Multi-tenant SaaS control plane
• Silent SQLite↔Postgres dual-primary without replay
```

**Signed off by:**

| Party | Name | Date |
|-------|------|------|
| Mobility | (vendor) | 2026-06-27 |
| Google advisor | recorded above | 2026-06-27 |
| Claude review | pending post-impl | |
