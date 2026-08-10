# MOB DISC — PTT groups: many teams · scope · nearby outside your group (2026-08-09)

**Status:** Design / operator map. **No code this disc.** Soft PTT/group product path already marked done; this locks **how groups + SOS nearby fit together** so we don’t invent a third model.

---

## 1. Short answers

| Your question | Answer |
|---------------|--------|
| Many groups, or every user has their own? | **Many org groups** (North / SWAT / Traffic…). **Not** “one private PTT group per login.” |
| Super admin see all groups? | **Yes** — Super admin manages / can access **all** dispatch groups. Operators only see groups (and radios) in their **dispatch scope**. |
| PTT for tactical or when situation arises? | **Both** — standing **tactical** groups + **situation** nets (SOS nearby / alert backup). Different tools, same radio idea. |
| Nearby but not in my user group? | **SOS already covers that** — response team is **distance / online**, not “same map-group only.” Grey area / other team nearer → they can still be pulled into the **SOS PTT response team**. |

---

## 2. Two different PTT “teams” (do not mix words)

```text
A) DISPATCH / MAP GROUPS          B) SITUATION NET (SOS / alert)
   Settings → Groups                 Built when SOS (or later Weapon backup)
   Standing rosters                  Temporary for this alarm
   Tactical / shift / zone           Geography: nearby online BWCs
   Join from Ops “PTT groups”        Auto-find helpers (radius)
   Same group membership             Can CROSS map-group boundaries
```

| | **A — Dispatch group (tactical)** | **B — SOS response team (situation)** |
|--|-----------------------------------|----------------------------------------|
| Who defines | Super admin / setup (Groups) | Software: SOS cam + **nearby** online units |
| Membership | Named roster (can be multi-cam) | Whoever is in radius + online (+ scope rules) |
| When | Everyday / planned ops | When SOS (or similar crisis) fires |
| Cross-team? | Only if they’re **in that group** | **Yes** — nearer other-team unit can join the SOS net |
| Ops UI | Left **PTT groups** dropdown + Join | SOS banner / response summary / End response team |

That is why “nearby but not my group” is **not** a hole in A — it is **job of B**.

---

## 3. Many groups (org model)

```text
Agency
  ├─ Group: North patrol     ← many BWCs
  ├─ Group: South patrol
  ├─ Group: Traffic
  └─ Group: Tactical (optional)
```

- **One user** may belong to **one or several** groups (assignment), or only see cams in their scope.  
- **Not:** each dashboard login auto-owns a unique empty “my group.”  
- **Join group PTT** = put HQ + selected roster on one talk net for that session.

**Super admin:** create/edit all groups; see all members; join any for desk ops.  
**Operator:** only groups / devices their **dispatch scope** allows (same rule as Fleet / SOS strip / Cases).

---

## 4. SOS nearby (grey zone / other team nearer) — already the design

When SOS fires, ME8 looks for **nearby online units** (radius options, default ~500 m) to form a **response team** for PTT help — **not** “only same map-group.”

```text
        [ Team A boundary ]
              ·
    Officer A (SOS) ●───────── nearer Officer B (Team B)
              ·                    ↑
         grey area            SOS can still pull B
                              into response PTT team
```

| Rule | Lock |
|------|------|
| Nearby search | Geographic + online (SOS path already) |
| Map-group membership | **Not** required for SOS helper pull |
| Operator desk scope | Still respect who **this HQ user** may see/command |
| End of situation | **End response team** tears down B — does not delete Group A rosters |

So: tactical groups stay clean; crisis can **bridge** teams by distance.

---

## 5. What we are **not** saying

| Idea | Verdict |
|------|---------|
| Delete map groups; only nearby forever | **No** — need standing tactical nets |
| Auto-join every nearby radio on every alert forever | **No** for Weapon FP (already rejected); SOS response team is the controlled crisis path |
| One PTT group per user account | **No** — org groups + situation nets |
| Field BWC hears other field BWC mesh always | Separate later MOB if still needed (relay) — not this disc |

---

## 6. Product words (operator face)

| Say | Don’t say |
|-----|-----------|
| **PTT groups** (tactical / map groups) | “Your personal SOS log radio” |
| **SOS response team** (nearby help) | “Analytics SOS PTT” |
| Super admin: all groups | “Every user owns one group” |

---

## 7. Optional later APPLYs (only if you name them)

| APPLY | When |
|-------|------|
| `WEAPON-ALARM-BACKUP-PTT-V1` | Toast **Call backup** → alert net (human click; nearby / fixed-cam group) — already designed elsewhere |
| Clarify copy on Ops PTT box vs SOS response | If labels still confuse after strip rename |
| Field RX relay | Only if BWC↔BWC without HQ is still required |

**No APPLY from this disc alone.** Soft PTT/group done stays closed unless a **new** bug or named APPLY.

---

## 8. Decision

1. **Many** org PTT/map groups — not one-per-user.  
2. **Super admin** = all groups; operators = **scoped**.  
3. **Tactical** = Join group; **Situation** = SOS nearby response team (can cross teams).  
4. Nearby outside your group = **already SOS’s job** — keep that, don’t force them into standing group membership.
