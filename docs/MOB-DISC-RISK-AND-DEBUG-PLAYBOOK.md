# MOB DISC — Risk analysis + debug playbook (pre-ship)

**Status:** DISC only — no MOB-APPLY from this doc.
**Audience:** you (operator) + agents. Not for customer pack.
**Search:** `risk`, `debug`, `broke`, `restore`, `checkpoint`, `fleet.log`

---

## Part 1 — Risk analysis of the pre-ship plan

Scale: **1 = safe** (docs / pack scripts, no runtime) → **5 = high** (historically breaks wall · PTT · SOS · VC).

| Phase / MOB | Risk | What can break | Blast radius | Rollback |
|-------------|------|----------------|--------------|----------|
| Phase 0 — ship desk (BUILD, VERIFY, license issue) | **1** | Nothing on bench — scripts write to staging folder | Zero (bench untouched) | Delete staging folder |
| Phase 1 — `mob-oss-third-party-notices-generate` | **1** | Docs only | Zero | Git revert |
| Phase 1 — `mob-oss-about-settings-link` | **2** | Settings UI only | One tab | Git revert |
| Phase 1 — **`mob-ffmpeg-lgpl-vendor-bundle`** | **4** | **Every media path**: live wall, map pins, evidence trim, redact, VC ingress, audio | Whole product video | Baseline restore + git revert; bench-test each path before PASS |
| Phase 2 — `mob-open-api-pack` | **1** | Nothing runtime (PDF/docs) | Zero | n/a |
| Phase 2 — `mob-vms-deploy-hierarchy` | **2** | Login URL if TLS/proxy misconfigured | Operator login | Revert Server Config; `:3988` direct still works |
| Phase 2 — `mob-evidence-crypto-metadata` | **3** | Evidence catalog if policy wrong | Evidence Hub | Baseline restore |
| Phase 2 — `mob-auth-audit-ship` (TOTP on) | **3** | Admin lockout if TOTP/recovery wrong | All logins | `FM_TOTP_SUSPENDED=1` bench flag; recovery email genre already applied |
| Phase 3 — `mob-vc-license-gate`, `mob-analytics-hub-shell` | **2** | Grey tab logic; wrong gate hides a paid module | One tab | Git revert |
| Phase 4 — live ops MOBs (`mob-live-sos-ptt-poc`) | **5** | Wall, pins, PTT, SOS — broken 4+ times before | Core demo | **RUN RESTORE-ME8-FIRMWARE-GOLD**; checkpoint ritual after every MOB |
| Phase 3/7 — analytics engines (Face/ANPR/Weapon) | **5** | New runtime + ingest; unknowns | New module + possibly media | Shell first; engines last; separate genre |

### Standing risks (not tied to one MOB)

| Risk | Why it matters | Mitigation (already in place) |
|------|----------------|-------------------------------|
| Internal/OEM names leak into customer zip | Contract/legal exposure | Denylist scan + VERIFY `-CustomerPack`; run every build |
| GPL `ffmpeg-static` still in `package.json` | Commercial license exposure | Phase 1.1 is the fix — **ship blocker** |
| Old 3B model reappears (copy from old tree) | License exposure | `centreLlm.js` blocks it; verify script fails on it; denylist |
| TOTP left suspended at ship | Security noncompliance | Ship checklist item in `ME8-SECURITY-BASELINE.md` |
| Baseline snapshots inside git/pack | Huge zip, internal history leak | `.gitignore` excludes `baseline/**`; pack forbids `baseline` dir |
| SOS ledger scope untested | Tender S4-6 claim unproven | Re-test checkpoint (was skipped): scoped operator sees group-only + 403 out-of-scope |
| ZLM accidentally enabled | Unstable path shipped | `FM_LAB_ZLM` off in ship profile; `test-zlm.html` stripped from pack |

**Single biggest pre-ship risk: `mob-ffmpeg-lgpl-vendor-bundle` (Phase 1.1).** It is legally required but touches every media path. Plan: apply alone, full video checkpoint after, nothing else in that turn.

---

