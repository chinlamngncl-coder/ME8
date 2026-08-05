# MOB DISC — FR BWC roster + hit→slot 1 + map/tone confirm (2026-08-05)

**Status:** APPLIED chrome `FR-KS-BWC-ROSTER-CHROME-V1` (2026-08-05). Hit→slot1 still later.  
**Also covers** the earlier KS label / snap-size / live-shrink ask (still not applied).

## Confirm: I understand

```
Header:  KNOWN SUBJECTS  [big chips same size as Recent snaps]   ← label LEFT of chips

Live 3×2 a bit smaller / shifted up
─────────────────────────────────────┬─ Recent 12 (unchanged)
BWC online — more height             │
 Start watch · Stop · …   Search  [Online ▾ words fully visible]
 ┌─ PP ─┐ ┌─ G2 ─┐ ┌─ G3 ─┐ ┌─ G4 ─┐ ┌─ G5 ─┐   groups LEFT → RIGHT
 │ 5–6  │ │      │ │      │ │      │ │      │   no thick box shadows
 │ BWCs │ │      │ │      │ │      │ │      │
 └──────┘ └──────┘ └──────┘ └──────┘ └──────┘
```

Plus behavior you asked to confirm / add:

- **Polling** — already in code (see below).
- **Hit during polling** — catching BWC jumps to **top-left live slot 1**, even if it was off-screen in the rotate pool.
- **Ops map live popup** — confirm still there.
- **Alert BWC + tone from software** — confirm what exists vs “non-stop”.

## Facts (already in product — no APPLY)

| Topic | Status |
|-------|--------|
| **Live polling / rotate** | **Yes.** 6 live tiles. Up to **32** in the watch set. Extra cams rotate every **20s** (`ROTATE_MS`). Offline skipped. |
| **Ops map live popup** | **Yes, still there.** Blacklist / high-tier hit → Ops + pin zoom + `VideoWall.promoteFrBlacklistLive` (wall + map pin live). Toast **Go to map** always works. Suspect+blacklist auto-go-ops; lower grades do not auto-jump. |
| **Alert field + tone** | **Yes, still there** — toast / drawer **Alert field** → `fr-field-alert`. Sends PTT dual-beep burst (**~10 repeats, ~8–10s**) + soft SIP text. **Not non-stop.** 25s cooldown. Stops if Call starts. Offline video hits hide this button. |
| **Hit on FR tiles today** | Only **red flash** if that cam is **already** on a tile (`flashCam`). Does **not** pull a hidden/polling cam into slot 1. |

Honest on “non-stop tone”: that is **not** current behavior. A true loop until Ack would be a **separate named MOB** (risk: BWC/PTT lock, can’t talk). Recommend keep the existing burst unless you later APPLY a tone-loop MOB.

## Now vs target (UI)

| Piece | Now | Target |
|-------|-----|--------|
| KS words | Above chips | **Left of** the 6 chips |
| KS chip size | 80×80 | Match **Recent** snap tile |
| Live 3×2 | Tall, eats column | Smaller / higher |
| BWC panel | Thin strip | More height — show **~5–6 BWCs** under group heading |
| Filter select | `width: 88px` — **Online / In watch set** clipped. No Offline option | Full words visible: **Online · In watch · Offline** (+ All if it still fits) |
| Groups | 4-col grid already, but 1 group looks like a left strip + heavy card chrome | **1st → 2nd → 3rd → 4th → 5th group to the right.** Flat cards — **no thick top/bottom/side shadows** |
| Hit → slot 1 | Flash only if on-screen | **New behavior MOB** (not in the UI APPLY) |

## Split (one APPLY at a time)

### 1) UI chrome first

**`MOB-APPLY FR-KS-BWC-ROSTER-CHROME-V1`**

Will do only:

1. KS: label left of chips; chips sized to Recent snap cell.
2. Shrink live 3×2 a bit; give height to BWC online.
3. Widen filter so **Online / In watch / Offline** text is fully readable; add Offline if missing.
4. Group cards left → right (up to 5 across). Each card: heading (e.g. PP) + ~5–6 member rows visible. No heavy shadows/borders.
5. **Do not touch** firewall, storage, sidecar, ANPR 3-col, rotate timer, map takeover, field-alert tone.

### 2) After you PASS chrome

**`MOB-APPLY FR-HIT-PROMOTE-LIVE-SLOT1-V1`** (later)

On a live FR hit (Recent / alert, not offline video): put that `camId` on **slot 0** (top-left). If it was only in the rotate pool, start it there; if it was on another tile, swap/move it to slot 1. Pin it so the next 20s poll does not immediately kick it off. Ops map popup path stays as today.

### 3) Tone non-stop

Not in either MOB above. Say so if you want a third disc/APPLY.

## Operator pass (after chrome APPLY)

Hard-refresh once.

- KNOWN SUBJECTS left of larger chips.
- Filter words fully visible.
- Groups sit left → right; PP shows ~5–6 rows without a fat shadow box.
- Live tiles a bit smaller; BWC has more room.
- Recent 12 unchanged. Polling still 6 + rotate. Map popup + Alert field unchanged.
