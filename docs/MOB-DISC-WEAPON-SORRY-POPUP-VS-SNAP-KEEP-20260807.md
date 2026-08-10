# MOB DISC — Sorry: popup place ≠ snap photo keep (2026-08-07)

**Status:** disc only. No code.  
**Tone:** plain words. Fix the bad earlier disc.

---

## Apology (clear)

Earlier I said: “Snap xy is never written to storage for FR, ANPR, or Weapon.”

That sounded like: **“you never keep snaps.”** That was **wrong talk**.

I mixed up **two different things**:

| Thing | Plain meaning |
|-------|----------------|
| **A — Popup place** | Where the window sits on the screen (left / top). My “xy” meant this. |
| **B — Snap photo keep** | The picture / crop you Keep or that History stores. **You did this. We pushed it.** |

You were talking about **B**. I mumbled about **A**. That is on me.

---

## What we already did (photo keep) — yes, real

### FR (done + committed)

| Action | Where it goes | Survives refresh? |
|--------|----------------|-------------------|
| Open snap float | On screen | Until you close / refresh |
| **Keep** (pin card) | `#fr-snap-kept` on glass | Until refresh / new login (same browser work session) |
| **Keep for Investigation** | Disk: `storage/fr-kept/` (+ Evidence UI) | **Yes** |
| Auto good snaps | Disk: `storage/fr-snap-ledger/` | **Yes** |

Docs already lock this: `MOB-DISC-FR-SNAP-FLOAT-KEEP-MAP.md`, `MOB-DISC-FR-SNAP-KEEP-WHERE.md`, `lib/frKeptEvidence.js`.

### ANPR (done + committed)

| Action | Where it goes | Survives refresh? |
|--------|----------------|-------------------|
| Live hit | Recent rail + lightbox | Session work |
| **Search & History** | **PostgreSQL** (`anprCaptureHistory`) | **Yes** |
| **Download Evidence** | Operator download | Yes (their file) |
| **FTP inbox** | Admin FTP folder → Image investigation | Yes (inbox files) |

### Weapon (today — gap)

| Action | Where it goes | Survives refresh? |
|--------|----------------|-------------------|
| Hit → Recent | Server RAM list + crop file under Weapon crop path | Soft — list resets when Fleet restarts; not FR holds / not ANPR History |
| Keep / Investigation | **Not built** | — |
| HQ alarm toast | **Not built** | — |

So: **FR and ANPR photo keep = real.** Weapon photo keep = **not same yet**.

---

## Popup place only (what DRAG-X did)

| | Drag window? | Reopen same tab | New session / hard refresh |
|--|--------------|-----------------|----------------------------|
| FR snap float | Yes | Keeps place if you dragged | Back to default |
| ANPR lightbox | Yes | Goes **center** again | Center |
| Weapon (now) | Yes (DRAG-X) | Goes **center** again | Center |

Nobody saves window left/top into a forever file for FR/ANPR/Weapon.  
FR float **feels** “kept for the session” because the DOM card stays — until refresh / different login clears the page.

---

## What we can do next (one path)

**Next UI MOB (popup place like FR float):**  
`MOB-APPLY WEAPON-LIGHTBOX-POS-KEEP-V1`  
→ After you drag Weapon lightbox, reopen keeps that place **until refresh / new session**. Same idea as FR float, not ANPR center-reset.

**Later (photo keep like FR/ANPR — separate MOB):**  
`WEAPON-SNAP-KEEP-EVIDENCE-V1`  
→ Keep button → disk pack (like `storage/fr-kept`) and/or Evidence tab. Not mixed into POS-KEEP.

**After that (ops):** Colab B negatives (car/bull-bar) → `WEAPON-ALARM-NEARBY-V1`.

---

## One next APPLY

`MOB-APPLY WEAPON-LIGHTBOX-POS-KEEP-V1`

(Photo Keep for Weapon = later named MOB above. Say when you want that instead.)
