# MOB DISC — FR watch vs Open All “Overlapping” + offline pin linger

**Status:** Open — observe / decide; **do not MOB-APPLY yet**  
**Date:** 2026-07-10  
**Search:** `Overlapping`, `Pin Stack`, `Open All`, `analytics-fr`, `last-gps`, `offline pin`, `8 hour`  
**Screenshot cue:** HUD `Overlapping (2) — … [Chin] [kk]` + grey pin `UB-6A5G`

---

## What you are seeing (two different things)

| Symptom | What it actually is |
|---------|---------------------|
| Blue HUD **“Overlapping (2)”** with chips **Chin · kk** | **Map pin live popups** stacked on nearly the same GPS. Product feature (`#map-pin-stack-hud`). Not an FR error string. |
| Grey pin **UB-6A5G** | **Offline last-known location** pin. Separate from the Overlapping chips (those chips are only **open live popups**). |

So: Open All opened live pin panels for Chin + kk → they sit on top of each other → HUD says Overlapping.  
UB-6A5G is a third, offline marker nearby — it does **not** drive that “Overlapping (2)” label.

---

## Q1 — Does FR Start watch affect Open All / cause Overlapping?

### Short answer

| Layer | Affect each other? |
|-------|--------------------|
| **Map “Overlapping” HUD** | **No direct link.** HUD is from **ops map pin popups** (Open All / pin live). FR tiles live under Analytics (`surface: analytics-fr`) and do **not** open that HUD. |
| **Live stream pool (SIP / decode)** | **Yes, shared.** Same cam can hold **two viewer surfaces** at once: `analytics-fr` + `ops`. One pool stream, two UI consumers. Counts toward the **≤8 live** fleet SOP. |
| **Stop FR → Overlapping gone?** | **No.** Stop watch only `stop-video` with `surface: analytics-fr`. Ops pin popups / wall slots from Open All **stay open** → HUD can remain. |

### Why it *felt* tied to FR

Typical sequence:

1. Start FR watch (4 tiles, `analytics-fr`)  
2. Switch to Operations → **Open All**  
3. Open All opens **map pin live** for checked devices (Chin, kk)  
4. Chin + kk GPS are close → pin popups collide → **Overlapping (2)**  
5. Stop FR → pool load drops a bit, but **pin popups still open** → HUD still there  

Correlation ≠ FR broke the map. Open All + colocated GPS did.

### Real risks if both run together (parked — not apply)

| Risk | Severity | Notes |
|------|----------|--------|
| Hit **8 live** ceiling faster | Medium | FR 4 + Open All N can starve other live |
| Same cam dual surface | Low–Med | By design (`liveViewers`); possible duplicate-surface hint; usually one SIP |
| Operator confusion (“FR broke map”) | High UX | HUD wording doesn’t mention Open All / pin stack |
| Leaving Analytics without Stop | Low | `onHideOrLeave` should stop FR watch — verify in soak if tab switch leaves refs |

**Not claimed without soak:** FR start alone opens Chin/kk map popups. Code path for Overlapping is pin-popup cluster, not FR tile grid.

---

## Q2 — Offline pin UB-6A5G: should refresh clear it?

### Short answer: **No — current product keeps last GPS forever**

| Behavior today | Detail |
|----------------|--------|
| On `device-offline` | UI calls `showOfflineLastLocationPin` → grey pin at last lat/lon |
| Persistence | `storage/last-gps.json` (e.g. `UB-6A5G` still stored) |
| Server restart / hard refresh | Reloads last GPS → **pin comes back** |
| Auto-remove after N hours | **None** |

So refreshing “so many times” will **not** remove UB-6A5G while that file still has coordinates. That is intentional “last known location,” not a stuck FR bug.

Offline pin ≠ Overlapping HUD. You can have grey UB-6A5G **and** Overlapping Chin/kk at the same time.

---

## Q3 — Should offline pins expire after 8 hours (shift)?

### Industry / ops patterns

| Pattern | Who uses it | Pros | Cons |
|---------|-------------|------|------|
| **Keep forever** until next GPS or admin clear | Many VMS / AVL | Always know “where we last saw them” | Map clutter; stale pins look “alive” |
| **TTL / shift fade** (e.g. 8–12 h) | Shift-based security | Clean map after shift | Lose forensic “last seen” unless history exists |
| **Hide offline, show on demand** | Clean ops maps | Less clutter | Extra click to find last location |
| **Age styling only** (grey → dimmer → “stale”) | Compromise | Keep data, reduce false urgency | Still clutter |

### Recommendation for Ubitron (discuss — no apply)

**Do not tie this to FR.** Separate MOB if we change it.

| Option | Proposal | When |
|--------|----------|------|
| **A — Prefer (product)** | Offline last-location pin **auto-hide after configurable TTL** default **8 h** (shift). Keep row in `last-gps.json` or gps-track for Evidence / Route; only **map marker** hides. | Ops map cleanliness |
| **B — Soft** | Keep pin forever but after 8 h show **“Last seen … ago”** + more muted style; optional “Hide stale offline” toggle | Safer rollback |
| **C — Manual** | Super-admin “Clear offline pins older than…” | Least surprise |

**Locked if we later apply A:** TTL env e.g. `FM_MAP_OFFLINE_PIN_TTL_H=8`; never delete gps-track history for audit.

---

## Separation of concerns (locked for this DISC)

```
FR Start/Stop watch     →  analytics-fr tiles + sidecar poll
Open All / pin live     →  ops wall + map pin popups → Pin Stack / Overlapping HUD
Offline grey pin        →  last-gps.json + device-offline  (independent)
```

Fixing “Overlapping after FR stop” by changing FR is the **wrong** lever.  
Fixing “UB-6A5G won’t leave” by restarting Fleet is the **wrong** lever.

---

## Suggested next steps (user chooses — still no apply)

1. **Soak confirm:** Stop All / close pin popups on map → does Overlapping HUD disappear while FR is still running? (Expect **yes**.)  
2. **Soak confirm:** FR only, no Open All → any Overlapping HUD? (Expect **no**.)  
3. **Decide offline TTL:** A / B / C above → name MOB later e.g. `mob-map-offline-pin-ttl`.  
4. **Optional UX MOB later:** clearer HUD copy (“Pin panels stacked — drag apart”) so it isn’t blamed on FR.  
5. **Optional capacity MOB later:** warn when FR watch + Open All would exceed 8 live.

---

## Bottom line

| Question | Answer |
|----------|--------|
| FR watch vs Open All — affecting? | **Pool/capacity yes; map Overlapping HUD no** (HUD = pin popups). |
| Stop FR, still Overlapping? | **Expected** if Open All pin panels still open (Chin + kk). |
| Caused by offline UB-6A5G? | **No** for that HUD; grey pin is separate last-location. |
| Should offline pin vanish on refresh? | **Not today** — `last-gps.json` persists. |
| 8-hour shift hide? | **Reasonable product option** — discuss; separate MOB; not FR. |

Park until you pick: soak only · offline TTL option · or a named MOB.
