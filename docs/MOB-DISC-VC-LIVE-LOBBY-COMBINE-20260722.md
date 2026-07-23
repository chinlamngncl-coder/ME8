# MOB DISC — Combine VC Live + Lobby into one screen

**Status:** APPLIED 2026-07-22 — awaiting operator PASS/FAIL  
**APPLY:** `MOB-APPLY VC-LIVE-LOBBY-COMBINE-V1`

---

## Plain English

| Today | Problem | Want |
|-------|---------|------|
| Tab **Live** | Mostly room picker + “Select a room…” — empty stage | One place to pick room **and** see who’s online |
| Tab **Lobby** | Separate page: officers/BWCs by group colour — also sparse alone | Same info **under** Live controls |
| Join meeting | Stage / in-meeting chrome takes over (not a second empty tab) | Keep that; pre-join page gets denser |

**Locked idea:** Drop the separate **Lobby** tab. Put lobby roster **on the Live screen** under Join controls. **Recordings** + **Settings** stay their own tabs.

---

## Target layout (pre-join)

```
Video Conference
[ Live ]  [ Recordings ]  [ Settings ]     ← Lobby tab gone

┌─ Live (combined) ─────────────────────────┐
│  Room picker · Join Room · controls…      │
│  ───────────────────────────────────────  │
│  Who’s online (by group colour)           │  ← was Lobby body
│  … chips / list …                         │
│  Hint: Select a room and tap Join Room    │
└───────────────────────────────────────────┘
```

**In meeting:** same as today — stage fills; hide the empty “waiting / lobby list” chrome so the meeting page stays clean (existing `vc-in-meeting` patterns).

---

## Why this is safe (your point)

- Lobby is **read-only presence** for inviting / seeing who’s online — not a second meeting engine.  
- Meeting UI already leaves the sparse pre-join look once you Join.  
- Combining fills the blank pre-join page; it does **not** change LiveKit room / MCU.

---

## Files (when APPLY)

| File | Change |
|------|--------|
| `public/index.html` | Remove Lobby nav button; mount lobby body inside `#vc-panel-live` (below controls / above idle hint) |
| `public/js/conference-hub.js` | Stop treating `lobby` as a separate panel; always refresh lobby block on Live; `showPanel('lobby')` → Live |
| i18n | Optional: rename tab to “Meetings” later — **default keep “Live”** unless you ask rename |
| Cache bust | `conference-hub.js?v=…` |

---

## Recommended MOB

**Name:** `VC-LIVE-LOBBY-COMBINE-V1`

### In scope
1. One **Live** tab = room controls + lobby roster.  
2. Remove **Lobby** from the hub nav.  
3. In-meeting: hide combined lobby block (no clutter on stage).  
4. Recordings / Settings unchanged.

### Out of scope
- VC Settings swap / firewall border (separate disc)  
- MCU / TURN / BWC ingress  
- Renaming product “Axiom”  

### Risk
**Low** — hub layout only. Join path stays on Live panel.

### PASS later
| # | Check |
|---|--------|
| 1 | No Lobby tab in nav |
| 2 | Live shows Join row **and** online-by-group list without switching tabs |
| 3 | Join room → meeting stage still works; list not in the way |
| 4 | Recordings + Settings still open |

---

## APPLY phrase

**`MOB-APPLY VC-LIVE-LOBBY-COMBINE-V1`**

Until then: disc only — no code.

---

## Related open VC disc

- `MOB-DISC-VC-SETTINGS-SWAP-AND-FW-BORDER-20260722.md` — form on top + firewall bottom line (separate APPLY).
