# MOB DISC — Full few-days inventory · safe revert · then WVP/ZLM back?

**Date:** 2026-07-17  
**Status:** DISC — paper only — **no revert / no checkout / no push until you APPLY**  
**Ask:** Besides redact + FR, what else did we do these few days? Can we revert Soft Open mess, keep hard work, then put working WVP/ZLM back — without fucking it up?

---

## Short answers

| Question | Answer |
|----------|--------|
| Only redact + FR? | **No** — also WVP/ZLM Soft Open storm, Windows service pack, security log guards, ghost-pin UI, BWC companion park, baseline scripts, ZLM pack files |
| Can we revert Soft Open and keep work? | **Yes — if layered and named APPLY only** |
| Can we put working WVP/ZLM back later? | **Yes — as clean MVP on a stable base**, not by keeping tonight’s Soft Open UI patch pile |
| Auto wipe / old Firmware Gold? | **No** |

---

## Where hard work lives right now (checked)

| Layer | What | Safe? |
|-------|------|--------|
| **GitHub** `f104cfa` | Earlier FR + **WVP lab stack** (docker WVP, tiles, FLV/mpegts chase, Seeta wire docs) | On remote — good floor |
| **Local commit** `0dc4486` | **Seeta redact UI + FR keep-pile** (+ mixed `index.html` / `server.js`) | On PC only — **ahead 1, not pushed** |
| **Dirty (modified, not committed)** | Soft Open / wall / broker / WVP client storm | Can undo **file-by-file** without touching redact |
| **Untracked on disk** | Service install, WVP LAN/proxy libs, ZLM pack, companion APK proof, many docs | Still only on PC — **not in git** |

**Do not lose:** push `0dc4486` when you say so; optionally safety-commit or copy the untracked **keep** piles below before any Soft Open discard.

---

## Genre inventory (these few days)

### A — KEEP (already in `0dc4486` or must not discard)

- Seeta evidence **redact** new UI + face-follow + Seeta detect path  
- `evidence-hub.js`, face/redact libs, `detect_faces.py`, locales  
- `fr-sidecar-seeta` / `fr-sidecar-fast` **app** layer (vendor still on disk; nested git not in commit)  
- Mixed but frozen: `public/index.html`, `server.js` (redact + some WVP lab routes)

### B — KEEP (already on GitHub in `f104cfa` — early WVP/FR)

- Docker WVP + zlm-modern lab layout  
- WVP **lab tiles**, FLV token, mpegts live-chase, tile auto-reopen  
- FR Seeta sidecar wire / enroll docs (checkpoint era)  
- This is the **older working WVP lab** base — not the Soft Open wall storm

### C — Soft Open / wall storm — UNDO candidate (dirty only)

**Modified, not in safety commit:**

- `public/js/video-wall.js`  
- `public/js/live-player-factory.js`  
- `public/js/wvp-lab-tile.js`  
- `public/js/dashboard-boot.js` (Soft Open pin chrome)  
- `lib/livePlaybackBroker.js`  
- `lib/wvpLabClient.js`  
- `lib/zlmIngestLab.js` / `lib/zlmLabRelay.js`  
- `docker/wvp/*` compose + application-modern + zlm-modern tweaks  
- `scripts/START-WVP-LAB.ps1`  
- `.env.me8.example` (5062 dual-protocol note)  
- `lib/serverSettings.js` (5062)  
- `RESTART-FLEET.bat` / `kill-fleet-ports.ps1` (if Soft Open / service related)

**Untracked Soft Open/WVP APPLIED docs:** ~40+ (`MOB-APPLIED-SOFTOPEN-*`, many `WVP-*` / `ZLM-*` from the storm). Docs can stay; they don’t run. Code storm is the risk.

**This pile is what broke live / wall / SOS feel.** Revert = put these **code** files back to `0dc4486`/`f104cfa` (same for wall — safety commit did not touch wall).

### D — KEEP on disk (untracked — **not** Soft Open UI; still not in git)

