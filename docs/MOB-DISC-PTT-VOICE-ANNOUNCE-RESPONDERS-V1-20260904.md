# MOB-DISC PTT-VOICE-ANNOUNCE-RESPONDERS-V1 — 2026-09-04

**Status:** paper only. Code after `MOB-APPLY PTT-VOICE-ANNOUNCE-RESPONDERS-V1`.
**Ask:** when an SOS is raised, the nearest helper BWCs hear a short spoken dispatch on their speaker instead of nothing. Alarm BWC stays silent by default (officer safety). No hardcoded helper list — nearest is computed per incident.

## Locked decisions

| # | Decision | Why |
|---|---|---|
| 1 | Pre-recorded clips only. No runtime TTS, no cloud. | Air-gap ship; Linux/Windows parity; no new runtime dependency. |
| 2 | Alarm BWC is **never** a target unless Super-admin turns on "Announce to alarm BWC" (default OFF). | Speaker on the officer's chest saying "SOS received" tells the aggressor. |
| 3 | Targets = **nearest PTT-online helpers by GPS**, ranked by distance, top N (default 3), inside radius. Reuses `geoNearby.findNearby`. No static list anywhere. | User rule: nearest helper we design, no hardcoding. |
| 4 | Delivery = existing per-target unicast `pttServer.sendPttAudioToDevice(camId, alaw)`. `lib/pttServer.js`, `lib/psG711Audio.js`, `lib/sipServer.js` are **not edited**. | Locked cores. Per-target TX already exists (`group-ptt-per-target-tx-proof-v1`). |
| 5 | Floor = existing `pttFieldGroupRelay.beginHqFloor / touchHqFloor / endHqFloor` with a virtual holder id `announce:<incidentId>`. Busy → wait, retry up to 3× (2 s gap), then drop and log. Never interrupts a human. | Same single-floor rule operators already live under. |
| 6 | Recording: announce runs through `pttEvidenceRecorder.beginHqTalk(virtualId, targets, 'Axiom announce') / appendHqTalk / endHqTalk` when `anyCamInPttEvidence(targets)`. | Audit trail of what responders were told. |
| 7 | One announce per event per target. Events: `raise` (default ON), `ack` (default ON, only to team helpers minus alarm cam), `merge/repeat press` (default OFF). | No storm. |
| 8 | Fail-open everywhere. Any error → log + skip. SOS raise/ack path never waits on announce. | Announce is a convenience, SOS is not. |

## Phrase design (no name, no free text)

Clips are 8 kHz mono 16-bit PCM WAV, ≤ 3 s each, one folder per locale.
Composition = `intro` + `distance bucket` (+ optional `direction`). Buckets, not numbers — fewer clips, no digit stitching.

```
storage/ptt-announce/<locale>/meta.json
{
  "intro":      "sos-alert.wav",          // "SOS alert. Officer nearby needs assistance."
  "d_lt100":    "under-100m.wav",
  "d_lt300":    "under-300m.wav",
  "d_lt1000":   "under-1km.wav",
  "d_ge1000":   "over-1km.wav",
  "dir_N".."dir_NW": "north.wav" ...      // optional; skipped if missing
  "ack":        "backup-dispatched.wav"    // "HQ acknowledged. Backup dispatched."
}
```

- Defaults shipped in `assets/ptt-announce/en/` (copied to storage on first boot if missing). Other locales (fil / id / th / ko / zh) = same keys, dropped in by ops; missing key → skip that clip, never fail.
- Bucket thresholds live in Settings (defaults 100 / 300 / 1000 m), not in code.
- Loaded once, decoded to A-law once, cached. Reload on Settings save.

## Runtime (new module `lib/pttVoiceAnnounce.js`, ~200 lines)

```
announceSos({ incidentId, alarmCamId, lat, lon, event })
  1. settings.ptt.voiceAnnounce.enabled ? else return
  2. candidates = fleet devices with GPS && pttServer.isDevicePttOnline(id) && id !== alarmCamId
     (alarmCam included only if announceToAlarmCam === true)
  3. nearest = geoNearby.findNearby(candidates, lat, lon, radiusM).slice(0, topN)   // sorted by distance
     event 'ack' → intersect with pttFieldGroupRelay SOS team for alarmCamId
  4. per target: frames = clips(intro, bucket(distance), dir(bearing)) as 160-byte A-law @ 20 ms
  5. floor = beginHqFloor('announce:'+incidentId, targets)  (retry ×3 / 2 s)
  6. pace with setInterval 20 ms → sendPttAudioToDevice(target, frame); touchHqFloor each 1 s
  7. endHqFloor; endHqTalk; log 'ptt voice announce' { incidentId, targets, distances, durationMs, dropped }
  8. dedupe key incidentId+event+target (Map, cleared on ack/clear)
```

A-law encode: reuse `psG711Audio` export if one is public; otherwise a 20-line local PCM16→A-law table inside the new module. **No edit to `psG711Audio.js`.**

## Hooks (3 lines total)

- `lib/deviceAlarm.js` raise path → `deps.voiceAnnounce && deps.voiceAnnounce({ incidentId: incident.id, alarmCamId: camId, lat, lon, event: 'raise' })` (try/catch, after `emitDashboard`).
- `server.js` ack handler after `sos response ptt team` → `event: 'ack'`, targets = team minus alarm cam.
- `server.js` `deviceAlarm.configure` → `voiceAnnounce: pttVoiceAnnounce.announceSos`.

## Settings (Super-admin → PTT)

| Key | Default |
|---|---|
| `ptt.voiceAnnounce.enabled` | false |
| `ptt.voiceAnnounce.locale` | follows server locale |
| `ptt.voiceAnnounce.topN` | 3 |
| `ptt.voiceAnnounce.radiusM` | same as SOS nearby radius setting |
| `ptt.voiceAnnounce.onRaise / onAck / onRepeat` | true / true / false |
| `ptt.voiceAnnounce.announceToAlarmCam` | false |
| `ptt.voiceAnnounce.buckets` | [100, 300, 1000] |

UI copy: one industry line beside the toggle (bucket B): "Spoken dispatch to the nearest PTT-online BWCs when an SOS is raised. The alarm BWC stays silent unless enabled below."

## Risk

| Risk | Mitigation |
|---|---|
| Floor collision with a live human burst | Wait/retry; never pre-empt. |
| Storm on repeat press | `onRepeat` default OFF; dedupe per incident+event+target. |
| Locked PTT core | Zero edits to pttServer / psG711Audio / sipServer. Unicast API only. |
| Wrong "nearest" (stale GPS) | Use last fix age ≤ 10 min (same rule as SOS nearby list); stale → excluded and logged. |
| Officer safety | Alarm cam OFF by default; setting is Super-admin only. |

## Not in this MOB

Runtime TTS, officer names in speech, digit stitching, announce to fixed cameras, PTT group re-push. Tactical PTT box mirror is a separate UI MOB.

## PASS

1. Enable in Settings, 2 helper BWCs online on PTT with GPS, 1 alarm BWC.
2. Press SOS → within 3 s the **nearest helper** BWC speaks "SOS alert … under 300 metres"; alarm BWC silent; log `ptt voice announce` lists targets + distances.
3. Operator holding talk at that moment → announce waits, plays after release (log shows `floor_busy` retry).
4. Ack with helpers selected → helpers hear "HQ acknowledged. Backup dispatched." once. Repeat press → nothing (default).
5. Disable → nothing plays.
