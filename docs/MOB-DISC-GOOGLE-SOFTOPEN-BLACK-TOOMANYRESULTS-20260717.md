# MOB DISC — Soft Open FAIL: handoff pack for Google (2026-07-17)

**Status:** FAIL locked · paper for Google · **no new APPLY in this disc**  
**Operator symptom:** Pins Soft Open → UI **“Live streaming…”** but **black** (no picture). Chin + kk both.

**BWC typing (FINAL — do not confuse):**  
**Do NOT change BWC server IP.** Keep PC `192.168.1.38` · port **5060** · WVP domain/id/pwd.  
Doc: `MOB-DISC-BWC-NO-CHANGE-SERVER-IP-FINAL.md`

---

## 1. Exact failure (fleet.log ~15:27)

```
live broker fallback
  reason: wvp_startplay_failure
  wvpCode: 500
  msgZh: nested exception is org.apache.ibatis.exceptions.TooManyResultsException:
         Expected one result (or null) to be returned by selectOne(), but found: 2
```

Then: `zlm_relay_inactive` / Plan B idle → **no FLV picture**.

This is **WVP DB / channel query**, not “wrong BWC Wi‑Fi IP typed by operator.”

---

## 2. Root cause (checked in Postgres `me8-wvp-db`)

`wvp_device_channel` has **two rows per cam**:

| id | device_id | gb_device_id | name |
|----|-----------|--------------|------|
| 1 | …0008 | *(empty)* | chin |
| 2 | …0008 | …0008 | …0008 |
| 3 | …0009 | *(empty)* | kk |
| 4 | …0009 | …0009 | …0009 |

WVP `startPlay` uses `selectOne` → **found: 2** → HTTP 500 → Soft Open black.

Likely created/worsened by our SQL helper `patchWvpDbLanAndChannel` (INSERT channel when `gb_device_id` missing — old row had empty `gb_device_id`, so a **second** row was inserted).

---

## 3. Secondary mess (hostAddress fight)

| Fact | Detail |
|------|--------|
| Real cam LAN (map) | Chin `192.168.1.131:46133` · kk `192.168.1.132:33881` |
| After real-LAN MOB | Briefly patched to those |
| Minutes later | Proxy loop still logged **`wvp invite route via SIP proxy`** → host back to **`192.168.1.38:5060`** |
| Now (~15:29) | WVP shows both **online** but host again **PC :5060** |

Cause: **SIP proxy Node process** was started **before** real-LAN MOB and still runs **old** `syncLanSourceIps` (patches to PC). Fleet may be new; **proxy not restarted**.

REGISTER peer WVP sees: often **`172.21.0.1`** (Docker SNAT), not cam LAN — that is why a map/patch exists at all.

---

## 4. What we already did (inventory — honest)

| MOB / action | Intent | Result |
|--------------|--------|--------|
| Fleet SIP → **5062**, WVP GB proxy **5060** | Free 5060 for WVP | Ports OK; BWC one-row → WVP |
| Mirror REGISTER OFF | Real cam register to WVP | OK direction |
| `mob-fleet-presence-from-wvp-v1` | Axiom online from WVP poll | Works **when** WVP online |
| `mob-wvp-hostaddress-real-lan-v1` | WVP INVITE real cam LAN | Patched once; **reverted by old proxy sync**; Soft Open still died on **TooManyResults** |
| Soft Open UI | Shows “Live streaming…” | **Misleading** — broker already fell back; black tile |

**Agent over-promised “~15s online” earlier.** Presence ≠ picture. Apology locked in prior disc.

**No git commit** for this genre unless operator orders.

---

## 5. Lab stack (current)

| Piece | Value |
|-------|--------|
| PC LAN | `192.168.1.38` |
| Dashboard | `:3988` |
| WVP HTTP | `:18080` · ZLM modern `:18088` |
| Host SIP proxy | **5060** → container `15061` |
| Fleet SIP | **5062** |
| WVP platform (BWC) | domain `4401020049` · id `44010200492000000001` · pwd `admin123` |
| Device ids | Chin `34020000001329000008` · kk `…0009` |
| FM_LAB_WVP | `1` |

---

## 6. Ask Google (copy block)

**Problem:** Soft Open black. WVP `startPlay` returns 500: MyBatis `TooManyResultsException` — `selectOne` found **2** channels per device. Postgres shows duplicate `wvp_device_channel` rows (one with empty `gb_device_id`, one with gb id = device id).

**Also:** Cam REGISTER reaches WVP via Docker hairpin `172.21.0.1`. Host SIP proxy on 5060. We tried setting `host_address` to real LAN `192.168.1.131/132` so INVITE/keepalive hit the BWC; proxy sync also fights to set host to PC `192.168.1.38:5060`.

**Need:**
1. Correct way to **dedupe channels** (keep which row?) so `startPlay` returns one channel / FLV URL.  
2. Correct **hostAddress** for Docker Desktop + host SIP proxy: real BWC LAN vs proxy signal — so INVITE reaches cam and keepalive does not false-offline.  
3. Whether TCP-PASSIVE + ZLM `me8-zlm-modern` path is right after channel fix.

**Do not** tell operator to put two SIP servers on the BWC (hardware has one row only).

---

## 7. Suggested next MOBs (operator says APPLY one at a time)

1. **`mob-wvp-dedupe-channels-v1`** — delete duplicate channel rows (keep one); stop INSERT creating doubles; prove `startPlay` ≠ TooManyResults.  
2. **Restart SIP proxy** after any hostAddress MOB (or bake version log) so old `via SIP proxy` patch dies.  
3. Re-prove Soft Open → log must show **`live broker wvp-zlm primary`** + real picture (not black “Live streaming…”).

---

## 8. Operator pass/fail (simple)

| Pass | Fail |
|------|------|
| Soft Open → real video | Black + “Live streaming…” |
| fleet.log: `wvp-zlm primary` | `wvp_startplay_failure` / `TooManyResults` |
| WVP channel count = 1 per cam | Still 2 rows |

---

## One line

**Black Soft Open = WVP startPlay 500 TooManyResults (2 channels) — not BWC IP typing; Google: dedupe channels + hostAddress under Docker proxy.**
