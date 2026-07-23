# Pin title: center words + bigger PATROL + long names OK

**Talk only. No code yet.**

---

## Understood

1. Words still look **too high** / not in the middle of the blue bar.  
2. **PATROL** should be a bit bigger — about the **same size as the name**.  
3. If the name is **long** or another **language**, nothing should cover or crush each other. The line must **flex** (name can shorten with …; id can shorten; PATROL stays readable). No fixed “42% name” style hard lock.

Picture size stays as it is. No play / video changes.

---

## Why center still looks wrong

Right now we only leave space on the **right** for − / ×.  
So the title centers in the **left leftover** — it looks **shifted left**, not in the middle of the whole bar.

Also the blue bar can look taller than the thin title row, so words still feel **high**.

---

## What we should do next

CSS only:

1. **True center:** same empty space left and right (room for − / × on both sides of the balance), so `kk · id · PATROL` sits in the **middle** of the bar.  
2. **Middle up-down:** title row height matches the − / × row; words and buttons share one middle line.  
3. **PATROL** font size = **name** size (keep PATROL blue).  
4. **Long name / other language:** drop the hard `max-width: 42%`. Use flex: name and id can shrink with ellipsis; PATROL does not get covered.

---

## When you want it

Say: **MOB-APPLY-PIN-TITLE-CENTER-V2**
