# MOB DISC — One camera per display? Multi-user same cam? (live video model)

**Status:** DISC only — code-checked 2026-07-09. **No APPLY** unless you approve copy or enforcement MOBs.

**Trigger:** Display room footer: *“Each camera is shown once across displays. Do not view the same live source on Operations and the video wall together.”* — what does that mean in practice? Can panel + command wall share a cam? Can 5 logged-in users all watch the same cam? Can extra logins unlock more cameras?

---

## Short answers (what you wanted at build time)

| Question | Answer today |
|----------|----------------|
| **One BWC decode per camera?** | **Yes** — one SIP invite + one `liveStreamPool` session (one FFmpeg) **per camId**, server-wide. |
| **Same cam on Operations panel + Command wall?** | **Allowed** — not blocked. Counts as **two viewer refs** (`ops` + `command-wall`) on that login. Still **one** pool session. |
| **5 users, same cam, all watching?** | **Yes — by design.** Pool **fans out** MPEG to every connected player WebSocket. Each login adds a viewer ref; stream stays until **all** refs drop. |
| **5 users, 5 different cams?** | Up to **`DASHBOARD_MAX_LIVE` (default 8)** **distinct** pool sessions **for the whole server**, shared across all logins — not 8 per user. |
| **Extra super admin + operator logins to “view more”?** | **More viewers** of streams already live: yes. **More simultaneous different BWCs** than the pool cap: **no** — cap is global. |
| **Is the footer text enforced?** | **No** — advice only. No popup, no hard block (see `MOB-DISC-A5-DISPLAY-ROOM-UX.md`). |

**Your original intent (multi-operator watch same incident cam) is already how the server works.** The confusing part is UI copy that sounds like a hard “once only” rule and mixes **displays** with **decodes**.

---

## Architecture (verified in code)

### Layer 1 — BWC / pool (one per camera)

```
BWC ──one RTP──► liveStreamPool (one FFmpeg per camId)
                      │
                      ├── WebSocket fan-out ► User A wall player
                      ├── WebSocket fan-out ► User B wall player
                      ├── WebSocket fan-out ► User C map pin player
                      └── …
```

**File:** `lib/liveStreamPool.js` — *“one ffmpeg + RTP listener + WS fan-out each”*

- Second operator requesting the same cam → `invite skipped: already_streaming` → `video-stream-ready` to that socket only.
- BWC is **not** asked for a second RTP stream for the same cam.

### Layer 2 — Viewer refs (who is watching)

**File:** `lib/liveViewers.js`

| Concept | Meaning |
|---------|---------|
| **Surface `ops`** | Operations map pin / ops wall panels (`video-wall.js`) |
| **Surface `command-wall`** | Command wall grid (`command-wall.js`) |
| **Ref count per camId** | Sum of all sockets × surfaces still holding `start-video` |
| **Stream stop** | `releaseCamStreamWhenUnwatched` only stops pool when `countForCam(camId) === 0` |

So on **one browser login**:

| UI | Surface | Same cam as wall? |
|----|---------|-------------------|
| Ops panel live | `ops` | — |
| Command wall tile | `command-wall` | **Allowed** → 2 refs, 1 decode |
| Map pin (when wall live) | `ops` | **Pin mirrors wall canvas** — no second WebSocket on pin (Firmware Gold rule) |

**File:** `docs/MOB-DISC-FIRMWARE-GOLD-PIN-MIRROR.md` — wall owns JSMpeg; pin copies canvas.

### Layer 3 — Concurrent **cameras** (not viewers)

| Setting | Default | Meaning |
|---------|---------|---------|
| `FM_MAX_CONCURRENT_LIVE` / `DASHBOARD_MAX_LIVE` | **8** | Max **different** BWCs with an active pool session **site-wide** |
| `FM_DASHBOARD_MAX_STREAMS` | up to 16 | Pool slot ceiling (ports) |

**Not limited:** number of dashboard logins watching the **same** already-live cam.

**Limited:** how many **unique** BWCs can be live at once across all users and surfaces.

---

## What the Display room footer actually means

**Current i18n:** `displayRoom.streamNote`

> Each camera is shown once across displays. Do not view the same live source on Operations and the video wall together.

| Phrase | Plain meaning | Enforced? |
|--------|---------------|-----------|
| “Shown once across displays” | **One decode / one BWC stream per camera** (correct technically) | N/A — true at pool layer |
| “Do not view … Operations and video wall together” | **Operational guidance** — avoid two tiles on two monitors for the same cam; reduces ref noise and operator confusion | **No** |

