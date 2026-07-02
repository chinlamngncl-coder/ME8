# ME8 post-restore checklist — test then confirm MOB

**Tree:** `C:\Users\user\Desktop\Enterprise Mobility\ME8`  
**Donor ops lock:** `Lab-8BWC-v2` → `baseline/2026-06-30-8wc-v2/` (`8wc-v2`)  
**MOB:** `mob-me8-restore-8wc-v2-ops` — **applied 2026-07-02**. Run sections below to confirm re-MOBs.

Use this **after** Lane 2 restore. Run each test once on real BWCs at `:3988`.  
**Pass** = keep v2 behaviour, **no MOB**. **Fail** = note MOB ID and say `MOB-APPLY <id>`.

---

## 0. Pre-flight (every session)

| # | Step | Pass? | Notes |
|---|------|-------|-------|
| 0.1 | `.\RESTART-FLEET.bat` in ME8 | ☐ | |
| 0.2 | Hard refresh dashboard `Ctrl+Shift+R` | ☐ | |
| 0.3 | Wait until map loads + fleet list populates | ☐ | Do not SOS in first ~10s until this passes |
| 0.4 | Login + Settings → Server Config opens | ☐ | Enterprise shell still works |

**Tester / date:** _______________

---

## 1. Baseline ops (should work from 8wc-v2 — no extra MOB)

| # | Test | Pass? | If fail |
|---|------|-------|---------|
| 1.1 | Wall Play on one BWC — video in slot | ☐ | Stop — ops restore incomplete |
| 1.2 | Second BWC on another slot — both play | ☐ | |
| 1.3 | Stop one wall slot — other slot keeps playing | ☐ | |
| 1.4 | Map pin Play → live in popup | ☐ | |
| 1.5 | Pin Stop — wall unaffected if still live | ☐ | |
| 1.6 | PTT RX — hear BWC / group | ☐ | |
| 1.7 | Fleet row hold PTT — talk path works | ☐ | |
| 1.8 | SOS — alarm appears (after 0.3 ready) | ☐ | |
| 1.9 | SOS — video on wall and/or pin | ☐ | Note time-to-video; do not MOB yet |
| 1.10 | SOS ack with helpers → PTT team forms | ☐ | v2 design |
| 1.11 | HQ hold PTT during SOS → talks to team | ☐ | v2 design |
| 1.12 | **End response team** in PTT groups | ☐ | v2 design |

---

## 2. Candidate re-MOBs — test → confirm need

Only apply if the matching test **fails** and you want the new behaviour.

### A. `mob-me8-sos-ptt-auto-restore-on-ack`

**v2 behaviour:** After ack + dismiss, SOS PTT **team stays** (`keepPttTeam`) if server pushed helpers.  
**ME8 delta:** After ack, clear SOS team + `ptt-restore-always-on` (1:1), unless dispatch group PTT active.

| # | Test | Pass = keep v2 | Fail = need MOB |
|---|------|----------------|-----------------|
| A.1 | Ack SOS with helpers checked → dismiss banner | Team PTT **stays** — you want that | Team **stays** but you want **1:1 restore** instead |
| A.2 | After ack dismiss, hold fleet PTT | Talks to **group** | You need **1:1** to last selected BWC |
| A.3 | Active **dispatch group** PTT, then SOS ack | ☐ N/A or dispatch unchanged | Dispatch group broken by restore |

**Decision:** ☐ Skip MOB (v2 OK) · ☐ `MOB-APPLY mob-me8-sos-ptt-auto-restore-on-ack`

---

### B. `mob-me8-pin-dismiss-hold`

**v2 behaviour:** User closes pin popup → GPS/SOS refresh can **re-open** popup.  
**ME8 delta:** `mapPinPopupSuppressed` set on user `popupclose`; cleared only on explicit open.

