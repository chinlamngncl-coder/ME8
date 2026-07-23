# MOB DISC — Seven operator issues (UI + Chin + lock GPS + remotes + FR + Centre)

**Status:** DISC locked — **no APPLY** until you name one MOB  
**Date:** 2026-07-22 ~22:40  
**Trigger:** Operator screenshots + seven complaints after PTT group PASS  
**Keep:** WVP handoff ON. Do not park. One MOB at a time.

---

## Verdict (plain English)

| # | What you see | What it actually is | Should be |
|---|--------------|---------------------|-----------|
| 1 | Chin video hard to open / opens then dies | WVP handoff **stop vs reopen race** (not “Chin cursed”) | Stabilize open/close (needs one clean log soak) |
| 2 | Right column shows **“Do…”** only | Column is **Detail** = **Download · Open source** — layout **clips** it. **Not Delete** | Full labels visible on one line |
| 3 | Fat full-width blue bars (“Load trace”, etc.) | Global `.btn { width:100% }` leak — **not** hub theme | Content-sized blue primary + ghost secondary |
| 4 | Centre Summary “Loading…” + red error | Load **failed**; subtitle never cleared from “Loading…” | Real error / empty state; clear subtitle |
| 5 | Image matching failed | **Already wired** to FR sidecar — fail = license / sidecar / photos | Fix ops (or one diagnose MOB if still FAIL) |
| 6 | Lock → Unlock → pin GPS gone | Lock does **not** clear GPS. **WVP presence online** does **not** replay last GPS (Fleet REGISTER does) | Replay last GPS (or query) on WVP became-online |
| 7 | Snapshot “clicks” 5–6 times | UI binding is **one** click → one command; likely **status-query storm** or **BWC shutter burst** — need log count | Prove 1 vs N `TakePicture` in log, then fix the real path |

---

## 1) Chin — could not open / open and close

**Engine:** `start-video` → WVP handoff (`lib/wvpVideoHandoff.js`); stop via `releaseCamStreamWhenUnwatched` / pin `popupclose`.

**Likely causes (ordered):**
1. Fast open→close→open while invite/play still in flight (stop deferred / Busy).
2. Pin popup close releasing stream while wall still wants it.
3. Handoff `stopPlay` racing new `startPlay`.

**Not:** Hardcoded Chin hate — same path as kk; Chin may hit race more if used more.

**Next MOB (later):** `CHIN-VIDEO-OPEN-CLOSE-STABILIZE-V1` — only after one operator soak + log lines (`wvp video handoff`, `pool stop deferred`, `stop bridge`).

---

## 2) Redacted exports — right side “Do…” — Download? Delete?

**Answer locked from code + your hint text:**

| Action | On this table? |
|--------|----------------|
| **Download** | **Yes** — get the redacted MP4 |
| **Open source** | **Yes** — jump back to original evidence |
| **Delete** | **No** — Delete is Case Files, not Redacted exports |

Header should read **Detail**. Row should show: **`Download · Open source`**.

**Why clipped:** `#ev-rx-table-wrap { overflow-x: hidden }` + fixed table + last column starved (`~1%`). Labels exist; the panel **cuts them off**.

**Your screenshot proves it** — “Do…” = start of Download.

---

## 3) Theme — don’t fill the whole pipe blue

**Our hub theme (locked):**
- Primary: `btn btn-action btn-sm` — filled blue **`#2563eb`**, **content width** (not full row)
- Secondary: `btn btn-ghost btn-sm` — outline / muted
- Sidebar legacy: `.btn { width: 100% }` — **must not leak** into Evidence / Trace / Analytics toolbars

**Broken today:** e.g. **Load trace** sits in `.rt-toolbar` with **no** `width: auto` override → full blue pipe. Same family of bug as past Redacted “ghost bar” fights.

---

## 4) Centre Summary stuck Loading

**API:** `GET /api/command-centre/summary` (super-admin / manage-server only).