## Part 2 — Debug playbook (when something breaks)

### Rule 0 — restore first, don't patch over

If video/PTT/SOS breaks after a MOB, we do **not** debug on top of the broken state. Order:

```
1. Hard refresh (Ctrl+Shift+R)        — fixes stale UI
2. RESTART-FLEET.bat                  — fixes stuck server state
3. RUN RESTORE-ME8-FIRMWARE-GOLD      — puts product back to known-good
4. THEN one debug MOB at a time       — agent investigates, you PASS/FAIL
```

### Who does what

| You (operator) | Agent |
|----------------|-------|
| Say exactly **what screen, what you clicked, what you saw** | Reads `storage\fleet.log`, code, APIs |
| Screenshot if possible | Forms one hypothesis, proposes **one** debug MOB |
| Run restart / restore / hard refresh when asked | Never asks you for DevTools, Docker, or `.env` edits |
| Reply CHECKPOINT PASS / FAIL | Records outcome in the relevant MOB DISC |

### What to tell the agent (copy this shape)

> **Where:** Operations wall / map pin / Evidence Hub / Centre Summary / login
> **When:** time, and what you did just before (e.g. "after Open All", "after alt-tab 5 min")
> **What you saw:** exact banner/error text, frozen frame, spinner, blank
> **Which cam / file:** nickname or ID if relevant
> **Since when:** worked before which MOB?

That last line matters most — **"worked before MOB X"** tells us whether to revert X or look elsewhere.

### Evidence the agent uses (you never need to open these)

| Source | What it shows |
|--------|----------------|
| `storage\fleet.log` (or `VIEW-LOG.bat`) | Server-side truth: SIP register, INVITE, stream start/stop, errors |
| `/api/health` | Server up, uptime |
| Engineer diagnostics (PIN) | Ports, memory, fleet online, license |
| Browser console | Agent asks only if server log is clean — via screenshot instruction, not DevTools digging by you |

### Debug decision ladder

```
Symptom
  │
  ├─ UI only (wrong label, stale count)      → hard refresh → still wrong? one UI MOB
  ├─ One cam won't stream                    → cam power/SIM/register first (device side)
  ├─ All video dead / "STOPPED BY BWC"       → restart → restore Firmware Gold → checkpoint
  ├─ Login broken (TOTP/password)            → bench flag FM_TOTP_SUSPENDED=1 (agent guides), never delete storage
  ├─ Centre Summary offline                  → model file check (vendor/llm + storage/llm) — agent verifies
  └─ After a named MOB                       → revert/restore that MOB first, ask questions second
```

### Known failure patterns (already documented — don't re-debug)

| Symptom | Known cause | Doc |
|---------|-------------|-----|
| "Stopped by BWC" while alt-tabbed | Browser backgrounded the tab; server was fine | `MOB-DISC-BWC-STOPPED-FLICKER.md` |
| Wall/pins dead after agent work | Locked-file regression | `BASELINE-ME8-FIRMWARE-GOLD.md` → restore |
| ZLM lag / minutes behind | Player buffer tweaks — **parked, do not retry** | `MOB-DISC-ZLM-NOT-READY.md` |
| Restart task "aborted" in background | `RESTART-FLEET.bat` window stays open while server runs — normal | (this doc) |

### Debug rules for agents (hard lines)

1. **One hypothesis, one MOB** — no shotgun fixes.
2. **No function edits during diagnosis** — read-only until operator approves a fix MOB.
3. Locked files (`video-wall.js`, `pttServer.js`, `sipServer.js`, `fleet-ui.js`, baselines) — **ask before touching, even to debug**.
4. After any risky fix → **CHECKPOINT REMINDER** block; wait for PASS/FAIL.
5. If two fixes fail → stop, restore baseline, re-plan in MOB DISC.
6. Never debug on a customer install — bench only; customer issues go through ship desk with a fresh pack.

---

## When you actually need debugging — say this

> **DEBUG:** [where] + [what you saw] + [since which MOB]

The agent will investigate read-only, report findings, and propose **one** MOB. You decide.
