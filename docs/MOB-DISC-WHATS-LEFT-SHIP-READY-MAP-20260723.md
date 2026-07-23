# MOB DISC — What’s left (ship readiness map)

**Date:** 2026-07-23  
**Status:** PAPER overview — **no APPLY** from this file  
**Operator ask:** remaining MOB + cybersecurity + TLS/AES + Tactical + ship + write-ups/translation

**Sources:** wake/tactical discs, master backlog, third-party security handoff, remaining queue, UI consolidation PASS.

---

## One-screen truth

| Track | State | Ship blocker? |
|-------|--------|---------------|
| **A — Live video / WVP Fleet** | Core wall/CW/FR/popout/listen/Call Groups/GPS/snapshot **PASS**; pin polish + VC ingress optional leftovers | Lab mostly OK; pin/VC if still FAIL |
| **B — Security / vulns** | Google **S0–S3** + lab creds/image pin + deps + Valkey legal **APPLIED** | Pack: strong `.env` secrets + TOTP off |
| **C — TLS / HTTPS / WSS** | Still **HTTP lab** (`:3988`); no reverse-proxy TLS genre APPLIED | **Yes** for multi-PC / WAN / browser mic |
| **D — Tactical Zone** | Google design **locked on paper**; **not built** | After B + open lab leftovers |
| **E — UI design system** | Consolidation + rollout **PASS**; `.cursorrules` locked | Not a ship blocker |
| **F — Docs / i18n / manuals** | Locales exist; customer manuals / full write-ups incomplete | Pack-time + translation wave |

---

## 1) Lab MOB leftovers (product — one APPLY at a time)

**Updated 2026-07-23 operator PASS:** Redact · Pin/VC · Server Config → **closed**.  
**Live detail:** `docs/MOB-DISC-LAB-FR-LEFTOVERS-THEN-SECURITY-20260723.md`

| Priority | Item | Notes |
|----------|------|--------|
| **L1** | FR roster strange icons | Mojibake pin `ðŸ“Œ` → `FR-ROSTER-PIN-ICON-ENCODING-V1` |
| **L2** | FR not snapshotting / not matching | `FR-LIVE-DEAD-DIAGNOSE-V1` then fix MOB from proof |
| **L3** | More frames when face moves | After L2 PASS → `FR-MOTION-FRAME-COVERAGE-V1` |
| After L* | **Cybersecurity genre** | S0 → lab creds; agent reminds once when lab FR stage closes |

**Already PASS — do not reopen:** Redact finish, Pin/VC, Server Config, Call Groups, GPS pin, Snapshot once, Centre, wall listen, PTT mesh, UI consolidation + rollout.

---

## 2) Cybersecurity / patches / vulnerability

### Done (claim — re-verify at pack)

- `npm audit` genre / dependency overrides  
- S1 uncaught → exit  
- S2 SIP crypto random (+ live modules v2)  
- S3 login rate LRU  
- Ship `run.js` security parity  
- Valkey legal pin (no Redis SSPL in active compose)  
- DeviceControl no retransmit storm  

### Still open before customer ship

| # | Item | Why |
|---|------|-----|
| **Lab secrets** | `LAB-DEFAULT-CREDS-AND-IMAGE-PIN-V1` | **APPLIED** — env-driven LiveKit/WVP secrets + ingress `v1.8.4`; set strong values before customer expose |
| Optional | `SEC-NONSIP-ID-CRYPTO-RANDOM-V1` | **APPLIED** — crypto IDs for fixed cams / shares / multer / CW owner |
| Pack only | `FM_TOTP_SUSPENDED` **off** | Bench may leave 2FA suspended — never ship with it on |
| Review | Firewall / expose checklist for ZLM/WVP ports | Site IT |

**S0–S3 Google four-pack:** S0 APPLIED (`MOB-APPLIED-SEC-EVIDENCE-UPLOAD-SAFE-NAME-V1-20260723.md`); S1–S3 APPLIED earlier.

Handoff detail: `docs/MOB-DISC-THIRD-PARTY-SECURITY-HARDENING-HANDOFF-20260722.md`

---

## 3) TLS / HTTPS / WSS (Track C — not AES vault)

| Need | Today | Ship need |
|------|--------|-----------|
| Dashboard | HTTP `:3988` | HTTPS on real LAN/domain |
| Browser mic | OK localhost; flaky on `http://192.168.x.x` | Secure context |
| Video/audio sockets | Often `ws://` | `wss://` or same-origin |
| ZLM FLV | Direct LAN ports in lab | Same-origin proxy for WAN |

**Planned MOB areas (names when you APPLY):**  
`DASHBOARD-HTTPS-LAN-V1` → `WSS-VIDEO-AUDIO-SOCKETS-V1` → `SAME-ORIGIN-MEDIA-PROXY-V1` → `TRUST-PROXY-AND-HOST-V1`

**AES** in our backlog = mainly **Tactical Module 4** evidentiary export crypto (zip + custody), **not** the same as HTTPS. HTTPS first for ship LAN; AES export with Tactical later.

---

## 4) Tactical Zone (Google — after security)

Locked architecture: `MOB-DISC-TACTICAL-ZONE-EVIDENTIARY-ENGINE-AFTER-VIDEO-VULN-20260721.md`

| Module | Job |
|--------|-----|
| 1 Smart Perimeters | Separate Tactical map + Turf entry/exit → WVP live + PTT gtid 49 |
| 2 Zone Archiver | Vault + event ledger |
| 3 AAR / Timeline | Playback + trim (`-c copy`) |
| 4 Evidentiary export | PIN + AES zip + SHA-256 custody PDF |

**Start only after** open lab leftovers you care about + vuln/creds genre. First APPLY you name (e.g. tab shell) — do not invent a different product.

---

## 5) Shipping readiness (pack moment)

When you say **ship / pack / customer pack**:

1. Pre-ship gate checklist (Node 22+, multer, root bats, signed license, factory hint gate, desk smoke)  
2. Security: **S0 PASS** + prefer all B items; TOTP suspended **off**  
3. Prefer TLS genre PASS for multi-PC customer  
4. VERIFY scripts + handover docs (`ME8-SECURITY-BASELINE`, smoke checklist)  
5. Zip only a complete folder — never half-pack  

**Not** a daily nag — only at pack time.

---

## 6) Write-ups / translation / manuals

| Work | State |
|------|--------|
| In-app i18n locales (`en`, `zh`, `ko`, `th`, `id`, `fil`) | Present — keep in sync when UI strings change |
| In-app “teaching essays” | Shortened (ops); Server Config wave optional |
| Customer **Installation / Migration / User manuals** | Still needed for ship pack (factory password lives in guides + gated login hint — not always-on UI) |
| Security / IT handover write-ups | Baseline docs exist; TLS runbook + site firewall write-up still to finish with Track C |
| Legal notices | Updated for pg/Valkey — re-check at pack |
| MOB APPLIED paper trail | Large — fine for lab; customer pack needs **short** operator-facing set |

---

## Recommended next path (single sequence)

```
1) Redact finish loop (if still hurting)     OR   FR Verify ops check
2) Security morning: S0 → lab creds/image pin
3) TLS/HTTPS/WSS genre (C1→C4)
4) Pre-ship gate + manuals/i18n pass
5) Tactical Zone modules 1→4 (named APPLYs)
```

**Next APPLY you should name when ready:**  
either **`REDACT-FINISH-LOOP-HANDOFF-V1`** (ops pain) or **`mob-sec-evidence-upload-safe-name`** (ship security gate).

Agent will not start Tactical or HTTPS until you APPLY that genre by name.
