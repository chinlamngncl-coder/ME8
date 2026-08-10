# MOB DISC — Weapon SOP: Ack, false positive, retrieve, sounds (2026-08-08)

**Status:** discuss only. No product edit until you `MOB-APPLY` a named piece.  
**Your screen:** washed-out frame → **knife**; police SUV → **gun**. Also: slow snap, many orange toasts, Ack questions, report / false-positive / retrieve, alarm sound options.

---

## 1. Knife? Gun? (accuracy — separate from SOP)

Yes — those are still **false alarms** from Track B.

| Hit | What it really is | Meaning |
|-----|-------------------|---------|
| **knife** on white blur | Bad / blown-out frame | Model guessing on junk pixels |
| **gun** on police SUV | Car / bar / gear again | Negatives train helped some, **not enough** |

**SOP cannot fix this.** More hard-negatives + retrain, and/or raise conf (band-aid), and/or skip ultra-blur frames later.

**Slow capturing:** separate MOB later (`WEAPON-SNAP-FASTER-V1` or poll/throttle tune). Not part of toast SOP. Note for queue.

---

## 2. One Ack — does it clear everything?

**Designed today (Weapon):**

- Hits wait in a **queue** (badge +N).  
- **Ack** = clear **this** toast only → show the **next** one.  
- It does **not** mean “wipe all alerts forever.”

**Why it can feel like “one click, all gone”:**

- Only one hit was pending, or  
- You Ack’d a few times quickly, or  
- Same camera kept refreshing one slot instead of many separate toasts.

**Recommended SOP (product change later):** keep **Ack = this one only**. Add a clear **Ack all** only if you ask for it (dangerous — easy to miss a real gun). Default: **never** silent-clear the whole pile with one button unless operator chooses “Ack all” on purpose.

---

## 3. Must they file a report today?

**No.** Weapon toast today = wake HQ + choose:

- **Ack** (seen / move on)  
- **Open Weapon**  
- **Show on map**  

No mandatory report. No false-positive button. No audit trail of “who Ack’d.”

---

## 4. What you asked for (plain)

| Idea | Meaning |
|------|---------|
| **False positive** button | Operator says “this hit is rubbish” → **no full report**; hit marked FP and closed |
| **Real weapon** | Operator does **not** press FP → goes to **report / keep / escalate** path (later: Keep evidence, Call backup) |
| **If they FP a real gun** | Their name/time is logged → **they own that mistake** (accountability) |
| **If they Accidental Ack** | Must still **find it again** (history / queue archive) — not gone forever |

Got it. That is a proper ops loop. **Not built yet.**

---

## 5. Suggested SOP (English, simple) — target after we build it

### When orange Weapon alert appears

1. **Look** at the toast photo (and time / camera).  
2. **Decide:** real weapon, or rubbish (car, blur, caption)?  

### If rubbish (false)

3. Click **False positive**.  
4. Optional short reason (Car / Blur / Other) — or skip reason in v1.  
5. Toast closes. **No** full incident report.  
6. System stores: who, when, cam, snap id, “FP”.  

### If real (or unsure)

3. Do **not** click False positive.  
4. Click **Open Weapon** or **Show on map** (see live).  
5. Click **Report** (or **Keep snap**) when we add it — creates a record.  
6. Then **Ack** when handled.  
7. Optional later: **Call backup** (PTT MOB).  

### If you Accidental Ack

8. Open **Weapon → Recent** (or new **Alert history**).  
9. Find the hit by time / camera.  
10. Open again → Report / FP / map as needed.  

### Ack all (optional, careful)

- Only use when you intentionally clear a storm of known rubbish.  
- Prefer FP on each, or “Ack all + mark batch FP” later — not silent delete.

---

## 6. Alarm sounds today (FR / ANPR / Weapon)

| Surface | Toast / blink | Operator-picked alarm sound? |
|---------|---------------|------------------------------|
| **FR** | Yes (HQ + toast) | **Partial** — code plays chime/beep by grade (soft vs blacklist). **No** Settings menu “pick siren A/B” for the operator |
| **ANPR** | Lab toast path | **No** dedicated alarm-sound picker found |
| **Weapon** | Orange HQ + toast | **No sound** today (visual only) |

### How we can do sound (recommended path)

1. **Shared HQ alert audio** (one small module): play a short sound when FR / ANPR / Weapon toast fires.  
2. **Settings → Alerts** (simple):  
   - Master: On / Off  
   - Per type: FR / ANPR / Weapon — On / Off  
   - Optional: volume + 2–3 tones (soft / strong) — not a music library  
3. Browser rule: first click on the page may be needed to unlock sound (same as other web audio).

Named later: `HQ-ALERT-SOUND-SETTINGS-V1` (after Weapon SOP pieces you care about first).

---

## 7. Arranged build order (one APPLY at a time)

| # | MOB | What |
|---|-----|------|
| A | More car/blur negatives + Colab + reload | Fight knife/gun rubbish at the model |
| B | `WEAPON-ALERT-HISTORY-RETRIEVE-V1` | After Ack, list still available to re-open |
| C | `WEAPON-FALSE-POSITIVE-V1` | FP button + who/when log; no full report |
| D | `WEAPON-HIT-REPORT-V1` | Real-weapon report / Keep path (accountability pair with FP) |
| E | `WEAPON-ACK-ALL-EXPLICIT-V1` | Optional Ack all — only if you want it, labeled clearly |
| F | `HQ-ALERT-SOUND-SETTINGS-V1` | FR/ANPR/Weapon sound on/off (+ simple tone) |
| G | `WEAPON-SNAP-FASTER-V1` | Address slow capture (after A or in parallel only if you say) |

**Recommendation:**  
Accuracy (A) and **retrieve + FP** (B then C) before fancy sounds.  
Sounds (F) after you can trust Ack/FP won’t lose hits.

---

## What you do now (no APPLY yet)

1. Say if this SOP shape is **PASS** (Ack = one; FP = no report; Report = real; History = retrieve).  
2. Pick **one** next APPLY from the table (recommend **B** or more negatives **A**).  
3. Live car/knife rubbish = still model problem until A improves.

Agent will not invent report/FP/sound in product until you name the MOB.
