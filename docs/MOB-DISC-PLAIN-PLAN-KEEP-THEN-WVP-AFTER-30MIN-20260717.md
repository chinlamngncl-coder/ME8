# MOB DISC — One plan (plain English) · 30‑min dual Soft Open log · keep work · WVP/ZLM later

**Date:** 2026-07-17  
**Status:** DISC — paper only — **no code / no revert until you APPLY**  
**Log checked:** `storage/fleet.log` + SIP proxy log (now)

---

## 1) Your 30‑minute both‑BWC run — what the log says

**Verdict: PASS for this soak (picture path stayed on WVP→ZLM).**

| Fact | Log |
|------|-----|
| Both cams | Chin `…0008` + kk `…0009` |
| Started Soft Open / WVP‑ZLM | ~**21:52:22** — `live broker wvp-zlm primary` for **both** |
| Clean stop | ~**22:22:39** — Soft Open stop bridge + `stopPlay` **ok** for **both** (~**30 minutes**) |
| Path | `source: wvp-zlm`, FLV on `192.168.1.38:18088` (real LAN — not 172) |
| SIP proxy | Kept mapping Chin → `192.168.1.131`, kk → `192.168.1.132` |
| After stop | Both still answering status; proxy still healthy |

**Notes (honest, not fail):**

- Earlier tonight (~21:09) there were **Busy Here 486** on kk when opens overlapped — classic “cam already busy,” not “ZLM dead.”
- Chin had a couple of **stop → reopen** blips mid‑soak (~21:55, ~21:59); the long dual stretch that matches your “30 min both” is **21:52 → 22:22**.
- Log cannot see your screen. **You** still say if picture stayed good the whole time. Server side: WVP‑ZLM primary + clean dual stop = good.

**This soak proves:** WVP + ZLM **can** run both BWCs for ~30 min.  
**It does not prove:** Soft Open UI patches are safe for SOS / PTT / normal live forever (those still got hurt earlier).

---

## 2) What we need to do (so few days’ work stays good)

Think in **three boxes**:

### Box A — Keep forever (hard work)

- Seeta **redact** new UI + FR (Seeta) — already in local git commit `0dc4486` (**not pushed yet**)
- Windows **service** install scripts, ZLM pack files, WVP **LAN/proxy** helpers (still mostly only on this PC)
- Earlier WVP lab on GitHub (`f104cfa`)

### Box B — Soft Open UI storm (hurt live / SOS feel)

- Dirty changes to wall / player / reopen storms — **undo later**, carefully  
- **Do not** throw away Box A while undoing Box B

### Box C — Put WVP/ZLM back the right way (later)

- Use tonight’s **proof** (30 min both on WVP‑ZLM)  
- Build a **clean** path on a **stable** normal dashboard  
- **Do not** replay Soft Open band‑aid patches

---

## 3) So later WVP/ZLM tests don’t break other functions

**Rule:** Fix the house first, then add the new room.

1. **Save** Box A on GitHub (push) + save ops/WVP helpers (second safety commit).  
2. **Run normal Fleet** (Soft Open off) and check: live, wall, pin, **SOS**, **PTT**, call, redact, FR.  
3. Only when that feels normal → turn WVP/ZLM back on as a **clean lab/MVP**, one step at a time.  
4. Every WVP/ZLM test ends with a short **function check** (SOS / PTT / stop video / redact still OK).

That way you are not testing WVP/ZLM on a broken Soft Open UI pile.

---

## 4) The whole plan in plain English

### Goal

Keep the last few days of Seeta redact / FR / service / WVP plumbing.  
Stop Soft Open from wrecking daily ops.  
Later bring WVP/ZLM back using what already worked for 30 minutes on both cams.

### Steps (you say APPLY for each — we do not freestyle)

| Step | In plain English | You say roughly |
|------|------------------|-----------------|
| **1. Save redact/FR** | Push the safety commit to GitHub so Seeta work cannot vanish | `MOB-APPLY lab-git-push-safety-fr-redact` |
| **2. Save other keep files** | Commit service + WVP LAN/proxy + ZLM pack (not Soft Open wall mess) | `MOB-APPLY safety-commit-keep-ops-wvp-infra` |
| **3. Normal mode** | Soft Open **off**. Use normal live. You check SOS / PTT / wall / live | Soft Open OFF (or named APPLY) |
| **4. Undo Soft Open mess only** | Put wall/player Soft Open storm files back from git — **do not** wipe redact / do not use old July‑6 gold | `MOB-APPLY git-restore-softopen-storm-files-only` |
| **5. Confirm house is OK** | You: open live, SOS, PTT, redact once — pass/fail | (you test) |
| **6. WVP/ZLM back (clean)** | Turn lab WVP/ZLM on again using the good path (proxy + LAN + ZLM) — **not** Soft Open patch pile. Re‑soak both cams; then re‑check SOS/PTT | named MVP APPLY later |

### What we will **not** do

- Wipe the PC with Firmware Gold / Pre‑Gate‑C as the default  
- `git reset --hard` and lose untracked keep files  
- Blind‑restore `index.html` / `server.js` (redact lives there)  
- More Soft Open UI band‑aids on live/wall/SOS/PTT  
- Mix “save work” and “undo Soft Open” in one blind step  

---

## 5) One picture

```text
TONIGHT:  30 min both cams on WVP→ZLM  →  PROOF (keep the lesson)

NOW:      Save Seeta/FR (+ ops/WVP helpers) on git
          Soft Open OFF → normal Fleet must feel OK
          Undo Soft Open UI storm only

LATER:    Put WVP/ZLM back clean on that stable base
          Test picture + always re-check SOS / PTT / redact
```

---

## 6) One line

**Log: ~30 min dual Soft Open on WVP‑ZLM then clean stop = PASS; next save hard work on git, return to normal ops, undo Soft Open UI only, then bring WVP/ZLM back clean so other functions stay working.**
