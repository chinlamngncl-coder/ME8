# MOB DISC — Use git commit/push — NOT old Firmware Gold / Pre-Gate-C

**Date:** 2026-07-17  
**Status:** DISC — plain  
**Ask:** Agent pushed old baselines (6 Jul / 14 Jul). User already has **commit + push**. Do not wipe to ancient snapshots.

---

## You are right

**Old baselines** (Firmware Gold 6 Jul, Pre-Gate-C 14 Jul) = emergency floor only.  
They are **not** the right first undo for Soft Open mess when you already **committed and pushed** newer work (FR, redaction, etc.).

Using those old restores **would** throw away a lot of later work. That was the wrong first offer.

---

## Right undo path

| Path | Use when |
|------|----------|
| **Git** (commit / push you already have) | Soft Open broke live/SOS — go back to a **good commit** before Soft Open storm |
| **Selective file checkout from that commit** | Only put back `video-wall.js` / Soft Open–hurt files; keep rest |
| **Full Firmware Gold / Pre-Gate-C** | Last resort only — whole tree ancient |

---

## What I will not do

- Push you into Firmware Gold / Pre-Gate-C as the default.  
- Freestyle restore / freestyle `git reset`.  
- More Soft Open patches.

---

## What you do next (you pick)

1. Tell me a **good commit** (message or hash) from before Soft Open broke things — or say **“last good push before Soft Open”** and I list recent commits for you to pick.  
2. Then you say exactly:  
   - `MOB-APPLY git-restore-live-from-<commit>` (only live files), **or**  
   - `git checkout <commit> -- <files>` after you approve the file list  

No restore script until you name it.

---

## One line

**Yes — use your git commits/push first; old baselines were the wrong default and would kill later FR/redaction work.**