**UI bug:** On failure, red error shows, but `#cs-generated-at` stays on **“Loading…”** forever (`command-centre.js` `showError` does not clear it).

**Common real fail:** 401/403 (session / not super-admin), or 500 from report builder.

**Fix MOB:** clear subtitle + show honest error (auth vs server).

---

## 5) FR / image matching — did we put it on?

**Yes — already wired.**

| Step | Path |
|------|------|
| Analytics → Verify | Photo A / Photo B → **Run verify** |
| API | `POST /api/analytics/fr/verify` |
| Engine | FR sidecar (`frSidecarClient`) |

**If you failed just now, check (ops, not rewrite):**
1. Status line says “Face matching is ready.” (not down)
2. License FR on **or** lab `FM_LICENSE_FR=1`
3. Sidecar running (`FM_FR_SIDECAR_AUTO=1` + restart)
4. Two real face photos (not blank / no face)

If status says ready and verify still fails → one diagnose MOB with the exact error code from UI/log.

---

## 6) Lock → Unlock → pin GPS gone

**Lock/Unlock** send device control only — **they do not delete** `lastGpsByCam`.

| Come-back path | Replays last GPS to map? |
|----------------|--------------------------|
| Fleet SIP **REGISTER** | **Yes** (`gps-update` from cache, or query if none) |
| **WVP presence** “device online” | **No** — only clears offline-pin session + roster (`onBecameOnline` ~12540). **No** `gps-update` |

Under WVP-homed cams, unlock often returns via **presence**, not Fleet REGISTER → map can stay empty until the next GPS packet.

**Fix MOB:** On WVP `onBecameOnline`, if `lastGpsByCam` exists → emit `gps-update` (same as REGISTER); else `maybeQueryGpsForDevice`.

---

## 7) Snapshot / remotes click storm

**Code:** Snapshot / Record / Lock use **one** toolbar handler → **one** `remote-control` emit. Server has **no** TakePicture retry loop.

**More likely than “button bound 6 times”:**
1. `select-device` / status queries firing a burst of SIP **DeviceStatus** (looks busy on device)
2. BWC firmware taking multiple stills on one TakePicture
3. Need log proof: **1 click → how many `TakePicture` / `device control sent`?**

Same audit for Record / StopRecord / Lock / Unlock / Reboot.

**No fresh TakePicture storm log pack in repo right now** — operator: one Snapshot click after restart, then we count lines.

---

## Recommended APPLY order (agent pick — one path)

| Order | MOB | Why first |
|-------|-----|-----------|
| **1** | `HUB-UI-DETAIL-AND-THEME-V1` (+ follow-on Detail line MOBs) | **APPLIED** — confirm PASS on full-row line |
| **2** | `CENTRE-SUMMARY-LOAD-ERROR-CLEAR-V1` | Stop fake “Loading…” — **APPLIED 2026-07-22** awaiting PASS |
| **3** | `WVP-PRESENCE-REPLAY-GPS-ON-ONLINE-V1` | Lock→unlock pin gone |
| **4** | Snapshot/remotes — **log proof first**, then named MOB if N× TakePicture |
| **5** | `CHIN-VIDEO-OPEN-CLOSE-STABILIZE-V1` — after one open/close log soak |
| — | FR | Ops checklist first; code MOB only if still FAIL with code |

**Parked / do not mix:** `CALL-GROUP-DISPATCH-V1` stays next on voice track when you return to it — not bundled here.

---

## First APPLY phrase (when you want code)

**`MOB-APPLY HUB-UI-DETAIL-AND-THEME-V1`**

Scope of that MOB only:
1. Redacted Detail column: full **Download · Open source** (never Delete here)
2. Hub toolbars: primary buttons **content-sized**, not full-row blue pipes (Trace Load + same leak family)
3. Cache bust / Ctrl+F5 verify

Everything else waits for its own named APPLY.
