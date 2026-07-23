# MOB DISC — Google “headless companion APK” on BWC (no APPLY)

**Date:** 2026-07-15 ~01:59  
**Status:** **DISC ONLY — zero APPLY, zero APK work, zero server hooks from this note**  
**Paste theme:** Silent Android service beside vendor GB28181 APK — Accessibility SOS override, BatteryManager poll, optional second SIP audio client  
**Tone:** Knowledge share. Google is creative; **feasibility on real enforcement cams is harsh.** Do not treat as next sprint.

---

## Bottom line (one breath)

**Do not build this as ME8 product path right now.**  
It fights OEM locks the same way “GB + private SDK” did — different weapon, same war.  
Keep SOS / telemetry / intercom on **GB28181 + our Fleet server** (what we control). Companion APK = **last-resort OEM negotiation / lab experiment**, not “tiny silent APK and we regain total control.”

---

## Score each directive (honest)

### 1) AccessibilityService SOS override

| Google claim | Reality on BWCs |
|--------------|-----------------|
| Accessibility sits above apps; intercept OEM key; HTTP POST SOS | On **phones**, sometimes. On **locked bodycams**, often **false**. |
| No root needed | Still needs: install APK, enable Accessibility (settings UI), often **OEM whitelist**, may be **disabled by device owner / kiosk**, wiped on vendor upgrade |
| Bypass vendor eating KeyEvent | Many OEMs bind SOS in **native / firmware** before Android apps see it; Accessibility never gets the code |
| Don’t use SIP — HTTP POST | Architecturally fine *if* the service actually sees the key |

**Risk:** Google Play / enterprise policy hostility to Accessibility abuse; battery; false SOS; “assists” that OEMs ban in tender.

**ME8 today:** SOS already rides **GB / Invite / our stack** when cam mode works. Fix vendor **call lock** by ops (GB-only) + vendor ticket — not a shadow keylogger.

### 2) BatteryManager / StatFs telemetry every 60s

| Google claim | Reality |
|--------------|---------|
| Native BatteryManager more reliable than DevStatus XML | Partly true **if** companion runs and network works |
| Bypass SIP MESSAGE DevStatus | Duplicates path; two sources of truth unless Fleet merges carefully |
| Worker / AlarmManager | Doze / OEM kill / “battery optimization” often **sleeps** silent apps without whitelist |

**ME8 today:** DevStatus / battery already in GB MESSAGE path (protocol book). Improve **parse + UI** first if telemetry is bad — cheaper than second APK.

### 3) Second SIP client (Linphone/PJSIP) “1001-audio”

| Google claim | Reality |
|--------------|---------|
| Audio on companion, lens stays off | Nice on paper; **two registrations** per physical unit = SIP chaos on WVP/Fleet, license counts, NAT, PTT cross-talk |
| Different extension | Needs provisioning model, auth, dialplan — new genre |
| Leave proprietary video app dormant | Operator still needs video path; dual-app ops worse than one GB cam |

**ME8 today:** Voice/PTT on Fleet SIP is **Firmware Gold–adjacent**. Do **not** invent a second Android SIP stack beside it without a named product decision.

---

## Constraints Google underplays

```
No root / no custom ROM
    │
    ├─ USB sideload may be blocked (MDM / vendor)
    ├─ Auto-start on boot often needs OEM permission / sticky notification (not truly zero-UI)
    ├─ Accessibility enable is a SETTINGS screen (user/OEM step)
    ├─ Vendor OTA may remove companion
    └─ Tender: “unsigned companion APK on duty cams” = security review fail risk
```

“Zero UI + auto start + no root” on closed 执法仪 is often **mutually exclusive** without OEM blessing.

---

## Relation to prior discs

| Disc | Link |
|------|------|
| Vendor private mode can’t stop video | Don’t marry OEM stack — companion is another marriage |
| SDP AVP vs I-frame AES | Crypto still needs vendor under **GB**, not a Kotlin workaround |
| Security harden before ship | Companion APK = **new attack surface** (HTTP SOS, token on device) — expands ship gate |

---

## If ever revisited (parked names — not now)

Only after **OEM written allow** (install + Accessibility + battery whitelist) or a **lab throwaway cam**:

| MOB | Job |
|-----|-----|
| `mob-bwc-companion-lab-spike` | One cam: boot service + heartbeat HTTP to Fleet — prove install survives reboot |
| `mob-bwc-companion-sos-a11y` | Only if spike PASS **and** keycode confirmed on that hardware |
| `mob-bwc-companion-telemetry` | Battery JSON — merge with DevStatus carefully |
| `mob-bwc-companion-sip-audio` | **Last** — highest mess |

Default recommendation: **park indefinite**. Prefer:

1. Cam **GB-only** for live  
2. Vendor fix for SOS-during-video / stop-video  
3. Server-side DevStatus hardening  
4. AES under pure GB (vendor doc)

---

## What we tell Google

```
Companion Accessibility APK is a phone-centric idea.
Locked BWC firmware often never exposes SOS KeyEvents to Accessibility.
Dual SIP (video app + companion) pollutes GB28181 identity model.
ME8 will not bypass OEM locks with a sideloaded silent APK as product architecture.
Escalate hardware button + stop-preview to vendor; keep Fleet on standard GB28181.
```

---

## One line

**Headless companion APK sounds powerful and is mostly a trap on locked BWCs — park it; fix GB path + vendor, don’t bypass OEM with Accessibility/SIP-twin.**
