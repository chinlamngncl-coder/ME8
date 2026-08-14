# MOB DISC — HQ-ALERT-CUSTOM-TONE-FILES-V1 UI layout (save vs preview) — 2026-08-10

**Status:** Discuss only. **No code** until you say `MOB-APPLY HQ-ALERT-CUSTOM-TONE-FILES-V1`.  
**Read:** `.cursorrules` · zero-change · no invent beyond this disc.

---

## Your layout — yes, we can do that

Order under Alerts & voice (after the existing SOS / Analytics / Hold row):

```
[ SOS tone ▼ ]  [ Analytics tone ▼ ]  [ Hold after speak ▼ ]

Custom tone                    ← new heading (after the tone tabs/selects)
[ SOS: Default | Custom ]      ← next-level tabs (or segmented control)
[ Analytics: Default | Custom ]

  when Custom → file picker + Clear + short name of uploaded clip
  when Default → use the preset selected above (Urgent / Classic / …)

Preview
[ Preview SOS ]  [ Preview analytics ]   ← keep as now (your screenshot)
```

**Meaning**

| Top row | What it is |
|---------|------------|
| SOS tone / Analytics tone selects | **Default** preset library (built-in) |
| **Custom tone** heading + tabs | **Next level:** use Default (preset) **or** Custom (uploaded file) per family |
| Preview buttons | Hear **whatever is active now** (preset if Default tab; file if Custom tab + file chosen) |

So: tops = what the default sounds are; Custom block = whether that family plays preset or file.

---

## Must they Save after Preview?

| Action | Must Save? |
|--------|------------|
| **Preview SOS / Preview analytics** | **No.** Preview only. Does not write permanent site/desk prefs. |
| **Keep that choice after refresh / for real alarms** | **Yes.** Click **Save alert tones** (same button as today). |

**Locked rule for APPLY**

1. Preview = temporary listen (uses current form: tab + preset or chosen file in the picker).  
2. Upload into the file input alone does **not** auto-save to server until **Save alert tones**.  
3. Optional UX: after a successful Save, flash “Alert tones saved” (already exists).  
4. If Custom tab + no file yet → Preview falls back to the preset above (and hint: “Add a file or switch to Default”).

Do **not** auto-save on every Preview (annoying; burns mistaken clicks into production alarms).

---

## Save scope (when APPLY runs)

**Save alert tones** writes:

- Preset ids + hold seconds (already)  
- Per family mode: `default` | `custom`  
- Custom file refs (server path or blob id) after upload  

**Recommend server store** so all desks share the same SOP clip (as prior disc). If you want desk-only browser files instead, say so in the APPLY — default remains **server**.

---

## Out of scope this V1

- Per-action Weapon/FR/ANPR separate custom files (that’s V2)  
- Header mute/repeat  
- Changing Preview button labels unless you ask  

---

## Got it?

Yes: **Custom tone** heading under the SOS/Analytics selects; Default|Custom next-level tabs; keep Preview SOS / Preview analytics; **Preview ≠ Save**; real alarms use last **Save alert tones**.

Say **`MOB-APPLY HQ-ALERT-CUSTOM-TONE-FILES-V1`** when you want it built.