| # | Test | Pass = keep v2 | Fail = need MOB |
|---|------|----------------|-----------------|
| B.1 | Open pin popup, play video, **close popup** (X) | ☐ | Popup **re-opens** within ~30s (GPS/SOS tick) |
| B.2 | Same with wall still live on that cam | ☐ | Popup pops back while you wanted it closed |

**Decision:** ☐ Skip MOB · ☐ `MOB-APPLY mob-me8-pin-dismiss-hold`

---

### C. `mob-me8-fleet-ptt-cold-bind`

**v2 behaviour:** Fleet row PTT may need hold/wake on cold dashboard.  
**ME8 delta:** Tap-to-wake / cold bind in `video-wall.js`.

| # | Test | Pass = keep v2 | Fail = need MOB |
|---|------|----------------|-----------------|
| C.1 | Fresh refresh → wait for ready (0.3) → **first** fleet row PTT hold | Works first try | **Dead** first click/hold; works second time |
| C.2 | Repeat after `RESTART-FLEET.bat` only (no browser refresh) | ☐ | |

**Decision:** ☐ Skip MOB · ☐ `MOB-APPLY mob-me8-fleet-ptt-cold-bind`

---

### D. `mob-me8-sos-pin-no-stack` *(was discussed, never applied)*

**Issue:** Multiple pin popups stack when SOS + nearby pins open together.

| # | Test | Pass = no problem | Fail = need MOB |
|---|------|-------------------|-----------------|
| D.1 | SOS with multiple units nearby | Single SOS pin OK | **Stacked** popups / wrong pin on top |

**Decision:** ☐ Skip · ☐ `MOB-APPLY mob-me8-sos-pin-no-stack` (define when scheduled)

---

## 3. Explicitly do NOT re-apply (today’s noise)

| MOB | Why skip |
|-----|----------|
| `mob-me8-sos-video-priority` | No measurable win; ~7s unchanged |
| `mob-me8-ops-first-boot` / boot reorder chain | Broke load order / settings races |
| `mob-me8-perf-trial-parity` / defer-all boot | Superseded by restore |
| `mob-me8-ops-boot-fast` / `ops-admin-lazy` | Partial or reverted |
| Server `FM_SOS_COLD_PULL_MS=0` only | Client order MOB failed; reset to v2 **850** default on restore unless env says otherwise |

---

## 4. Enterprise layer — must still work (not in v2 lock)

| # | Test | Pass? | Notes |
|---|------|-------|-------|
| 4.1 | Forced password change / policy | ☐ | |
| 4.2 | TOTP login (super admin) | ☐ | |
| 4.3 | Server config save → reverify prompt | ☐ | 5 min token |
| 4.4 | Secrets not in API responses | ☐ | |
| 4.5 | Tech diagnostics PIN gate | ☐ | |
| 4.6 | Evidence / settings tabs open | ☐ | |

If any fail after ops restore → **enterprise MOB**, not ops boot MOB.

---

## 5. Restore command (when you say MOB-APPLY)

```powershell
cd "C:\Users\user\Desktop\Enterprise Mobility\ME8"
# mob-me8-restore-8wc-v2-ops — copies ops from 8wc-v2 lock, keeps ME8 enterprise server/libs
.\RESTART-FLEET.bat
```

Then run sections **0 → 1 → 2 → 4** in order. One section at a time.

---

## 6. Decision log

| Date | Tester | Restore done? | A PTT ack | B Pin dismiss | C Cold PTT | D Pin stack | Notes |
|------|--------|---------------|-----------|---------------|------------|-------------|-------|
| | | ☐ | ☐ skip / ☐ MOB | ☐ skip / ☐ MOB | ☐ skip / ☐ MOB | ☐ skip / ☐ MOB | |

---

## 7. Lock after sign-off

When sections 0–1 pass and section 2 decisions are recorded:

1. You run `CREATE-ME8-OPS-LOCK` (same pattern as `CREATE-8WC-V2.ps1`) — **not AI**
2. Update `BASELINE-ME8-V1.md` with date + file count
3. **Freeze** ops files until next explicit MOB
