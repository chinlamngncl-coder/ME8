# MOB DISC — APPLY SOS-ACK-MUTE-HOLD-RESPECT-V2 — 2026-08-10

**Status:** APPLIED.  
**APPLY:** `MOB-APPLY SOS-ACK-MUTE-HOLD-RESPECT-V2 dashboard-boot-only`

---

## Honest correction (why V1 seemed dead)

Ops **does not load** `public/js/dashboard-boot.js`.  
Live Ack mute lives in the **inline script inside `public/index.html`**.  
V1 only patched the unused twin → Ack still muted immediately.

**This V2 patches the live path:** `public/index.html` Ack dismiss.  
`dashboard-boot.js` updated to match (mirror only).  
**`video-wall.js` / FLV / pin mirror / DeviceControl: not touched.**

---

## Behavior

| Event | Action |
|-------|--------|
| Ack | **No** immediate mute → start **60s** hold |
| After `resyncPinVideoAfterSosAck` | `keepListenAfterSosAck` + retries 300ms / 900ms (uses existing `unmuteAudioForSosCam` while recent-ack linger keeps SOS-audio gate open) |
| Hold ends | one `muteLiveAudioForCam` |
| New SOS | clear hold |

---

## Operator PASS

1. **Hard refresh** (required — inline HTML).  
2. SOS → hear live.  
3. Ack → **still hear** (not muted instantly).  
4. ~60s later → auto-mute.  
5. Manual mute mid-hold still works (speaker button).

---

## Rollback

Revert this APPLY only; checkpoint `189b2eb` still on remote if needed.
