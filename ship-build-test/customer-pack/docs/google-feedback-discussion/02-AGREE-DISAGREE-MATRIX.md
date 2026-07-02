# 02 — Agree / disagree matrix (Mobility vs Google)

Use this table in your Google discussion. **Mobility position:** accept the diagnosis; **disagree on big-bang timing** unless scoped as **Enterprise Pre-Ship Pack** below.

---

## Stability

| # | Google | Mobility | Pre-ship? |
|---|--------|----------|-----------|
| S1 | Swallowing fatal errors is dangerous | **Agree** — process can run with corrupt SIP/ffmpeg state | **Yes** — narrow policy + supervisor docs |
| S2 | Sync FS on GPS blocks event loop | **Agree** — when debounce off, every fix writes disk | **Yes** — enable debounce + async write MOB |
| S3 | Remove all sync FS everywhere | **Partial** — admin paths (settings JSON) are cold; hot path first | **Hot path only** before ship |
| S4 | Kill process on any uncaughtException | **Disagree alone** — needs NSSM/systemd restart policy | **Pair** fatal policy with supervisor |
| S5 | Split API vs media now | **Agree direction** — **disagree before ship** | **After** dual-write soak (Phase D) |

---

## Scalability / state

| # | Google | Mobility | Pre-ship? |
|---|--------|----------|-----------|
| C1 | Externalize ephemeral state to Redis | **Agree** | **Yes** — dual-write + feature flag |
| C2 | Move catalog to PostgreSQL | **Agree** for enterprise SKU | **Yes** — adapter + dual-write; SQLite fallback |
| C3 | Horizontal scale behind HTTP LB | **Partial** — dashboard API only | **Prepare** Redis adapter; **not** multi-pod cutover day one |
| C4 | SIP/RTP through same LB | **Disagree** — needs NLB / dedicated media IP | **Document** — not implement pre-ship |
| C5 | One shared SIP pool multi-tenant | **Disagree** for v1 enterprise | **Out of scope** — site node per customer |
| C6 | Redis solves 8 BWC live wall | **Disagree** | **Parked** — separate 8 BWC firmware |

---

## Security

| # | Google | Mobility | Pre-ship? |
|---|--------|----------|-----------|
| X1 | Replace FTP with SFTP | **Disagree as drop-in** — BWC PDF uses FTP:21 | **Mitigate:** LAN bind, firewall, strong `.env` creds |
| X2 | Evidence → S3-compatible object storage | **Agree** for enterprise archive path | **Optional MOB** — MinIO/S3 path behind flag |
| X3 | Hardcoded `HQ_CAM_ID` | **Agree hygiene** — **disagree severity** | **Low** — move to `FM_IGNORE_CAM_IDS` |
| X4 | Secrets in vault | **Agree** for cloud; on-prem = `.env` + file ACL | **Ship kit:** `.env.example` + deployment manual |
| X5 | TLS on dashboard | **Agree** | **Yes** — existing HTTPS plan / reverse proxy doc |

---

## Summary for Google (one slide)

**We agree:** fatal-error risk, hot-path sync I/O, in-process state limits scale, FTP exposure on WAN, eventual Redis + Postgres.

**We disagree:** (1) full monolith migration + LB + cutover in one release; (2) SFTP replacing BWC FTP without device support; (3) deferring Redis/Postgres entirely — **we will dual-write before ship** instead.

**Compromise:** **Enterprise Pre-Ship Pack** — wired Redis/Postgres with **fallback to v1.9 behaviour**, stability soak, new firmware `trial-gold-2.0-enterprise`, then external review gate.
