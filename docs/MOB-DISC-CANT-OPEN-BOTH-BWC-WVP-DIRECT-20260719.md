# MOB DISC — Can't open both BWCs (WVP direct :5060)

**Status:** DISC only — 2026-07-19 · no APPLY  
**Search:** Open All, both BWC, 408 invite, thin cams, presence green no video  
**Context:** Direct SIP bind PASS (Platform Connected); presence paint PASS

---

## Verdict

Green roster ≠ playable live. Cams REGISTER to **WVP :5060**. Ops live still fires **Fleet SIP INVITE** (classic pool / JSMpeg). Those INVITEs **408**. WVP `startPlay` already works for **both** IDs — Ops is not using that path for Open All / multi-live.

---

## Evidence (lab check)

| Check | Result |
|-------|--------|
| WVP devices online | `…0008` + `…0009` both `online=true` |
| `FM_WVP_FLEET_PRESENCE` | `1` → green dots from WVP API |
| `FM_WVP_THIN_CAMS` | **empty** → broker `tryWvpZlmPrimary` never runs |
| `FM_SOFTOPEN_WVP_ONLY` | `0` |
| WVP `startPlay` both | **OK** — FLV on `192.168.1.38:18088` |
| Fleet invite log | `invite requested` then **`invite failed {"status":408}`** (both cams) |
| Wall ZLM soft | **One-cam only** — Open All / multi-live **skips** mpegts soft overlay |

---

## Why both feel broken

```
Cam Platform Connected ──► WVP :5060 ✓
Ops green ────────────────► WVP presence poll ✓
Ops Open / Open All ──────► Fleet INVITE (:5062 path) ✗ 408
WVP picture (mpegts) ─────► needs thin allowlist + wall allows ZLM soft
                            Open All explicitly stays JSMpeg
```

1. **Split brain (locked by current flags):** presence reads WVP; live still tries Fleet.  
2. **Thin list empty:** clean GB→ZLM primary in broker is allowlist-gated.  
3. **Wall policy:** `wallZlmSoftUpgradeAllowed()` returns false when Open All / >1 wall cam — so even a working descriptor would not soft-mount for both.

---

## Not the cause (this check)

- Live cap (`FM_MAX_CONCURRENT_LIVE=8`) — not hit  
- SIP proxy — already removed; not required for this failure  
- WVP refusing both plays — API startPlay OK for both

---

## Direction (needs named APPLY — not done)

| Option | Intent |
|--------|--------|
| A | Set `FM_WVP_THIN_CAMS` to both IDs + allow multi-cam WVP/ZLM on wall (touches wall policy — Risk Analysis) |
| B | Broker: all WVP-online cams use `startPlay` primary without thin list (video broker only) |
| C | Dual-row: keep Fleet `:5062` for FFmpeg fallback contact; WVP for primary picture |

**One line:** Both cams are on WVP and playable via WVP API; Ops Open All still uses Fleet INVITE → **408**. Thin empty + Open All skips ZLM soft = no WVP picture for both.
