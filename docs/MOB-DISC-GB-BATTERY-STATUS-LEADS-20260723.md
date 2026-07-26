# MOB DISC — Battery from GB status? · GB+YDT vs GB-only · leads (research)

**Date:** 2026-07-23  
**Status:** DISC only — **no code** until a named `MOB-APPLY`  
**Ask:** Urgent — get battery when BWC is on GB (or WVP-homed GB). With **GB+YDT** battery appears; without YDT, often nothing. Video-off / PTT / SOS also hurt on split. Android APK — there must be ways. Research GB + online leads.  
**Related:** `MOB-DISC-STOP-BATTERY-PARITY.md` (kk 29% via `wvp-acl`; Chin no battery today) · `MOB-DISC-GOOGLE-DUAL-PROTOCOL-GB-YDT-WAKEUP.md` (M4 battery on YDT)

---

## Plain English (one verdict)

**Stock GB/T 28181 `DeviceStatus` does not require battery.** Official examples only carry Online / Status / Encode / Record / DeviceTime / Alarmstatus.  

When you see battery on **GB+YDT**, it is almost certainly coming from the **YDT / proprietary telemetry pipe** (or a vendor **extension** that only runs when that stack is on) — **not** from “true national-standard GB status.”  

So: there is **no free GB-only battery** guaranteed by the standard. Workarounds are: **keep YDT for telemetry**, **vendor extend DeviceStatus XML**, or **Android `BatteryManager` → our Fleet API** (companion / custom MESSAGE). Pure WVP ACL presence will keep showing `battery:null` when the device never puts % in the XML.

---

## What GB28181 actually says (status)

| Piece | Battery? | Typical fields |
|-------|----------|----------------|
| **DeviceStatus Query/Response** | **Not in core examples** | `Online`, `Status`, `Result`, `Encode`, `Record`, `DeviceTime`, `Alarmstatus` |
| **Keepalive Notify** | Usually **no** | `CmdType=Keepalive`, `Status=OK` |
| **Alarm Notify** | Optional GPS etc.; battery **not** required | Priority / Method / Time / Info |
| **Vendor extensions** | **Yes, if firmware adds tags** | `<Battery>`, `<BatteryLevel>`, nested `<Battery><Level>`, Chinese 电量, etc. |

Public write-ups (cnblogs / CSDN / Juejin DeviceStatus samples) match that — **no mandatory Battery node**. Marketing lines like “report battery over GB28181” mean **vendor product feature**, not the national schema.

