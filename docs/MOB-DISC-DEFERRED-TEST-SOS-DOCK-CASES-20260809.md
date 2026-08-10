# MOB DISC — Deferred test session (SOS dual + dock + Cases queue) (2026-08-09)

**Status:** Locked — **updated 2026-08-09 afternoon**.  
**Split:** Part 1 SOS Record = testing now. Part 2 dock = **DELAYED** (no docking station).  
**See:** `MOB-DISC-LAB-TEST-SOS-PART1-DOCK-DELAY-20260809.md`.  
**Agent:** Do **not** nag for dock Part 2. Soft PTT/group = done (separate disc).

---

## 1. Why defer

- Path B + dock watch just landed; full PASS needs live BWC + dock/FTP drop.  
- Ops Cases UI + Weapon migrate + SOS match-back still open — better **one** test block after more APPLY completes.  
- Operator is non-tech: agent owns checklist; user only restart / press SOS / dock / PASS-FAIL.

---

## 2. Already APPLIED (must re-test in session)

| APPLY | What to prove |
|-------|----------------|
| `SOS-DEVICE-RECORD-ON-ALARM-V1` | Reachable BWC + SOS → local Record starts; log `device control sent` `Record` `udp_once` + ledger `deviceRecordCmdOk` |
| `DOCK-FTP-AUTO-INGEST-WATCH-V1` | File appears under FTP root (prefer `…/{20-digit-camId}/….mp4`) → Evidence admit + `deviceId` in log `dock FTP auto-ingest` |
| `SOS-DOCK-MATCHBACK-V1` | After admit with matching cam + time window → SOS gets `deviceRecordingEvidenceId`; log `SOS dock matchback linked` |
| `SOS-DUAL-MEDIA-UI-V1` | SOS detail shows HQ + Ground cards (missing either OK); ledger hints HQ/ground |

**Not yet applied (do before or during genre before session):**

| APPLY | Role in test |
|-------|----------------|
| `SOS-DOCK-MATCHBACK-V1` | Dock file links to that SOS |
| `SOS-DUAL-MEDIA-UI-V1` | SOS shows HQ + Ground |
| `OPS-CASE-SERVER-STORE-V1` → `OPS-CASE-UI-DESK-V1` → Weapon/FR/ANPR/SOS wire | Evidence → Cases office |
| Weapon Colab BOTH + `WEAPON-B-NEGATIVES-RELOAD-V1` | When GPU free (separate from SOS dock day if needed) |

---

## 3. Test session checklist (when you say go)

### A. SOS Path B (ground Record)

1. Restart Fleet.  
2. BWC registered / SIP reachable.  
3. Press **SOS**.  
4. Confirm camera **starts local recording** (device LED / record state).  
5. Agent checks log: `SOS device Record commanded` + `mode:"udp_once"`.  
6. PASS if Record commanded when contact exists; FAIL only if contact exists but no Record / camera never records.

### B. Dock auto ingest

1. Place (or copy) a media file into configured FTP root under that cam’s folder.  
2. Wait ~30–60s (watch poll + size-stable).  
3. Evidence catalog shows new file with **deviceId**.  
4. PASS if auto; FAIL if only manual “Scan catalog” works.

### C. Match-back + dual UI (only if those APPLYs done by then)

1. After SOS earlier same day, dock/upload clip for that cam.  
2. Open SOS incident → Ground clip linked.  
3. Cases desk (if live) shows same link — toast still alarm-only.

### D. Weapon (if Colab reload done)

1. Reload weights APPLY done.  
2. Smoke live / known FP scene — separate PASS from SOS.

---

## 4. Build before test day (agent order when you APPLY)

1. `SOS-DOCK-MATCHBACK-V1`  
2. `SOS-DUAL-MEDIA-UI-V1`  
3. `OPS-CASE-SERVER-STORE-V1` → UI desk → migrate wires  
4. Weapon B reload when GPU allows  

One APPLY at a time. No phone-call dock story. No toast-as-office.

---

## 5. How you start the session later

Say either:

- `test session now`  
- or `MOB-APPLY lab-test-sos-dock-cases-v1` (smoke only — no new features)

Agent then prints this checklist short form and walks PASS/FAIL with you.

---

## 6. Reminder rule

- **Tonight / ordinary MOB work:** no “did you press SOS?” nag.  
- **~2026-08-12 or when you ask:** agent opens with: “Deferred SOS+dock(+Cases) test session — ready?” + checklist §3.