**Mismatch:** Operators read “once” as **one tile on one screen**. Engineering means **one transcode path per BWC**. Those are different.

**Panel + command wall same cam:** Product **allows** it. Advice says **don’t** for control-room layout (Monitor 1 = ops, Monitor 2 = wall, different devices). Not a bug if you do it on purpose.

---

## Multi-user scenarios (bench truth table)

Assume cam **X** is in scope for all users (dispatch group / super admin).

| Scenario | Pool sessions for X | Each user sees video? |
|----------|---------------------|---------------------|
| 1 user, ops panel only | 1 | Yes |
| 1 user, ops + command wall same cam | 1 | Yes (2 refs) |
| 5 users, all command wall same cam | 1 | **Yes** (5 fan-outs) |
| 5 users, each a **different** cam (5 total) | 5 | Yes, until global cap |
| 10 users, 10 **different** cams | **Blocked at 8** — invites queued/skipped | First 8 win |
| User A stops wall ref; User B still watching | 1 until B stops | B keeps stream |
| All users disconnect | 0 → pool stops BWC stream | — |

**Roles:** `super_admin` vs `operator` changes **which camIds** `sessionCanSeeCam` allows — not fan-out mechanics. Two operators in the **same group** can both watch the same cam. Operators in **different groups** only share a cam if scope/SOS assist rules allow it (see `MOB-DISC-SOS-SCOPE-VS-NEARBY-PTT.md`).

---

## “Log in more users to view more cameras” — clarify

| Interpretation | Correct? |
|----------------|------------|
| More **eyeballs** on the same incident (5 supervisors on cam X) | **Yes** — log in as many dashboards as you need |
| More **parallel different BWCs** than 8 | **No** — raise `FM_MAX_CONCURRENT_LIVE` / hardware, or stop other lives |
| Super admin + operator each open **different** cams (2 total) | **Yes** — consumes 2 of 8 pool slots |
| Same cam on Monitor 1 ops + Monitor 2 wall pop-out | **Allowed** — still 1 pool session; footer advises against |

---

## DISC verdict

| Item | Status |
|------|--------|
| Multi-user same-cam fan-out | **Built and functional** — matches your design goal |
| One decode per BWC | **Built** — pool model |
| Footer copy | **Misleading** — sounds like hard “one screen only” |
| Ops + wall same cam | **Allowed** — advice only |
| Enforcement MOB | **Not required** for your stated goal unless you want hard block |
| Global 8-live cap | **Separate** from viewer count — document in control-room training |

---

## Recommended follow-ups (optional MOBs)

### A — `mob-display-room-stream-note-plain` (risk 1)

Replace footer with honest copy, e.g.:

> **One live stream per body-worn camera** (shared by all operators). For control rooms: put **different** cameras on Operations and the video wall. Same camera on both is allowed but not recommended.

### B — `mob-live-duplicate-surface-warn` (risk 2)

Soft toast when same socket already has `ops` + `command-wall` ref for same camId: *“This camera is already live on another surface.”* — no block.

### C — `mob-live-viewer-telemetry` (risk 1, ops)

Super-admin diagnostics: per cam — `ops` refs, `command-wall` refs, socket count, pool active. Helps prove 5-user same-cam in lab.

### D — Cap / scale (deploy, not UI)

`ME8-EIGHT-BWC-RULES.md` — product **8 concurrent BWCs** site-wide. Customer needing 16+ distinct lives = infrastructure MOB + BWC/SIP capacity review — not “add more logins.”

**Do not touch** `liveStreamPool.js` / `video-wall.js` for copy-only MOB A.

---

## Bench — prove 5 users same cam (lab)

1. Five browsers (or incognito sessions) → log in as users who can see cam **X**.
2. Each opens **Video wall** (or wall pop-out) → go live on **same** cam **X**.
3. **Expect:** all 5 decode; server log shows one `already_streaming` after first invite; `pool ws client attached` count rises.
4. One user stops → others keep video.
5. All five stop → log `pool stop — no dashboard viewers` for cam **X**.

---

## Apply when ready

- `MOB-APPLY mob-display-room-stream-note-plain`
- `MOB-APPLY mob-live-duplicate-surface-warn` (optional)
- `MOB-APPLY mob-live-viewer-telemetry` (optional)

Related: `MOB-DISC-A5-DISPLAY-ROOM-UX.md`, `MOB-DISC-FIRMWARE-GOLD-PIN-MIRROR.md`, `docs/ME8-EIGHT-BWC-RULES.md`, `lib/liveViewers.js`, `lib/liveStreamPool.js`.
