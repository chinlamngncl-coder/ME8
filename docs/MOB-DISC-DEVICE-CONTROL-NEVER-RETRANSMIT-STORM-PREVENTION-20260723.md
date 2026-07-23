# MOB DISC — Never again: DeviceControl retransmit storm (prevention)

**Date:** 2026-07-23  
**Status:** LOCKED after operator **PASS** — 1 click → 1 shot  
**Fix that passed:** `DEVICE-CONTROL-SIP-NO-RETRANSMIT-STORM-V1`  
**Proof:** `MOB-DISC-SNAPSHOT-143-ACK408-AND-WALL-ICON-MOJIBAKE-20260723.md` (01:43: 1× sent → timeout → late 408)

**No APPLY from this disc** unless you name a follow-up (rule file / lint / other MESSAGE paths).

**Cursor rule APPLIED 2026-07-23:** `DEVICE-CONTROL-ONCE-CURSOR-RULE-V1` → `.cursor/rules/me8-device-control-once.mdc`  
**Who/how plain English:** `MOB-DISC-DEVICE-CONTROL-PREVENTION-WHO-AND-HOW-20260723.md`

---

## What happened (plain English)

You clicked Snapshot **once**. Fleet logged **one** send. The BWC still felt like **~6** shots.

Not a “crazy button.” Not WVP inventing TakePicture.  
**sip.js** kept **re-sending the same SIP MESSAGE** on UDP (Timer E) until it gave up (~32s → 408). Some cameras treat **each copy** as a new shutter.

**PASS now:** default path is **`udp_once`** — one datagram, no Timer-E storm.

---

## Yes — there is a preventive method

Prevention is **three layers**. All must stay true.

### Layer 1 — Code invariant (already in product)

| Rule | Detail |
|------|--------|
| DeviceControl default = **`udp_once`** | `lib/deviceControl.js` — never go back to `sip.send` txn for TakePicture / Record / Lock / … without a named MOB |
| Escape hatch is **lab-only** | `FM_DEVICE_CONTROL_SIP_TXN=1` restores the dangerous path — **do not** set in lab `.env` for normal use; **never** ship customer packs with it on |
| Logs must show mode | `device control sent` includes `mode:"udp_once"` — if you see `mode:"sip_txn"` in normal lab, something flipped the hatch |

**Agent must not “helpfully” switch DeviceControl back to `sip.send` for “better reliability” without you saying APPLY.** Reliability that multi-fires the shutter is not reliability.

### Layer 2 — Agent / MOB rules (how we work)

Before any MOB that touches **SIP MESSAGE to the BWC** for a **one-shot command** (TakePicture, Record, StopRecord, Lock, Unlock, Reboot, ShutDown, …):

1. Ask: **Is this command idempotent on the device?**  
   - **No** (shutter / start record / reboot) → **must not** use sip.js non-INVITE client transaction over UDP.  
   - **Yes** (group config refresh, status query) → txn retransmit is often OK.
2. Prefer **`deviceControl.sendDeviceControl`** (or a shared helper) — do **not** invent a second TakePicture path via raw `sip.send`.
3. After change: one click in log must show **one** `device control sent` with `udp_once`, and operator **one** physical effect.
4. ACK-TRACE taught us: **one log line ≠ one wire copy** when using the txn stack. Prove with `mode` + operator feel.

### Layer 3 — Regression tripwires (ops + agent)

| Tripwire | Action |
|----------|--------|
| Operator says “1 click → many shots/records” again | Agent counts `device control sent` **and** checks `mode`. If `udp_once` and still multi → **device firmware / burst**, not Timer E. If `sip_txn` → hatch or regression — fix immediately |
| Late **408** on DeviceControl again | Strong sign someone re-enabled txn path |
| New MOB adds `sip.send({ method: 'MESSAGE', … TakePicture` outside `deviceControl.js` | **Forbidden** without APPLY naming that file |

---

## What is still allowed to use `sip.send` MESSAGE

These are **not** the same bug class (usually safe / expected to retry):

| Path | Why different |
|------|----------------|
| PTT group XML (`pttServer` / SOS team) | Config push — retransmit often OK |
| FR field alert text MESSAGE | Soft notify — not shutter |
| INVITE / Call / group call | Different transaction type; needed for call setup |

**Do not** “fix” those by blindly forcing udp_once without a disc — wrong medicine.

**Do** apply the same **thinking** if any new MESSAGE is a **one-shot execute** on the cam.

---

## Optional future APPLYs (only if you want them later)

| Phrase | What it does |
|--------|----------------|
| `MOB-APPLY DEVICE-CONTROL-ONCE-CURSOR-RULE-V1` | Cursor rule: never txn DeviceControl; never `FM_DEVICE_CONTROL_SIP_TXN=1` in ship env | **APPLIED** 2026-07-23 |
| `MOB-APPLY DEVICE-CONTROL-ONCE-SMOKE-V1` | Tiny automated check: `sendDeviceControl` default mode === `udp_once` (unit/smoke) |
| Disc-only review of other MESSAGE one-shots | Only if a new multi-fire appears on a non-DeviceControl command |

Default recommendation: **PASS is enough tonight.** Layers 1–2 already prevent the nonsense if agents obey APPLY rules. Add a Cursor rule only if you want it carved in stone in `.cursor/rules`.

---

## Locked product facts

- WVP handoff stays ON — this was **not** fixed by turning WVP off.  
- Contact may stay `wvp_register_peer` — path is fine; **send mode** was the bug.  
- Icons / Call Groups / GPS are separate genres.

---

## One-line memory for every future session

**One-shot BWC commands = one UDP MESSAGE (`udp_once`). Never sip.js Timer-E for TakePicture/Record/Lock family.**
