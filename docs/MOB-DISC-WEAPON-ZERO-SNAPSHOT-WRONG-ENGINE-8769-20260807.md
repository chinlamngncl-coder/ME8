# MOB DISC — Weapon Recent: zero snapshots (2026-08-07 ~15:33)

**Status:** disc only. No code until APPLY.  
**Operator:** “zero snapshot. nothing.”

---

## Confirm

Poller **is** running and grabbing stills. Recent is empty because **detect returns 0 hits every tick** — and the process on the Weapon port is the **wrong engine**.

---

## Proof (lab now)

### 1) Still grab works; detect empty

`storage/service-stdout.log` (repeating):

```text
weapon still tick | camId=…29000009  grab_ms≈400–600  detect_ms=3–7  hits=0
```

- `grab_ms` hundreds → JPEG from live is OK.  
- `detect_ms` **3–7 ms** → not a real RF-DETR CPU pass (that is usually hundreds–thousands of ms). Fast fail / wrong API / empty body.  
- `hits:0` → nothing written to Recent → **zero snapshots**.

Last crop files under `storage/weapon-live-crops/` are from **this morning (~07:30)** — not from the current afternoon session.

### 2) Port **8769** is **ai_engine**, not `weapon-sidecar`

| Port | Health JSON | What it is |
|------|-------------|------------|
| **8769** (Fleet expects this) | `device`, `weights_kind:custom`, `weights_path:…\ai_engine\weights\weapon_rfdetr_best.pt`, `conf_floor:0.65` | **`ai_engine/main.py`** CPU smoke server |
| **8770** | Same shape | Second `ai_engine` instance |

Real Weapon bat (`START-WEAPON.bat`) starts:

```text
weapon-sidecar\.venv … uvicorn app:app --host 127.0.0.1 --port 8769
```

Health for that app is **different** (`engine`, `conf_gun`, `weights_kind: threat|pistol_smoke`, Threat/smoke `.pth`).

Fleet client (`lib/weaponSidecarClient.js`) still calls:

```text
POST http://127.0.0.1:8769/detect   body: { path, cam_id }
```

`ai_engine` exposes **`POST /api/v1/detect`** (multipart file upload) — **not** compatible. So ticks “succeed” with **0 hits** and tiny `detect_ms`.

### 3) Not “Fleet down” this time

`UbitronC2` Running. Live watch was on (then stop-video on `analytics-weapon`). Problem is **engine identity / API**, not blank dashboard.

---

## Why (likely)

Someone started **`ai_engine`** (or uvicorn pointed at it) on **8769**, stealing the port from `weapon-sidecar`.  
Pack / other-agent “weapon” experiments without the wire MOB.  
`ai_engine` was never APPLYed into the live poller path.

---

## Recommendation (one path — restore Recent now)

**Do not** rewrite poller to ai_engine in this crisis.

### APPLY when ready

`MOB-APPLY WEAPON-PORT-8769-RESTORE-SIDECAR-V1`

Exact scope:

1. Stop whatever holds **8769** (and leave **8770** alone if you still want ai_engine smoke).  
2. Start **`START-WEAPON.bat`** → real `weapon-sidecar` on 8769 (Threat or pistol-smoke `.pth` as before).  
3. Prove `GET /health` shows sidecar shape (not `ai_engine/weights/…`).  
4. Prove one `weapon still tick` with `detect_ms` >> 50 and/or hits when a gun is in frame.  
5. **No** product code change unless health/API still mismatch after restore.

Operator after APPLY: Weapon page → Start watch on live cam → wait a few seconds → Recent should fill again (or stay empty only if model truly sees no gun — not 3 ms fake zeros).

Optional later (separate APPLY): wire `ai_engine` properly **or** delete/disable starting it on 8769 so this cannot recur.

---

## Standing

Zero Recent ≠ “detector perfect and scene clean.”  
Right now = **wrong process on 8769** + incompatible `/detect`.
