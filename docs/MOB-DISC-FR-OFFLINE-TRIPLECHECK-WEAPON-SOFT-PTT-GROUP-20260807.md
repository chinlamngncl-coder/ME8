# MOB DISC — Triple-check FR Offline isolation + Weapon soft alert + PTT group design (2026-08-07)

**Status:** disc only. No code.  
**Operator:** FR Offline is investigation — must not contaminate Live/Ops. You already PASS’d this. Design Weapon softer than FR/ANPR; fixed cam + BWC; optional alert PTT / call group.

---

## 1) Apology — FR Offline

You are right. **FR Offline video = investigation. It must not contaminate Live / Ops.**  
That was **`FR-OFFLINE-HIT-ALERT-ONLY-V1` APPLIED + PASS (2026-07-30)** — not “maybe later.”  
Any earlier talk that blurred Offline with Live FR/ANPR wake on Ops was wrong. This disc corrects it.

---

## 2) Triple-check — what code does now

### Locked helper

`isOfflineVideoHit(hit)` in `public/js/fr-alarm.js`:

- `isLive === false` → offline  
- `source === 'offline-video'` or `'offline'` → offline  
- Server `lib/frOfflineVideo.js` sets `source: 'offline-video'`

### Gate A — no auto Ops / no wall steal (ALERT-ONLY)

In `goOpsOnHit`:

```text
if (offline && !opts.explicit) return;
```

Wall promote only if `!offline && alertTier === 'high'`.  
Field alert / Standby PTT UI hidden for offline chrome.  
**PASS record:** `docs/MOB-DISC-FR-OFFLINE-HIT-ALERT-ONLY-V1-APPLIED.md`

### Gate B — Live ↔ Offline firewall (no rail contamination)

In `showHit` / `onHit` (strict):

| You are viewing | Live hit | Offline hit |
|-----------------|----------|-------------|
| **FR Live** (or Ops / not Offline tab) | Toast / HQ / (auto Ops if blacklist rules) | **Dropped** — does not enter Live toast |
| **FR Offline** tab | **Dropped** — does not enter Offline | Toast / HQ only; **no** auto Ops |

So Offline is **investigation**: does **not** wake Ops Live wall, does **not** fill Live rail, does **not** auto-jump map. Correct product.

### ANPR

| Path | Rule |
|------|------|
| Live list hit | Same **FR toast pipeline** as Live FR (wake Ops) |
| Offline / file / FTP match | Must **not** call live `FrAlarm` dispatch; disc parity recorded; keep firewall |

Weapon / ANPR Offline must never write into each other’s Live rails.

---

## 3) Weapon is not FR / ANPR (softer)

Weapon algorithm **false-positives easily** (bull bar, TV, captions). Fixed cams will fire often. BWC too.

| | FR Live / ANPR Live | Weapon Live |
|--|---------------------|-------------|
| Trust | High (watchlist / plate list) | **Lower** (detector) |
| Wake | Strong toast + HQ; FR may auto Ops | **Soft:** blink + toast only |
| Auto Ops / wall steal | FR high blacklist yes | **Never** |
| Fake SOS | Never | Never |
| Cams | BWC (+ fixed if in watch) | **Fixed cam + BWC** both in watch |

**Already applied:** `WEAPON-ALARM-TOAST-BLINK-V1` — orange blink + toast + queue + Ack / Open Weapon / Show on map. Matches “just a toast” (milder than FR).

---

## 4) Design — Weapon hit → alert PTT / call group

### Goal

Cam (fixed or BWC) picks up weapon → HQ sees toast → HQ can **call backup** (PTT group / alert group) without faking device SOS.

### Do **not** auto-blast radio on first detect

Bull-bar FP would spam every nearby radio. Bad.

### Recommended stages

```text
Weapon confirm hit (Recent + toast)     ← now (TOAST-BLINK)
        │
        ▼
Operator reviews toast
        │
        ├── Ack / Dismiss          → clear blink
        ├── Open Weapon            → Analytics live
        ├── Show on map            → Ops pin (choice)
        └── Call backup (Phase 2)  → alert PTT / group  ← design below
```

### Phase 2 options (pick one product default)

| Option | Behavior | Risk |
|--------|----------|------|
| **R1 (recommend)** | Toast button **Call backup** → joins/pushes a **Weapon alert PTT group** (catching cam + nearby online BWCs if GPS; fixed cam → nearby BWCs only). Operator must click. | Low — human gate |
| R2 | Auto-offer popup “Call backup?” after toast (still one click) | Medium |
| R3 | Auto-join nearby PTT on every Weapon hit | **Reject** — FP storm |

**R1 wins.** Same spirit as FR **Standby PTT team** (click), not SOS.

### Call-group rules (for later MOB)

1. **Never** set device SOS flag / SOS ledger from Weapon.  
2. Group name clear: e.g. `WEAPON-ALERT` / dynamic `WD-{camId}` — not SOS group.  
3. Members: catching unit if BWC + online nearby (reuse SOS/FR nearby geometry, **Weapon-labeled**). Fixed cam hit: nearby BWCs only (no fake “cam talks”).  
4. Optional: one-shot HQ chime (softer than FR blacklist siren).  
5. Still need confirm/dedupe on detect (already lab knobs).  
6. DeviceControl tone to BWC = separate named MOB later (`udp_once` only).

### MOB names

| MOB | Scope |
|-----|--------|
| Done | `WEAPON-ALARM-TOAST-BLINK-V1` |
| Later | `WEAPON-ALARM-BACKUP-PTT-V1` — Call backup button → alert PTT group (R1) |
| Not now | Auto PTT on every hit |

---

## 5) One-screen truth

| Source | Contaminate Live/Ops? | Toast? | Auto Ops? | PTT backup |
|--------|----------------------|--------|-----------|------------|
| FR Live | — | Yes strong | Yes if blacklist rules | Standby PTT click |
| FR Offline | **No** (investigation) | Only on Offline surface | **No** (unless Go map) | Hidden |
| ANPR Live | — | Yes (FR pipeline) | Per FR rules | Per FR |
| ANPR Offline | **No** | Not via live FrAlarm | **No** | — |
| Weapon Live | Soft wake only | Yes mild (orange) | **No** | Phase 2 click **Call backup** |

---

## Next APPLY (queue unchanged unless you override)

After toast lab PASS: `MOB-APPLY WEAPON-LIGHTBOX-POS-KEEP-V1` or tile expand.  
Backup radio: only after you say `MOB-APPLY WEAPON-ALARM-BACKUP-PTT-V1`.
