# MOB DISC — Put WVP/ZLM plan back now? Risk analysis

**Date:** 2026-07-18  
**Status:** DISC — paper only — **no flags / no code until named APPLY**  
**Ask:** “OK. What is next? Shall we put our WVP/ZLM plan in now? Risk analysis. Will it break everything?”

**Search:** `WVP ZLM return risk`, `classic PASS floor`, `Soft Open frozen`, `will it break`

**Prior locks:**

- Classic PASS: `MOB-DISC-CLASSIC-FLEET-PASS-20260718.md`
- Floor backup: `baseline/2026-07-18-classic-pass/` + restore phrase `RUN RESTORE-ME8-CLASSIC-PASS-20260718`
- Plan steps: `MOB-DISC-PLAIN-PLAN-KEEP-THEN-WVP-AFTER-30MIN-20260717.md` (step 6)
- Soft Open UI frozen: `MOB-DISC-SOFTOPEN-STOP-UI-PATCH-FOCUS-WVP-ZLM-20260717.md`
- Must not sacrifice wall/FR: `MOB-DISC-WVP-ZLM-MUST-NOT-SACRIFICE-WALL-FR.md`

---

## Short answers

| Question | Answer |
|----------|--------|
| What is next? | **Clean WVP/ZLM lab return** — but only as a **named APPLY**, one thin step, Soft Open UI still frozen |
| Shall we put the plan in **now**? | **Yes, we can start** — floor is ready. **Not** “flip all flags and hope.” |
| Will it break everything? | **No, not if done clean.** **Yes risk** if we turn Soft Open UI storm + broker-prefer-WVP + presence on at once |
| Safe rollback? | **Yes** — `RUN RESTORE-ME8-CLASSIC-PASS-20260718` then restart + hard refresh |

---

## Where we are (gates already done)

| Gate | Status |
|------|--------|
| Soft Open UI freestyle | **Frozen** |
| Classic Fleet soak (WVP lab off) | **PASS** |
| Classic-PASS baseline + GitHub wrappers | **Done** |
| ~30 min dual cam on WVP→ZLM (earlier proof) | **Picture path can work** — does **not** prove SOS/PTT/ops forever on Soft Open pile |

House is OK. New room can be added carefully.

---

## What “put WVP/ZLM plan in” must mean

### Clean path (recommended)

1. Keep **classic Ops UI** (no Soft Open band-aid genre).  
2. Bring up **infra only** first: WVP proxy + ZLM on LAN (`192.168.1.38` — never 172).  
3. Optional: **lab tile / API** with `FM_LAB_WVP=1` for play/soak — **not** forcing every wall pin through Soft Open chrome.  
4. BWC register to WVP SIP when testing that path (or dual topology you already proved) — **one cam first**, then dual.  
5. After each step: **function check** — live stop, SOS, PTT, Call, pin, redact/FR.  
6. If ops feel dies → restore classic-PASS floor. **Stop.** Do not Soft Open-patch out of it.

### Dirty path (forbidden without you naming Soft Open again)

- Flip `FM_LAB_WVP=1` + Soft Open–only + presence + wall/player patches in one night  
- Resume Soft Open UI MOB pile (pin/stop/fan/zombie)  
- “Fix” SOS/PTT by more Soft Open chrome  

That path **did** break ops feel before. Classic PASS exists so we do **not** repeat it.

---

## Risk matrix

| Risk | How it breaks | Likelihood if clean | Likelihood if Soft Open storm | Mitigate |
|------|---------------|---------------------|-------------------------------|----------|
| **Live panel black / wrong path** | Broker prefers `wvp-zlm` while cam still on Fleet `:5062` or ZLM down | Medium | High | Topology match; fail-open keep; one flag step |
| **Busy Here 486 / dual open fights** | Two startPlay / herd invite | Medium (known) | High | One startPlay; clean stopPlay; one cam first |
| **SOS / PTT feel regression** | Soft Open / lab live couples wrong mute, reopen, presence | Low–med if flags thin | **High** (already seen) | Soft Open UI **stays frozen**; function check every step |
| **Pin / wall / Open All** | Player path swap, user-stop sticky, dock | Low if no Soft Open UI | High | Do not touch gold pin cores; no Soft Open chrome MOB |
| **FR / redact stream** | Wrong FLV / black feed to sidecar | Medium | Medium | Post-check after media stable (`WVP-ZLM-MUST-NOT-SACRIFICE-WALL-FR`) |
| **Presence / online dots wrong** | `FM_WVP_FLEET_PRESENCE` vs Fleet SIP | Medium | Medium | Presence APPLY separate from picture APPLY |
| **Latency ~8–10s** | Known Gate B park — not “broken,” not wall-speed | Expected for proxy path | Same | Do **not** chase buffer tweaks; separate latency MOB later |
| **Ship / customer pack** | Lab flags leak into pack | Low if ship gate | — | Never ship `FM_LAB_WVP` / Soft Open as default |

---

## Will it break everything?

**No — not automatically.**

Turning WVP/ZLM on as **infra + thin lab** on a classic-PASS tree usually hurts **lab live picture path** first, not the whole product forever — and you have a one-phrase restore.

**It can feel like “everything broke”** if:

1. Broker chases WVP while Chin/kk still live on Fleet 5062, or  
2. Soft Open UI genre reopens and we patch pin/SOS again, or  
3. Presence + Soft Open–only + primary WVP flip together with no soak gate.

Those are **operator/process** risks, not “ZLM deletes the PC.”

---

## Recommended next APPLY shapes (you pick one name later)

Paper only until you paste APPLY:

| Order | Proposed name (example) | Scope |
|-------|-------------------------|--------|
| 1 | `mob-wvp-zlm-infra-up-classic-floor` | Start WVP+ZLM containers/services; prove LAN ports; **flags still classic off** if possible |
| 2 | `mob-wvp-zlm-lab-tile-or-broker-thin` | Thin lab play path (tile and/or broker) — **no Soft Open UI pile** |
| 3 | Soak Chin only → then dual | Picture + stopPlay clean |
| 4 | Function gate | SOS / PTT / Call / pin / redact once each |
| 5 | Optional presence split | Only if online dots need WVP — **separate** APPLY |

Do **not** combine 1–5 into one blind APPLY.

---

## What we will not do “now”

- Auto turn `FM_LAB_WVP=1` without your APPLY text  
- Restore Pre-Gate-C or Firmware Gold for this experiment (wrong floor)  
- Soft Open UI freestyle  
- Promise wall ~2s latency in this return (still parked)  
- Call it ship-ready because lab picture works  

---

## Verdict

| | |
|--|--|
| **Ready for WVP/ZLM return?** | **Yes — floor + plan + proof exist** |
| **Start tonight?** | OK if you want — **one named thin APPLY**, not full Soft Open |
| **Break everything?** | **Unlikely** if clean + restore ready; **likely ops pain** if Soft Open storm returns |
| **Next word from you** | Named APPLY for step 1 (infra or thin lab) — or stay classic until you say |

**One line:** Classic floor is locked — we *can* put clean WVP/ZLM back now in thin steps; it will not automatically break everything, but Soft Open–style flag+UI pile *will*; restore phrase is the safety net.
