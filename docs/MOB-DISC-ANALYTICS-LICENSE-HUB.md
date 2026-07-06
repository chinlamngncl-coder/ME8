# MOB DISC — Analytics hub (Face FR · ANPR · Weapon) + license gate

**Status:** DISC only — **no MOB-APPLY** until licensed + named wave.  
**Tender:** Domain **E** (S4-10, POC-6) — **risk 5**, last code waves.  
**Search:** `face recognition`, `ANPR`, `weapon`, `analytics`, `license`, `watchlist`

---

## Your instinct — agreed

**Do not** mix face / plate / weapon into Operations wall, map toolbar, or Evidence detail as half-wired checkboxes. That is what made the last attempt feel like a mess:

| Last-time pain | Why it happened |
|----------------|-----------------|
| Pump video in — nothing detects | No recognition engine wired to UI; only **ingest** existed |
| No clear blacklist / watchlist | No product screen for lists — only `storage/face-plate/` folder |
| Merry-go-round clicks | Features scattered: map checkbox, storage button, device messages |
| Unclear who can do what | No license gate, no super-admin delegate |

**Better model (your proposal):**

1. **Separate hub** — own top-level tab (like Evidence Hub), not buried in map  
2. **License-gated** — greyed out until client buys / enables module  
3. **Super-admin owns enablement** — passes rights to operators per function  
4. **One module at a time** — Face FR, ANPR, Weapon — not one tangled screen  

---

## What exists today (honest baseline)

| Piece | State |
|-------|--------|
| `lib/facePlateIngest.js` | Saves **face/plate stills** from BWC message service → `storage/face-plate/` |
| Map toolbar checkbox | **Disabled / greyed** — label only, no workflow |
| Storage → Face / plate | Opens folder on server — not a product UI |
| Recognition engine | **Not in VMS** — no watchlist, no video analyse, no match scores |
| Weapon detection | **Not present** |

So tender **POC-6 / S4-10** needs a **designed module**, not toggling the old checkbox.

---

## Product shape — **Analytics Hub** (working name)

New app view: `#app-view-analytics` — same nav pattern as Evidence / Audit / Server.

### Default ship (no licenses)

- Tab visible in main nav: **Analytics** (or **Intelligence**)
- Entire panel **greyed** with one clear message:

  *“Face recognition, ANPR, and weapon detection are optional modules. Not licensed on this server. Contact your administrator.”*

- No fake buttons, no upload that does nothing
- Map toolbar: **remove or keep grey** the old “Face Recognition / ANPR” checkbox — do **not** enable until Analytics license on

### When client licenses a module

Super-admin: **Settings → Licenses → Analytics**

| Module key | Tender ref | Enables |
|------------|------------|---------|
| `analytics.face_fr` | S4-10, POC-6 | Face detect + watchlist + alerts |
| `analytics.anpr` | Brochure / future | Plate read + hotlist |
| `analytics.weapon` | Optional future | Weapon-like object alerts |

Per-module: **perpetual license line** in ship doc + optional license file on server.

---

## Inside Analytics Hub (when licensed)

Three **sub-tabs** — only licensed tabs are active; others stay grey:

```
Analytics Hub
├── Face recognition   (licensed?)
├── ANPR               (licensed?)
└── Weapon detection   (licensed?)
```

### Face recognition (POC-6) — simple v1 flow

One pipeline, no merry-go-round:

```
Source → Detect → Review hits → Watchlist match → Alert / link to evidence
```

| Step | Source options | UI |
|------|----------------|-----|
| **Source** | Live BWC (on-device alert still) · Docked evidence video · Upload clip | Single “Open source” picker |
| **Detect** | Server or partner SDK (MOB names engine later) | Progress bar — “Analysing…” |
| **Review** | Thumbnail grid of faces found | Click face → crop + confidence |
| **Watchlist** | Agency list (super-admin upload CSV/photos) | **Blacklist / watchlist** screen — first-class |
| **Alert** | Match → banner + ledger row + optional link to incident | Same ops theme as SOS |

**Not in v1:** auto-run on every live wall tile (too risky for stability).

### ANPR (when licensed)

Same hub pattern: source → plate read → hotlist → alert. Shares license shell, separate engine.

### Weapon detection (when licensed)

Same shell; ship only when client requests. Grey by default everywhere.

---

## Roles (super-admin delegate)

Mirror Evidence / redaction model:

| Action | Super-admin | Operator (if granted) |
|--------|-------------|------------------------|
| See Analytics tab (licensed) | Yes | Yes if `analyticsView` |
| Enable modules / upload license | Yes | No |
| Manage watchlist / hotlist | Yes | Optional `analyticsWatchlistEdit` |
| Run detection on evidence | Yes | `analyticsAnalyse` |
| Acknowledge / dismiss alerts | Yes | `analyticsAlertAck` |
| Export match report | Yes | `analyticsExport` |

Settings → Users: new permission group **Analytics** (checkboxes), same grid style as Evidence.

Audit: `analytics.watchlist_upload`, `analytics.analyse`, `analytics.alert_ack`, `analytics.export`.

---

## Tender story (brochure + POC)

**Without building everything for ~1 week:**

| Phase | What TWG sees | Build |
|-------|----------------|-------|
| **Brochure** | Architecture diagram + perpetual FR license + privacy SOP | Doc + grey tab screenshot |
| **POC-6 minimum** | BWC on-device face alert → still in Analytics inbox **or** one analysed evidence clip with watchlist hit | `analytics.face_fr` only |
| **Full FR** | Live + watchlist + evidence link | Later MOB after license |

Phrase for Part 1:

*“Optional analytics modules (face recognition, ANPR, weapon detection) are licensed separately, administrator-enabled, and isolated from core live operations.”*

---

## MOB waves (risk order — **last**)

| Wave | MOB | Risk | When |
|------|-----|------|------|
| E0 | `mob-analytics-hub-shell` | **2** | Grey tab + license API + permissions grid (no engine) |
| E1 | `mob-face-fr-watchlist` | **5** | Watchlist UI + ingest inbox from `face-plate` |
| E2 | `mob-face-fr-analyse` | **5** | Evidence/upload analyse + match |
| E3 | `mob-anpr-module` | **4** | When client licenses |
| E4 | `mob-weapon-module` | **5** | When client requests |

**Do not** start E1–E2 before live/SOS POC waves pass checkpoint.

**Do not** touch: `video-wall.js`, `pttServer.js`, `sipServer.js`, live pool.

---

## What to do with old UI (cleanup rule)

| Today | Target |
|-------|--------|
| Map “Face Recognition / ANPR” disabled checkbox | Remove from map **or** link text: “Moved to Analytics — not licensed” |
| Storage → Face / plate button | Keep for admin file access; primary path becomes Analytics inbox |
| Scattered half-features | **No new** face buttons outside Analytics Hub |

---

## Recommendation

**Yes** — separate tab, license-grey default, super-admin delegate. That matches enterprise VMS practice and stops the merry-go-round.

For tender **this week**: apply **E0 shell only** (grey hub + license doc) if you need a screenshot; defer engine MOBs until after live POC + client license letter.

**Stack UX spec (industry study + action-bar rules):** [`MOB-DISC-ANALYTICS-STACK-UX.md`](./MOB-DISC-ANALYTICS-STACK-UX.md)

**Module licensing (same as BWC — vendor issue before ship):** [`MOB-DISC-MODULE-LICENSING.md`](./MOB-DISC-MODULE-LICENSING.md)

Reply when ready:

- `MOB-APPLY mob-analytics-hub-shell` — grey tab + license framework only (low risk)  
- or park until post-tender and brochure uses architecture diagram only
