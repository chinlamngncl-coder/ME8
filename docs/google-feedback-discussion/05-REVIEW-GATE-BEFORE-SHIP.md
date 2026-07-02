# 05 — Review gate before ship (Google + Claude)

> **ME8:** Run on `Enterprise Mobility\ME8`. Lock target = **`me8-v1`**. CREATE/VERIFY scripts TBD at lock MOB.

**Firmware target:** `me8-v1`  
**Predecessor:** `8wc-v2` lab seed + Phase A/B MOBs on ME8  
**Trial (unchanged):** `trial-gold-1.10.1` on `SaaS Mobility`

Run this **after** Wave 0–4 MOBs in [03-ENTERPRISE-PRE-SHIP-PLAN.md](./03-ENTERPRISE-PRE-SHIP-PLAN.md). Send completed copy to Google and Claude.

---

## 1. Baseline integrity

| Check | Command / action | Pass? | Evidence |
|-------|------------------|-------|----------|
| CREATE lock | `baseline\…\CREATE-ME8-V1.ps1` (at lock MOB) | ☐ | file count: _____ |
| VERIFY live | `.\VERIFY-ME8-V1.ps1` (at lock MOB) | ☐ | Match: ___ / ___ |
| Lab donor | `Lab-8BWC-v2` / `8wc-v2` archived | ☐ | VERIFY 8wc-v2 OK |
| RESTORE drill | Restore me8-v1 → VERIFY on clean tree | ☐ | date: |

---

## 2. Functional smoke (real BWC if available)

| Area | Test | Pass? | Notes |
|------|------|-------|-------|
| Login / Settings | Server Config full-page opens | ☐ | |
| Live wall | Start/stop one panel | ☐ | |
| Map pin | Pin live + stop/play | ☐ | |
| PTT | RX audio path | ☐ | |
| SOS | Cold SOS pin video | ☐ | |
| VC | Join + BWC ingress (if licensed) | ☐ | |
| Evidence | Dock FTP index → catalog row | ☐ | |
| Command wall | Load + poll (if used) | ☐ | |

---

## 3. Enterprise infrastructure

### 3a Redis dual-write

| Test | Pass? | Notes |
|------|-------|-------|
| Redis up — GPS update in Redis + JSON | ☐ | |
| Redis up — online flag on camera connect | ☐ | |
| **Redis stopped** — app continues; GPS on map | ☐ | |
| Restart — hydrate from Redis if available | ☐ | |

### 3b PostgreSQL — primary + degrade (see doc 07)

| Test | Pass? | Notes |
|------|-------|-------|
| Postgres up — new evidence row in PG (+ shadow SQLite synced) | ☐ | |
| Row count parity after normal ops | ☐ | PG: ___ SQLite synced: ___ |
| **Postgres stopped** (`postgres_required`) — catalog write returns 503 | ☐ | SOS/live still pass |
| **Queue mode** — WAL + replay on PG recovery | ☐ | doc 07 §4.4 |
| **Postgres HA failover** (enterprise compose) | ☐ | doc 07 §4.6 optional |

### 3c Both down

| Test | Pass? | Notes |
|------|-------|-------|
| Redis + Postgres stopped — full smoke §2 | ☐ | |

---

## 4. Stability

| Check | Pass? | Value |
|-------|-------|-------|
| `FM_USE_CACHE_DEBOUNCE=1` in ship `.env` | ☐ | |
| 24h soak — no OOM/crash | ☐ | |
| Event loop p95 < 50 ms (soak) | ☐ | |
| RSS stable ±15% after warm-up | ☐ | |
| GPS disk writes reduced vs debounce off | ☐ | |

Reference: [SCALE-READINESS-CERTIFICATE.md](../SCALE-READINESS-CERTIFICATE.md)

---

## 5. Security (enterprise minimum)

**ME8 Phase A SOP:** [ME8-SECURITY-BASELINE.md](../ME8-SECURITY-BASELINE.md) — fresh install, secrets vault, TOTP, reverify, FTP/SIP steps.

| Check | Pass? | Notes |
|-------|-------|-------|
| `VERIFY-ME8-FRESH.ps1` OK on customer server | ☐ | |
| Super admin password changed; TOTP enrolled | ☐ | |
| `storage/secrets/` encrypted + ACL | ☐ | |
| FTP not exposed on WAN (firewall / bind) | ☐ | |
| `FM_FTP_PASS` strong, not in git | ☐ | |
| Dashboard HTTPS or reverse proxy documented | ☐ | |
| No lab `storage/` shipped | ☐ | |
| No new hardcoded device IDs in hot paths | ☐ | |
| Secrets in vault — not in `server-settings.json` API | ☐ | |

---

## 6. Locked files untouched

Confirm **no unapproved edits** to:

- `public/js/ptt-rx.js`, `video-wall.js`, `fleet-ui.js`
- `lib/pttServer.js`, `lib/sipServer.js`
- `lib/psG711Audio.js`, `public/vendor/jsmpeg.min.js`

| Pass? | Notes |
|-------|-------|
| ☐ | |

---

## 7. Reviewer questions (for Google / Claude)

1. Is **dual-write + fallback** acceptable for enterprise v1, or is SQLite retirement mandatory?
2. Are degrade tests (§3c) sufficient proof of ship safety?
3. Any MOB in Wave 2–3 that should be split or reordered?
4. Fatal-error policy — sufficient or still too permissive?
5. FTP posture — acceptable for labeled “enterprise LAN deploy”?

### Google reviewer notes

```
```

### Claude reviewer notes

```
```

---

## 8. Ship decision

| Decision | ☐ Go | ☐ No-go |
|----------|------|---------|
| Enterprise pack approved | | |
| Fallback to ship v1.9 only | | |

**Blockers (if no-go):**

```
```

**Approved version string for customer pack:**

```
trial-gold-2.0-enterprise — VERIFY ___/___ — date ______
```

---

*Template version: 2026-06-27*
