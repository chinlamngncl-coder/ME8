# ME8 fleet scale SOP — many devices, eight live

**MOB:** `mob-me8-fleet-scale-sop`  
**Tree:** `C:\Users\user\Desktop\Enterprise Mobility\ME8`  
**Audience:** Site super-admin, partner installer (training appendix — not operator daily card)

---

## One sentence

**ME8 shows everyone on the map; it streams only who you choose — up to eight live videos at once on one dispatch server.**

---

## Three layers (do not mix them)

| Layer | Meaning | Example scale |
|-------|---------|---------------|
| **Registered** | Devices in Server Config → BWCs | 50+ (license limit) |
| **Online** | SIP + GPS on map today | Same pool, filtered |
| **Live now** | Active video INVITE + decode | **Max 8** per site |

Industry dispatch (large BWC / IoT fleets) uses the same split: **map for awareness, wall for attention.**

---

## Product limits (ME8 v1)

| Item | Value |
|------|--------|
| Concurrent live video (pool) | **8** |
| Wall panels on screen | **6** (4 fixed + 2 rotate) |
| Map pin pop-ups (docked) | **8** max |
| Auto video on Open All | First **8** ranks get full live; rest show **Play** (lazy pin) |
| SOS alarms on map | **Never clustered** — always visible |

---

## Operator SOP (daily)

1. **Map** — zoom to area; use roster filter (group / online / offline).  
2. **Do not** expect every online pin to play video automatically.  
3. **Start live** only for incident, supervisor request, or patrol check — **max 8**.  
4. **Open All (Up to 8)** — fills wall/pins to cap; **not** “every device in the city.”  
5. **Play** on a map pin when you need that cam and it is not auto-live.  
6. **Stop** slots when done — frees capacity for the next cam.  
7. **SOS** — alarm cam and team PTT take priority; still counts toward live cap.

---

## When fleet grows (15–50 registered)

| Do | Avoid |
|----|--------|
| **Dispatch groups** — filter roster and PTT | Open All on entire fleet |
| **Shift / beat** workflow — one operator owns a group | One operator “watching everything” |
| **Lazy pin** — tap **Play** for extra cams | Expect 50 auto-streaming pop-ups |
| Second dashboard or **command wall** for a sector | Raising live cap in software without new SKU |

---

## Multi-operator (one site)

- **8 live is shared** across all dashboards on the same server (one pool).  
- Coordinate who invited which cam — duplicate Start live is coalesced, but capacity is shared.  
- SOS and command wall surfaces use the same pool ref-count rules.

---

## Partner installer (handoff one-liner)

> Register all BWCs in Settings. Operators see online pins on the map. Live video is manual or incident-driven — **up to eight at a time**. Use groups for large fleets.

No ZLM, ffmpeg, or engine names in customer training.

---

## Bench verify (registered >> live)

| Test | Pass |
|------|------|
| 20+ registered, 10 online | Map clusters; roster scrolls; browser responsive |
| 8 live on wall | All decode; 9th blocked or queued |
| Open All with 10+ online | ≤8 auto-live; others **Play** only |
| Stop all | Clean teardown |

See [ME8-CHECKPOINT-RITUAL.md](./ME8-CHECKPOINT-RITUAL.md).

---

## Related

| Doc | Use |
|-----|-----|
| [ME8-EIGHT-BWC-RULES.md](./ME8-EIGHT-BWC-RULES.md) | Code + product constants |
| [ME8-SMOKE-CHECKLIST.md](./ME8-SMOKE-CHECKLIST.md) | Full functional sign-off |
