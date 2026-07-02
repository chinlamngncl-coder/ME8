# ME8 smoke checklist — Phase A exit

**Tree:** `C:\Users\user\Desktop\Enterprise Mobility\ME8`  
**Dashboard:** `http://<HOST>:3988` (ME8 — trial ship uses `:3888`)  
**MOB:** `mob-me8-smoke-checklist`

Complete this on **real BWCs** before Phase B (`mob-env-enterprise` and later). Paste results to your assistant or tick locally.

---

## 0. Pre-flight

| # | Step | Pass? | Notes |
|---|------|-------|-------|
| 0.1 | Trial Fleet **stopped** (`SaaS Mobility`) — SIP 5060 / FTP 21 free | ☐ | |
| 0.2 | `cd "C:\Users\user\Desktop\Enterprise Mobility\ME8"` → `.\RESTART-FLEET.bat` | ☐ | |
| 0.3 | Browser hard refresh **Ctrl+Shift+R** on `:3988` | ☐ | |
| 0.4 | Login works | ☐ | |
| 0.5 | Settings → **Server Config** full page opens | ☐ | |

**Tester / date:** _______________  
**HOST used:** _______________

---

## 1. Live wall (8 BWC)

| # | Test | Pass? | Notes |
|---|------|-------|-------|
| 1.1 | Ops live wall shows **8** panel slots | ☐ | |
| 1.2 | Start live on **one** BWC — video in one slot | ☐ | camId: |
| 1.3 | Start **second** BWC on another slot — both play | ☐ | |
| 1.4 | **Wall slot isolation:** stop one slot — other slot(s) keep playing | ☐ | |
| 1.5 | Empty slot **does not** clone last `activeCamId` when you play a new cam | ☐ | |
| 1.6 | At cap (8 live), 9th invite queues or warns (no silent fail) | ☐ | optional |

---

## 2. Map pin

| # | Test | Pass? | Notes |
|---|------|-------|-------|
| 2.1 | Map loads (offline or online basemap) | ☐ | |
| 2.2 | Pin **Play** → live video in pin pop-out | ☐ | |
| 2.3 | Pin **Stop** — video stops; wall unaffected if still running there | ☐ | |
| 2.4 | GPS updates on map after BWC move | ☐ | optional |

---

## 3. PTT (receive / talk)

| # | Test | Pass? | Notes |
|---|------|-------|-------|
| 3.1 | PTT **RX** — hear audio from BWC or group | ☐ | |
| 3.2 | HQ **hold PTT** — talk path works (1:1 or group per config) | ☐ | |

---

## 4. SOS — cold alarm + video

| # | Test | Pass? | Notes |
|---|------|-------|-------|
| 4.1 | **Cold SOS** on test BWC — alarm banner + map pin | ☐ | camId: |
| 4.2 | Pin pop-out / live video on **alarm cam** | ☐ | |
| 4.3 | Acknowledge with **helpers checked** | ☐ | |
| 4.4 | Server pushes **PTT team** — team indicator ON | ☐ | |
| 4.5 | HQ **hold PTT** — **full SOS response team** hears (not 1:1 only) | ☐ | |
| 4.6 | Dismiss banner — **PTT team stays** active | ☐ | |
| 4.7 | PTT groups: **SOS response team** + **End response team** visible | ☐ | |
| 4.8 | **End response team** — PTT returns to normal | ☐ | |
| 4.9 | Stop live on SOS cam when done | ☐ | |

---

## 5. Geofence (if fences configured)

| # | Test | Pass? | Notes |
|---|------|-------|-------|
| 5.1 | BWC **outside** fence → pin shows **OUT** (orange pulse) | ☐ | |
| 5.2 | Re-enter fence → OUT clears | ☐ | optional |

---

## 6. Video conference (optional — if LiveKit running)

| # | Test | Pass? | Notes |
|---|------|-------|-------|
| 6.1 | `scripts/START-LIVEKIT.ps1` or install bat — LiveKit up | ☐ | skip if N/A |
| 6.2 | VC join from dashboard | ☐ | |
| 6.3 | BWC ingress to conference (if licensed / configured) | ☐ | |

---

## 7. Evidence / FTP (optional)

| # | Test | Pass? | Notes |
|---|------|-------|-------|
| 7.1 | BWC uploads clip via FTP — dock indexes | ☐ | |
| 7.2 | Evidence row visible in UI | ☐ | |

---

## 8. Command wall (if used)

| # | Test | Pass? | Notes |
|---|------|-------|-------|
| 8.1 | Command wall loads and polls | ☐ | skip if N/A |

---

## Sign-off

| Result | |
|--------|---|
| **All required (0–4) PASS** | ☐ |
| **Blockers** (list MOB/fix before Phase B): | |
| **Signed off by:** | _______________ |
| **Date:** | _______________ |

**Required for Phase A exit:** sections **0, 1, 2, 3, 4** all pass.  
**Optional:** 5–8 — note skip reason.

When signed off, next MOB: **`mob-env-enterprise`** (after [ME8-COMPOSE-LAYOUT.md](./ME8-COMPOSE-LAYOUT.md) compose smoke).

---

## Quick paste template

```text
ME8-SMOKE
0: ok / fail —
1: ok / fail —
2: ok / fail —
3: ok / fail —
4: ok / fail —
5: skip / ok / fail —
Blockers:
```
