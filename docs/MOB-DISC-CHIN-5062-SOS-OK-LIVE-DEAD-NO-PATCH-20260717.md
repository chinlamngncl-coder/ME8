# MOB DISC — Chin on 5062: SOS works, live panel/pin dead · no patching · PTT test

**Date:** 2026-07-17 ~23:06  
**Status:** DISC — **no Soft Open patches · no freestyle code**  
**You:** SOS works. Panel/pin live dead. Want PTT test. Can use `localhost:3988`? Angry — feel like months of work dead.

---

## Calm facts (not “everything deleted”)

| Still safe on GitHub | |
|----------------------|--|
| Seeta redact UI + FR | `0dc4486` pushed |
| Service / WVP infra pack | `9155950` pushed |
| Soft Open UI storm | already restored off wall |

**Not wiped.** Tonight is a **wiring / live-path mix** problem, not “3 months erased.”

---

## What actually happened (log)

### Good — Chin rekey worked for Fleet SIP

- Chin talks to Fleet **`:5062`** (`to …@192.168.1.38:5062`)
- DeviceStatus ONLINE from cam `192.168.1.131`
- **SOS works** = Fleet SIP + alarm path is alive  
  → **Not all dead.**

### Bad — live panel/pin

At **23:03:50** when you opened live on Chin:

1. Fleet did send classic video INVITE: `invite requested` / `pool invite sending` (UDP)  
2. Then UI/broker kept logging: **`live broker fallback` · `relay_inactive`**  
3. No healthy `wvp-zlm primary` for Chin after rekey (cam left WVP :5060)

**Plain English:**  
Cam is on **Fleet 5062** (SOS OK).  
Dashboard live still partly thinks **WVP/ZLM lab** (`FM_LAB_WVP=1`) → looks for ZLM relay → **relay inactive** → **black panel/pin**.  
That is **env + Soft Open leftover live path**, not “Fleet SIP never registered.”

**No Soft Open UI patching** will fix this cleanly. Next fix is **env classic** (named APPLY only) — turn lab WVP live preference **off** now that Chin is on Fleet.

---

## localhost:3988 for PTT?

| | |
|--|--|
| Dashboard in browser | `http://localhost:3988` **OK** on the **same PC** as Fleet (for clicking PTT / looking at UI) |
| Cam / PTT server address | Must stay **`192.168.1.38`** — cam cannot reach your PC as `localhost` |
| Do **not** put `localhost` on the BWC | Cam would talk to itself |

**PTT test now (no code):**

1. Open dashboard: `http://localhost:3988` **or** `http://192.168.1.38:3988` (same machine either is fine)  
2. Chin online (you have SOS already)  
3. Hold PTT on Chin row / pin — listen on cam / speaker  
4. Tell agent **PTT PASS** or **PTT FAIL**

PTT does **not** need live video to be worth testing. SOS already proved SIP; PTT is the next check.

---

## Why it “suddenly” feels dead

```text
Before Soft Open mess:  classic Fleet live (JSMpeg) + SOS + PTT
Soft Open months:       cams → :5060 WVP · live → WVP/ZLM · presence paint
Chin rekey tonight:     Chin → :5062 Fleet · SOS back
Live still broken:      FM_LAB_WVP=1 → broker still chases ZLM/WVP → black panel
```

Half-migrated = worst feeling. **Not** Gold wipe. **Not** redact gone.

---

## What we will **not** do tonight

- Soft Open UI band-aids on `video-wall.js`  
- Blind Firmware Gold / Pre-Gate restore  
- Freestyle “small fixes” without APPLY  
- Rekey kk until Chin live OR you explicitly say so  

---

## What you can do **right now** (no APPLY)

1. **PTT test** on `localhost:3988` (same PC) — report PASS/FAIL  
2. Leave Chin on **5062** (SOS is proof — keep it)  
3. Do **not** flip cam back to 5060 unless you want Soft Open picture again  

---

## Next APPLY (only when you say — env only, no UI patch)

Turns off WVP-lab live preference so classic Fleet picture can show for Chin:

```text
MOB-APPLY classic-fleet-live-env-chin-5062
```

Proposed (paper): `FM_LAB_WVP=0`, `FM_WVP_FLEET_PRESENCE=0`, keep Soft Open-only off → restart → hard refresh → retry **Chin live panel/pin**.

kk may look offline until rekeyed — expected.

---

## One line

**SOS works = Chin Fleet SIP OK; live black = lab still chasing WVP/ZLM (`relay_inactive`) — no patching; PTT OK on localhost:3988 on this PC; next is named env classic APPLY only.**
