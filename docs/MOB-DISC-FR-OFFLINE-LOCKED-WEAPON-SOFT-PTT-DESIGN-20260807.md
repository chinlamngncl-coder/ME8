# MOB DISC — Triple-check FR Offline isolation + Weapon softer alert / PTT design (2026-08-07)

**Status:** disc only. No code this turn.  
**Operator:** FR Offline must not contaminate Live (already done days ago). Weapon = softer toast (FP). Fixed cam + BWC. Design PTT / call group.

---

## 1) Apology — FR Offline

You are right. **FR Offline video = investigation.** It must **not** contaminate Live / auto Ops / wall play.

That was **already APPLIED + PASS** (2026-07-30), not “still to do”:

| Proof | Detail |
|-------|--------|
| Disc | `MOB-DISC-FR-OFFLINE-HIT-NO-OPS-JUMP-20260730.md` |
| Apply record | `MOB-DISC-FR-OFFLINE-HIT-ALERT-ONLY-V1-APPLIED.md` — **PASS** |
| Code | `fr-alarm.js` → `isOfflineVideoHit` · `goOpsOnHit` returns early if offline unless **explicit** Go to map · no `promoteFrBlacklistLive` for offline |
| Server | `lib/frOfflineVideo.js` sets `source: 'offline-video'` |
| Tab firewall | Live tab drops offline hits; Offline tab drops live hits (`showHit` hard-stop) |

**Triple-check (just read):**

1. `goOpsOnHit`: `if (offline && !opts.explicit) return;`  
2. Wall promote: `if (!offline && alertTier === 'high' …)`  
3. Standby PTT / field alert buttons hidden for offline chrome  
4. `onHit` / `showHit` refuse cross-tab Live ↔ Offline  

So: **Offline does not contaminate Live. Locked. PASS.**  
Earlier loose talk that mixed Offline with Live wake was wrong. Sorry.

**ANPR Offline:** still does **not** call `FrAlarm.onHit` (no Live toast path). Parity disc on file if file-watchlist later.

---

## 2) Live wake vs Offline (clean table)

| Source | Toast / HQ? | Auto Ops / wall? | Contaminate other tab? |
|--------|-------------|------------------|-------------------------|
| FR **Live** | Yes | Yes (high blacklist rules) | Must not enter Offline UI |
| FR **Offline video** | Yes **on Offline surface** (investigation) | **No** (unless Go to map) | Must not enter Live rail / Ops auto |
| ANPR **Live** | Yes (via FrAlarm) | Per FR live rules | Must not enter Offline |
| ANPR **Offline / FTP** | Investigation only | **No** auto Ops | Must not enter Live |
| **Weapon** Live (BWC + fixed) | Softer — see below | **No** auto Ops | Own toast only |

---

## 3) Weapon is not FR / ANPR (FP)

Weapon algorithm **mistakes easy** (bull bar, tool, TV). Fixed cams will fire **often**.

| | FR / ANPR Live | Weapon |
|--|----------------|--------|
| Trust | Higher (list match / face) | Lower until B negatives / better model |
| Wake | Strong toast + may auto Ops | **Blink + toast only** (already V1) |
| Auto map / wall steal | FR yes (high) | **Never** |
| Auto radio | FR standby = click | **Never auto on first hit** |
| Cams | Mostly BWC live | **Fixed cam + BWC** (both in watch) |

**Product feel:** Weapon = “HQ, look — maybe weapon” · not “blacklist, jump now.”

---

## 4) Weapon + PTT / call group — design (phases)

Goal: fixed or BWC hit → HQ can **call backup** without fake device SOS.

```
Weapon confirm hit (dedupe already)
        │
        ▼
Phase A (now / V1)     Orange blink + toast + queue
                       Ack · Open Weapon · Show on map
                       NO auto PTT
        │
        ▼
Phase B (next design)  Toast button: Call backup / Alert group
                       Operator click → join PTT group / standby team
        │
        ▼
Phase C (optional)     Settings: auto-invite WEAPON alert group
                       Default OFF · only after N confirms · lab gate
```

### Phase B — recommended logic (one path)

| Cam type | What “Call backup” does |
|----------|-------------------------|
| **BWC** (GPS) | Like FR standby: nearby online BWCs + hit unit → **Standby PTT team** (operator click). Reuse FR nearby geometry. **Not SOS.** |
| **Fixed cam** | No officer GPS on the camera → use **configured Weapon alert PTT group** (Settings: group id / “Weapon desk net”) OR zone roster if you already map fixed cam → zone. If no group set → toast: “Set Weapon alert group in Settings.” |

Buttons on toast (Phase B):

1. **Ack**  
2. **Open Weapon**  
3. **Show on map**  
4. **Call backup** → BWC path or fixed-cam group path above  

**Never:** remote-press device SOS · auto-blast all radios on every FP.

### Phase C — only if you order it later

- Setting: `Weapon auto alert group` ON/OFF (default **OFF**)  
- Only after confirm streak + conf floor  
- Still no SOS  

---

## 5) MOB names (aligned)

| # | MOB | Status |
|---|-----|--------|
| — | `FR-OFFLINE-HIT-ALERT-ONLY-V1` | **Done PASS** — do not re-argue |
| — | `WEAPON-ALARM-TOAST-BLINK-V1` | Applied (toast + queue, no auto PTT) |
| Next UI | `WEAPON-LIGHTBOX-POS-KEEP-V1` / tile expand | Arranged queue |
| Then | Colab B negatives | Kill fixed-cam rubbish FP |
| Then | **`WEAPON-ALARM-BACKUP-PTT-V1`** | Call backup button: BWC nearby + fixed → alert group |
| Later | `WEAPON-ALARM-AUTO-GROUP-OPT-IN-V1` | Optional auto group, default OFF |

---

## Locked statements (for later agents)

1. FR Offline = investigation; **no Live contamination**; **APPLIED PASS**.  
2. Weapon wake = softer toast/blink; **not** FR auto-Ops.  
3. Weapon cams = **fixed + BWC**.  
4. Backup radio = **operator button first**; never fake SOS; auto group only opt-in later.
