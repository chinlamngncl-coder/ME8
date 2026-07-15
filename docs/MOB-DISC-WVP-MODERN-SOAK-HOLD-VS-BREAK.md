# MOB DISC — Modern WVP+ZLM soak: hold vs break (clarify)

**Date:** 2026-07-15  
**Clarifies:** `MOB-DISC-WVP-MODERN-SOAK-49MIN.md`  
**Status:** FACTS — wording only (no code)

---

## Plain words (read this first)

| Word | Meaning | This soak |
|------|---------|-----------|
| **Hold** | Stream stayed up in ZLM | ~**24 min**, then later ~**25 min** |
| **Break** | Stream gone (注销 → next 注册) | ~**1 min** (about **40–50 seconds**) |
| **Wall clock** | You watching the clock | ~**49–50 min** total |

**The break is ~1 minute — not 25 minutes.**

**25 minutes** = second **good** stretch after it came back.  
**24 minutes** = first **good** stretch before the break.

---

## Picture

```
23:08                    23:32              23:33                    23:58
  |------ HOLD ~24 min ------|-- BREAK ~1m --|------ HOLD ~25 min ------|
  live                       gone            live again                 stop
```

---

## Exact gap (the only “broke”)

| Cam | 注销 | next 注册 | Break length |
|-----|------|-----------|--------------|
| kk `…0009` | 23:32:05 | 23:32:49 | **~44 s** |
| chin `…0008` | 23:32:13 | 23:33:05 | **~52 s** |

So: broke for **under 1 minute**, then both ran again ~25 min until soak end.

---

## One line

**Broke once for ~1 min around the halfway mark; 24/25 are hold times, not break times.**