**Refs (research):**  
- [DeviceStatus sample (cnblogs)](https://www.cnblogs.com/haibindev/p/17519260.html) — Online/Encode/Record/DeviceTime only  
- [GB queries overview (CSDN)](https://blog.csdn.net/weixin_33743880/article/details/94655779)  
- [Status Keepalive Notify (Aliyun)](https://developer.aliyun.com/article/1321784) — Status OK, empty Info — **no battery**  
- [Android overlay battery onto GB stream (51CTO)](https://blog.51cto.com/daniusdk/6944680) — `BatteryManager` → **watermark**, not SIP field  

---

## What our lab already proved

| Mode | Battery in log | Source |
|------|----------------|--------|
| **GB+YDT** (your observation) | Present | YDT / Fleet proprietary path historically |
| **WVP handoff / ACL** (2026-07-23) | kk: yes briefly (`wvp-acl` **29%** until 22:16); Chin: **none today** | Uneven — ACL only forwards what WVP/device puts in payload |
| Fleet SIP `DeviceStatus` **queries** | Storm of **sent**; few battery parses | Device often answers without battery tags |

Fleet already knows how to **parse** many battery aliases (`lib/telemetryFromXml.js` — Battery, BatteryLevel, RemainPower, 电量, nested Level, …). **Parser is not the bottleneck** when the wire has no %.

---

## Why GB+YDT “works” and pure GB “doesn’t” (product truth)

Locked dual-protocol idea (earlier disc):

| Pipe | Port (lab) | Job |
|------|------------|-----|
| **GB28181** | **5060** → WVP | Video INVITE / play |
| **YDT** | **5062** → Fleet | GPS, buttons, SOS/PTT signaling, **telemetry including battery** |

When you turn YDT off to “simplify,” you cut the pipe that actually carries battery (and often stop/SOS/PTT helpers). Video may still look fine on WVP; **Ops chrome dies**. That matches your urgent pain: **video off hard + no PTT/SOS** when dual stack is unhappy — and **no battery** when YDT is gone.

---

## Leads / workarounds (ranked — one product direction)

### Recommended path (ops reality)

**Keep GB+YDT for telemetry + buttons; GB video on WVP.**  
Battery and stop/SOS/PTT are **YDT/Fleet problems**, not “parse harder GB DeviceStatus.”  
Finish **YDT → WVP stop bridge** (so physical video-off still works) instead of hunting battery inside empty GB XML.

### Lead A — Prove the wire (30 min, no invent)

1. Soft Open / live with **GB+YDT** when battery shows.  
2. Save one raw SIP MESSAGE body that contained battery (Fleet log preview or Wireshark on **5062**).  
3. Same cam **GB-only** (or YDT off) — save DeviceStatus Response + WVP ACL payload.  

**Expect:** battery tags only on YDT / proprietary MESSAGE; GB DeviceStatus = Online/Encode only.  
That ends the “GB status must have battery” argument with evidence.

### Lead B — Vendor / firmware (Android BWC)

Ask vendor (or OEM APK owner):

1. When **GB-only**, do you inject `<Battery>xx</Battery>` (or Level) into **DeviceStatus Response** and/or periodic **Notify**?  
2. Is battery **YDT-only** by design?  
3. Can they enable a **config checkbox**: “report power on GB status”?  

Many Android BWCs use **`BatteryManager`** internally then only publish on the **private** protocol. Without vendor toggle, platform cannot invent %.

### Lead C — Our Android companion (we control APK path)

We already have companion telemetry hooks (`/api/bwc-companion/telemetry` → `mergeBatteryTelemetry`).  

**Idea:** small companion (or Accessibility / vendor SDK plugin) reads `BatteryManager.getIntProperty(BATTERY_PROPERTY_CAPACITY)` and POSTs `{ camId, battery }` to Fleet every N seconds — **independent of GB/YDT**.  

Works even when pure GB video to WVP. Does **not** require DeviceStatus XML. Closest to “Android definitely can do this.”

### Lead D — Extend SIP MESSAGE ourselves (if we own firmware)

If we can patch the BWC APK GB agent:

- On heartbeat / DeviceStatus answer, append vendor tags Fleet already parses.  
- Or periodic `Notify` with custom CmdType Fleet maps to battery.

Same as vendor ask — needs APK change.

### Lead E — Video watermark OCR (research only — **do not productize**)

Some Android GB SDKs overlay battery text on the video. Platform would OCR FLV frames. Fragile, laggy, ugly — **last resort lab toy**, not Axiom Ops.

### Lead F — WVP ACL already sometimes has battery

kk got `source: wvp-acl` 29%. Chin did not.  

If WVP UI / device catalog shows power for one cam:

- Confirm whether ACL JSON includes battery for Chin when kk does.  
- If XML/JSON has it and Fleet drops it → **translator bug** (APPLY later).  
- If WVP itself has null → device never sent it.

---

## Tie-in: video off / PTT / SOS when dual protocol hurts

Separate from battery, same architecture:

- Physical **stop video** often is **not** GB BYE to Fleet; needs **YDT/button → `wvpLab.stopPlay`** + UI `video-stream-stopped` (see stop/battery parity disc).  
- PTT TCP **29201** and SOS Alarm still need a **signaling marriage** to Fleet (YDT or Fleet SIP). Pure GB-to-WVP video does not replace that.

So the “workaround” for **usable Ops** is still: **dual protocol done right**, not “find battery inside standard DeviceStatus.”

---

## What agent can do next (only after APPLY)

| Named item | Purpose |
|------------|---------|
| *(no APPLY yet)* | You capture A: one battery-on vs battery-off raw XML (operator) |
| `MOB-APPLY BWC-COMPANION-BATTERY-POLL-V1` | If companion APK is allowed — Fleet poll/POST battery |
| `MOB-APPLY WVP-ACL-BATTERY-PRESERVE-V1` | Only if log shows ACL has % and UI shows — |
| `MOB-APPLY YDT-STOP-BRIDGES-WVP` / stop-UI parity | Video-off + chrome (already queued genre) |

**Do not** start another hybrid SIP private-extensions genre for battery.

---

## Operator — minimal ask

When convenient, one line is enough:

1. Battery on screen with **GB+YDT**? yes/no  
2. Same cam **YDT off** — battery? yes/no  
3. Optional: paste one log line `telemetry battery update` or SIP preview with `<Battery…>`

That confirms Lead A without a long session.

---

## One line

**GB DeviceStatus does not mandate battery; your % almost certainly rides YDT/vendor extension. Keep dual protocol or push Android BatteryManager via companion — do not expect pure GB status to invent power.**
