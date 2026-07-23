# MOB DISC — Plain English: what’s done, what’s next (2026-07-22)

**Status:** DISC only — no code change  
**For:** Operator — simple words, no jargon pile  
**Search:** `plain english`, `what is WVP`, `pin click`, `admin123`, `next MOB`

---

## 1) Case Files — you said PASS

| Thing | Status |
|-------|--------|
| Case list table (all columns, no sideways scroll) | **PASS** — ONE-VIEW-V5 |
| Open · Delete links | **PASS** |
| Back button, list scroll, form layout | **PASS** |
| Detail screen — two boxes, bottom line | **PASS** — BOX-CLOSE-V2 |

**Case Files genre: done for now.**  
No more table column MOBs unless something breaks again.

**Small optional later (only if officers ask):** one sentence on screen under “Linked evidence” — *“Paste the video ID from Evidence Library, not the case number.”*  
That is **`CASE-FILES-LINKED-EVIDENCE-HINT-V1`** — words only, 2 minutes. **Not required** if everyone already knows.

---

## 2) What is WVP? (simple)

**WVP is the video engine in the lab.** It sits **behind** Mobility Axiom — you do **not** run a second app for daily work.

| You use | What it is |
|---------|------------|
| **Mobility Axiom** (browser — map, Case Files, Evidence, SOS) | **Your product.** Login: your desk user (e.g. `global` + your password). |
| **WVP + ZLM** (Docker, background) | **Video plumbing.** Brings bodycam live video into the map wall and players. |

**“WVP stays on”** means: we **keep** that video engine. We **fix** map / wall / pin video inside **Axiom** — we do **not** throw away WVP or build a new app.

**“Finish Fleet surfaces”** = fix the **screens you already have** (map, wall, Command Wall, FR tiles) — not invent a new UI.

---

## 3) What is “click pin”? (simple)

**Pin** = the **camera dot on the map**.

| Words we used | What you do |
|---------------|-------------|
| **Click pin** | Click the **bodycam on the map** → small **video popup** should open with live picture. |
| **Open** (Case Files list) | Click **Open** on a row → open that **case file** to edit. **Different** — not map video. |
| **Open All** (map) | Button that opens **many** cams on the video wall at once. |

**Open MOB on the map (not done yet):**  
Today, video on the pin often only works **after** you already started video from the panel or Open All.  
**Goal:** click the map dot **first** → video works **without** that workaround.

**MOB name (when you want map work):** `PIN-CLICK-POPUP-OPEN-NO-DOCK-STORM-V1`  
**You do not need to APPLY this now** if you are not testing map video today.

---

## 4) admin123 — why we mentioned it (and why login is confusing)

**Two different logins. Not the same.**

| Login | Where | User / password | Who uses it |
|-------|--------|-----------------|-------------|
| **Axiom desk** | Your normal browser URL (e.g. `:8080`) | `global` + **your** password | **You — every day** |
| **WVP admin page** | Separate lab URL (e.g. `:18080`) — video server only | `admin` / `admin` or `admin123` | **IT / lab setup** — rarely |

**We have NOT changed your Axiom password in any MOB today.**

**`LAB-DEFAULT-CREDS-AND-IMAGE-PIN-V1`** is a **future pack-time** job: before sending software to a **customer**, replace obvious factory passwords on **Docker lab services** (WVP, LiveKit).  
It is **not** “fix admin123 so you can log in today.”

**If you cannot log in to Axiom right now:**

1. That is **desk login** — not the WVP admin123 topic.  
2. Use the user/password you always use for the **main** site.  
3. If that fails → say **what screen** (Axiom login vs WVP `:18080` page) and we diagnose **that** — separate from Case Files or map MOBs.

---

## 5) Valkey — one line

**Valkey** = optional speed helper for “where is the camera / last GPS.”  
**Not** your videos. **Not** Case Files. **Not** required to run the desk.  
**Legal cleanup already done** in compose — nothing for you to do.

---

## 6) Security — one line

**Node / npm packages:** cleaned — **0** known vulns in production deps.  
**Lab Docker passwords:** tidy before **customer ship** — not urgent for your daily desk login.

---

## 7) What is actually next? (pick one when ready)

**Nothing required tonight** if Case Files PASS is enough.

| When you care about… | Say this |
|----------------------|----------|
| Officers need hint text for Evidence ID | `MOB-APPLY CASE-FILES-LINKED-EVIDENCE-HINT-V1` |
| Map — click cam dot, video in popup | `MOB-APPLY PIN-CLICK-POPUP-OPEN-NO-DOCK-STORM-V1` |
| Redact — lost after Save / Finalize | `MOB-APPLY REDACT-FINISH-LOOP-HANDOFF-V1` |
| Cannot log in to **main Axiom** | Tell us: which URL, which user — **not** a MOB name, we fix login path |
| Pack for customer later | Ship checklist + lab password MOB — **only when you say ship** |

---

## 8) Agent note (internal discipline)

- Case Files: **stop** COL-FIT / table width MOBs — closed on PASS.  
- Explain map vs list **Open** before naming pin MOBs.  
- Never mix **WVP admin123** with **Axiom desk login** in one sentence.

---

## Ask

No APPLY needed unless you pick a row from §7.

If map video is the next pain: **`MOB-APPLY PIN-CLICK-POPUP-OPEN-NO-DOCK-STORM-V1`** and we test **click cam on map → popup video**.