| Genre | Examples |
|-------|----------|
| **WVP infra (valuable later)** | `lib/wvpDbLanPatch.js`, `wvpFleetPresence.js`, `wvpRegisterMirror.js`, `wvpSipLanMap.js`, `scripts/wvp-sip-lan-proxy.js`, `scripts/wvp-lab-post-start.js` |
| **ZLM pack** | `scripts/INSTALL-ZLM-PACK.ps1`, `docker/wvp/zlm-bundled/`, `vendor/zlmediakit/` |
| **Windows service** | `INSTALL-UBITRON-SERVICE*`, `START/STOP-UBITRON-SERVICE.bat`, `scripts/me8-ship/*`, `scripts/runtime/nssm/`, `restart-fleet-prefer-service.ps1` |
| **Security (docs + maybe code already elsewhere)** | `MOB-APPLIED-SEC-EPIPE-LOG-GUARD`, `SEC-FLEETLOG-SAFE-CONSOLE` |
| **UI small** | `public/css/app-select-guard.css`, `MOB-APPLIED-UI-GHOST-PIN-CLEANUP` |
| **Baseline scripts** | Pre-Gate-C / Failed-Live CREATE/RESTORE/VERIFY (paper + scripts — don’t run unless you say) |
| **Android** | `android/bwc-companion-f4-proof/` (parked companion) |

**These are also hard work.** Soft Open revert must **not** delete this folder tree. Prefer a second safety commit (`safety-commit-keep-ops-wvp-infra`) **before** discarding Soft Open UI files.

### E — Paper / park (docs only — low risk)

Map-pin discs, SOS banner discs, wake-up queues, Google handoff notes, companion SOS plan — mostly DISC, not live product code. Safe to leave as untracked docs.

---

## Is “revert Soft Open → then put working WVP/ZLM in” possible?

# YES — with this shape (not freestyle)

```text
1) Push / freeze KEEP first
2) Soft Open OFF (env) + test normal Fleet (SOS / live / PTT)
3) Discard Soft Open UI/code pile only (C) → back to git HEAD for those files
4) Leave D (infra/service/ZLM pack) on disk or safety-commit them
5) Later: clean MVP WVP/ZLM on stable base — reuse D + f104cfa tile/lab lessons
   — do NOT re-apply Soft Open wall patch storm
```

### What “working WVP/ZLM” means here

| Meaning | Use |
|---------|-----|
| **Chin ~5 min Soft Open wall** | Was progress — but UI stack then destroyed ops. **Do not** restore by replaying Soft Open patch MOBs |
| **f104cfa WVP lab tiles + docker** | Already on GitHub — safer “lab proof” base |
| **Untracked LAN/proxy/register mirror (D)** | Real ops fixes — keep; fold into MVP **one MOB at a time** later |

### Hard rules so we don’t fuck up

1. **No** `git reset --hard`  
2. **No** Firmware Gold / Pre-Gate-C full restore as default  
3. **No** checkout of `index.html` / `server.js` from old commits (redact lives there in `0dc4486`)  
4. **No** deleting untracked D (service / WVP infra / ZLM pack) while undoing C  
5. **One APPLY at a time**; you pass/fail between steps  
6. Soft Open UI patching stays **frozen** (already agreed)

---

## Recommended APPLY order (you choose when)

| Step | You say | What happens |
|------|---------|----------------|
| 0 | `MOB-APPLY lab-git-push-safety-fr-redact` | Push `0dc4486` to GitHub so redact/FR can’t vanish |
| 1 | `MOB-APPLY safety-commit-keep-ops-wvp-infra` | Commit D: service + WVP LAN/proxy libs + ZLM pack (not Soft Open wall) |
| 2 | Soft Open **OFF** in `.env` (you or named APPLY) | Normal Fleet feel test — SOS / live / wall / PTT |
| 3 | `MOB-APPLY git-restore-softopen-storm-files-only` | Checkout **only** list C from `HEAD` (`0dc4486`) — wall/player/broker dirty Soft Open gone |
| 4 | You test | Pass/fail normal ops |
| 5 | Later `MOB DISC` / APPLY | Clean **MVP WVP/ZLM** using D + f104cfa — not Soft Open storm replay |

If step 2 alone is enough (Soft Open OFF), we may **skip** step 3 until you ask.

---

## Honest risk note

- `0dc4486` **already** baked some WVP lab routes into `server.js` next to redact. That is OK for freeze; later MVP must be careful when editing `server.js`.  
- Dirty Soft Open in **wall/player** is the main ops killer — undoing C does **not** remove redact.  
- Dual-cam Busy/486 / signal-lost Soft Open pain ≠ “delete all WVP forever.”

---

## One line

**Besides redact/FR you also have Soft Open storm (undo), plus Windows service, WVP LAN/proxy infra, ZLM pack, security/UI/companion/baseline scripts (keep); yes we can revert Soft Open carefully then bring WVP/ZLM back as clean MVP — freeze/push keep piles first, never blind wipe.**
