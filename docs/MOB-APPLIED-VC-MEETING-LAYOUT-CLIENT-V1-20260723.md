# MOB APPLIED — VC-MEETING-LAYOUT-CLIENT-V1

**Date:** 2026-07-23  
**APPLY:** `MOB-APPLY VC-MEETING-LAYOUT-CLIENT-V1`  
**Disc:** `MOB-DISC-VC-3-MODE-GOOGLE-AGREE-ARGUE-20260723.md`  
**Status:** APPLIED — operator PASS/FAIL pending  
**Scope:** Meeting layout/chrome only. LiveKit join / tokens / BWC ingress **unchanged**.

---

## What changed

| Piece | Change |
|-------|--------|
| Modes | **Speaker** (default) · **Operations** · **Focus** — seven toolbar buttons removed |
| Default | Speaker + vertical filmstrip (not equal gallery wall) |
| Share / BWC | Auto **Operations** (content ~72% + people strip) unless Focus locked |
| Chrome | Bottom always-visible **dock**: Mic · Cam · Layout(3) · Share · Mute all · Leave |
| Headers | Removed “Shared content / Participants” |
| Badges | Corner `#vc-stage-badge` (`LIVE ·` / `SHARING ·`) |
| Grips | Hidden |
| Focus | Full stage; **Esc** → Speaker |
| Overflow | `+N` on filmstrip when &gt;6 (no silent carousel as primary) |

## Files

- `public/js/conference-layout.js`
- `public/js/conference-hub.js`
- `public/js/vc-lazy.js` (cache)
- `public/index.html` (stage markup + CSS)
- `public/locales/en.json` (dock / mission labels)

**Cache:** `vc-lazy.js?v=20260723-vc-meeting-layout-client-v1`

## Not touched

Ops wall, pin, PTT, Evidence, Tactical, LiveKit server, WVP handoff.

## Operator smoke

1. Restart Fleet if needed. Hard refresh (Ctrl+F5).  
2. Video Conference → Join a room with 2+ people.  
3. **PASS look:** one large speaker + side strip; bottom dock; no equal tile wall; no “Shared content” header.  
4. Tap **Operations** (or share screen / BWC) → content large + strip.  
5. Tap **Focus** → one feed; **Esc** back to Speaker.  
6. Mic / Cam / Leave work from dock.

Say **PASS** or **FAIL** (which step).
