# MOB DISC — SOS signal live trace (NO APPLY) (2026-07-19 ~22:38–22:45 +08)

**Status:** DISC only — live log watch · **no code**  
**Subject:** `MOB-DISC-SOS-SIGNAL-TRACE`  
**Window start:** `2026-07-19T22:38:42 +08`

---

## Short verdict

**TCP REGISTER works. Hardware SOS Alarm never appeared on the watched path during this window.**

So the chain does **not** drop inside UbitronC2 Socket.IO emit — the Alarm never reached the proxy bridge (and therefore never reached `sos-alarm`).

---

## What was watched

| Stream | Source |
|--------|--------|
| Host SIP proxy | `storage/wvp-sip-lan-proxy.out.log` |
| UbitronC2 | `storage/fleet.log` (service Running on :3988 / :5062) |
| WVP | `docker logs me8-wvp -f` |

Cam under test (proxy): **`34020000001329000008`** peer `192.168.1.119` · **REGISTER/tcp**.

---

## Signal chain (observed)

```text
BWC (register tcp)
  → host :5060 wvp-sip-lan-proxy     ✅ REGISTER/tcp seen repeatedly
  → 127.0.0.1:15061 me8-wvp          ✅ 注册成功 / device online Redis ON
  → UbitronC2 presence paint         ✅ wvp fleet presence online (00008 + 00009)

BWC physical SOS button
  → SIP MESSAGE CmdType=Alarm on :5060   ❌ NOT seen in proxy log
  → alarm bridge → POST /api/lab/wvp/device-alarm   ❌ never fired
  → fleet "sip alarm" / "wvp alarm bridge"          ❌ none
  → Socket.IO sos-alarm                             ❌ none
```

---

## Answers to your three questions

| Question | Result |
|----------|--------|
| Did **WVP** receive SIP ALARM / Alarm MESSAGE? | **No evidence** in WVP logs in this window (only REGISTER / online). |
| Did **UbitronC2** intercept it? | **No** — proxy never logged `alarm bridge → ME8`; fleet never logged `wvp alarm bridge` / `sip alarm notify` / `sos-alarm pushed`. |
| Did UbitronC2 emit **`sos-alarm`**? | **No** — emit never ran because ingest never ran. |

---

## Where it drops

### A) Tonight’s watch window (~22:38–22:45)

**Drop = BWC never sent (or we never saw) SIP Alarm on `:5060`.**

Only `REGISTER/tcp`. No `alarm bridge` line. No fleet `sos-alarm`.

### B) Earlier same day (important — proves bridge path)

At **13:59:15Z** proxy **did** see Alarm for `…00009` and POSTed ME8:

```text
alarm bridge → ME8  path=/api/lab/wvp/device-alarm  status=401  cameraId=…00009
```

So when Alarm *does* hit the proxy:

1. Proxy intercept → **works**  
2. UbitronC2 ingest → **fails with HTTP 401** (auth/gate before `raiseDeviceAlarm`)  
3. Socket.IO `sos-alarm` → **never reached**

**Second drop (when Alarm exists):** ME8 `/api/lab/wvp/device-alarm` **401** — not Socket.IO, not frontend.

(Last successful classic Fleet `sos-alarm pushed` in fleet.log was **2026-07-18** via `sip_alarm` on Fleet SIP — different path.)

---

## What *did* work (same window)

- Proxy: continuous `REGISTER/tcp` for `…00008`
- WVP: `[注册成功]` + Redis device ON for `…00008`
- UbitronC2: presence online for `…00008` / `…00009`; Fleet SIP DeviceStatus queries (not Alarm)

---

## If you already pressed SOS

Then the drop is still the same: **Alarm never hit the wire we monitor.** Possible device-side causes (paper only):

- SOS not mapped to GB28181 Alarm MESSAGE on this firmware / platform
- SOS goes to another SIP home (not `:5060` / WVP)
- Alarm only after subscribe / other WVP config
- Wrong cam pressed (only `…00008` was hot on proxy)

Re-test: say when you press; we look again for `alarm bridge` / `sos-alarm pushed` in the same three logs.

---

## One line

**TCP register OK; SOS Alarm never reached proxy/WVP/ME8 in this watch — drop is upstream of the Socket.IO bridge.**
