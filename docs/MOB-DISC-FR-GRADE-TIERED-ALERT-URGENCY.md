# MOB DISC — FR grade-tiered alert urgency (not all red)

**Status:** DISC 2026-07-11 — **partial APPLY** · refresh 2026-07-13  
**APPLIED:** `mob-fr-alert-tier-server`, `mob-fr-go-ops-by-tier` (client auto-map gate)  
**NOT APPLIED:** `mob-fr-amber-toast-suspect`, `mob-fr-chime-by-tier`  
**Operator refresh:** `MOB-DISC-FR-LIST-GRADE-TOAST-NOT-ALL-ALERTS.md` (2026-07-13 — toast colours vs alerts + match FAIL note)  
**Trigger:** Same red toast/chime for poi / monitoring / suspect / blacklist — wrong for operations  
**Search:** grade alert, tiered urgency, suspect amber, blacklist red, silent watch, poi  
**Related:** `MOB-DISC-FR-OPS-FREEZE-SUSPECT-GRADE-SOP.md`, `MOB-DISC-FR-BLACKLIST-DOSSIER.md`, `MOB-DISC-FR-6TILE-OFFTILE-ALERT-SOP.md`

---

## Plain answer

**You are right.** Full red panic for every grade is wrong.

**Today (lab):** `poi` / `monitoring` are already **silent** on the interrupt path (rail + ledger only). **`suspect` and `blacklist` still share the red toast / HQ path** until amber + chime MOBs land.

**Locked direction:** Grade drives **urgency tier**, not just label text.

---

## Urgency tiers (locked)

| Grade | Urgency | Operator sees | Chime | Auto go-ops | Standby PTT default |
|-------|---------|---------------|-------|-------------|---------------------|
| `poi` | **Silent** | Rail + ledger only | No | No | No |
| `monitoring` | **Low** | Rail highlight + optional subtle badge | No | No | No |
| `suspect` | **Medium** | **Amber** toast + HQ bar (no siren) | Soft single beep | **Yes** | Offer — not auto |
| `blacklist` | **High** | **Red** toast + HQ bar + chime | Yes | **Yes** | Offer |

**Rule:** Higher grade can use lower UX (blacklist gets everything). Lower grade **never** uses blacklist red path.

---

## What changes per tier

### Silent (`poi`)

- `fr-crop-tick` with `match: true` on rail — **no** `fr-blacklist-hit` interrupt path
- Ledger row `match: true`, `listStatus: poi`
- Optional daily digest (later)

### Low (`monitoring`)

- Rail card **gold border** + grade badge
- **No** toast, **no** HQ bar
- Click card → detail drawer

### Medium (`suspect`)

- Socket: keep `fr-watchlist-hit` (rename from `fr-blacklist-hit` — alias old name)
- **Amber** toast (`#fr-amber-toast` or class `is-grade-suspect` on shared shell)
- HQ bar **amber** strip — same actions (Ack, Go map, Standby PTT)
- **No** auto-open drawer
- Chime: optional soft tone — not SOS-class

### High (`blacklist`)

- Current red path (today’s behaviour) — chime + red toast + HQ bar

---

## Server change (one gate)

`lib/frLivePoller.js` `emitHit()`:

```javascript
const tier = alertTierFor(listStatus); // poi|monitoring → skip emitHit interrupt
if (tier === 'silent' || tier === 'low') { ledger only; return; }
// suspect → emit 'fr-watchlist-hit' tier medium
// blacklist → emit tier high
```

**Threshold:** Same `matchProbe` — grade does **not** change math, only **response**.

---

## MOB plan (after freeze fix PASS)

| # | MOB | Delivers |
|---|-----|----------|
| **1** | **`mob-fr-alert-tier-server`** | `alertTierFor(listStatus)` gate in `emitHit`; poi/monitoring → ledger+rail only |
| **2** | **`mob-fr-amber-toast-suspect`** | Amber toast + HQ bar CSS; grade badge on line1 |
| **3** | **`mob-fr-chime-by-tier`** | Chime only `blacklist`; soft beep `suspect` |
| **4** | **`mob-fr-go-ops-by-tier`** | Auto Ops only `suspect` + `blacklist` |
| **5** | **`mob-fr-socket-hit-rename`** | `fr-watchlist-hit` + backward compat alias |

**Do not** bundle. Test each tier with enrolled lab faces.

---

## SOP (operator)

| Situation | Action |
|-----------|--------|
| Amber suspect hit | Investigate on map · Ack when seen · upgrade grade if confirmed threat |
| Red blacklist hit | Full dispatch SOP · Standby PTT · field alert per site |
| POI on rail only | Analyst review end of shift — promote grade if pattern |

Grade change SOP: `MOB-DISC-FR-OPS-FREEZE-SUSPECT-GRADE-SOP.md` §3.

---

## APPLY cheatsheet

```text
MOB-APPLY mob-fr-alert-tier-server
MOB-APPLY mob-fr-amber-toast-suspect
MOB-APPLY mob-fr-chime-by-tier
```

---

## Bottom line

| Today | Target |
|-------|--------|
| All grades = red panic | Grade = urgency tier |
| Suspect = blacklist UX | Suspect = **amber investigate** |
| POI floods alerts | POI = **silent rail** |

UI shells (toast, go-ops) stay — **wire tier logic** next.
