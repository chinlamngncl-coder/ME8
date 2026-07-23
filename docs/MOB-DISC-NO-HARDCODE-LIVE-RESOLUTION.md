# MOB DISC — Never hardcode live resolution (4K / 1080 / etc.)

**Status:** LOCKED 2026-07-17  
**Search:** `no hardcode`, `4k`, `1080p`, `device resolution`  
**APPLY note:** `mob-zlm-relay-fixed-output-size-v1` must obey this

---

## Rule

| Forbidden | Required |
|-----------|----------|
| Hardcode `1280x720`, `1920x1080`, `3840x2160` as the only output | **Probe** the live stream / device frame size |
| Assume all BWCs are 720p | Follow **this cam’s** width×height (even-aligned) |
| One global “fixed size” for all devices | Per-stream size from source |

If device is 4K today and 1080p tomorrow — output follows **probed** size (even W/H), not a constant in code.

---

## One line

**No hardcode res. Probe source. 4K and 1080 both OK.**
