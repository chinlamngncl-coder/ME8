# MOB DISC — VC Host Tools always open (no minimize)

**Status:** DISC locked — **no APPLY** until you say the phrase  
**Date:** 2026-07-23  
**Trigger:** Operator — Host Tools is a collapsed accordion; want it **without minimising** (always visible). Screenshot shows ▾ Host Tools bar closed while End Room / BWC row sit awkward underneath.

---

## Got it (plain English)

**Yes.** Host Tools should stay **open all the time** on the Live lobby (when you have host / record / BWC-share permission).  
No click to expand. No chevron. No collapsed thin bar.

---

## Why it looks wrong now

Lobby host block is built as HTML `<details>` / `<summary>`:

```js
<details class="vc-advanced"><summary>Host Tools</summary>
  End Room + BWC / fixed-camera controls
</details>
```

Browsers start `<details>` **closed** unless `open` is set — so you only see the minimize row until you open it. That is the “Host Tools minimising” behaviour.

Join Room routing stays untouched.

---

## Fix (one small MOB)

**Name:** `VC-HOST-TOOLS-ALWAYS-OPEN-V1`

| In | Out |
|----|-----|
| Replace lobby `<details>` with a normal **always-visible** panel (title “Host Tools” + End Room + BWC / fixed camera row) | Changing Join Room / start / token / LiveKit |
| Same buttons / same IDs (`vc-end-room`, BWC add, etc.) | In-meeting toolbar (already shows host controls differently) |
| Light card styling so it is not a full-width hairline accordion | Global nav / dark palette |

**Risk:** Low (markup only in `renderLiveControls` lobby branch + CSS).

**PASS:** Live lobby (not in meeting) → Host Tools content (End Room when allowed, BWC / fixed camera) **visible immediately** with no expand click.

---

## Phrase when ready

**`MOB-APPLY VC-HOST-TOOLS-ALWAYS-OPEN-V1`**

Until then: disc only — this file.
