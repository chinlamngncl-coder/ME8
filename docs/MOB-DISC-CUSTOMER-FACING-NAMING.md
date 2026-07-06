# MOB DISC — Customer-facing naming (strict — day 1 rule)

**Status:** DISC only — **no MOB-APPLY** until you name a wave.  
**Search:** `customer facing`, `internal names`, `ZLM`, `GB28181`, `ffmpeg`, `vendor`, `manual`, `UI copy`

---

## Rule (locked)

Customers and their operators must **never** see internal engineering names in:

| Surface | Examples of what must **not** appear |
|---------|--------------------------------------|
| Dashboard UI | ZLM, GB28181, ffmpeg, JSMpeg, node-llama-cpp, Qwen, Hugging Face, vendor OEM names |
| Operator / IT manuals | Same + lab MOB names, file paths like `lib/…`, npm package names |
| Install scripts **messages** | “ffmpeg-static”, “Start LiveKit engine” (use product language) |
| Ship `.env.example` **comments** | `FM_GB28181_*`, `ffmpeg-static`, model filenames (IT file — still scrub) |
| Brochures / tender packs | Any customer organisation name baked into product docs (see enterprise VMS DISC) |
| Error toasts / alerts | Stack traces, module paths, vendor XML strings |

**Use instead:** Ubitron / Mobility Axiom product language — *body-worn camera*, *SIP register*, *live video*, *media engine*, *Centre Summary assistant*, *video conference service*.

**OEM / legacy names (never):** banned vendor bodycam stack names (see workspace brand rule). Paraphrase in logs and support: “device reported IPC / firmware V1.0.0”.

---

## What stays internal (lab / ship desk only)

| OK internal | Never in customer pack |
|-------------|------------------------|
| `docs/MOB-DISC-*.md` (most) | `MOB-DISC-START-HERE.md`, `LICENSE-OPERATIONS.md` (already on denylist) |
| `ME8-INTERNAL/ship-desk/` | Always |
| `public/test-zlm.html` | Lab bench — **must not ship** (see audit) |
| Env vars in running code | `FM_GB28181_*`, `FM_LAB_ZLM` — code may keep; **rename later** only with your OK |
| `lib/usbMaintenance.js` paths | Vendor USB tool filenames on disk — not UI |

**Agent rule:** If a banned word is **inside function code** (env var names, require paths, comments in locked files) → **report only**. Do **not** patch function without explicit MOB-APPLY.

---

## Audit — 2026-07-07 (ME8 tree)

### Clean (no action)

| Area | Result |
|------|--------|
| `public/locales/*.json` | No ZLM / GB28181 / ffmpeg / Qwen / OEM names in operator strings |
| `public/index.html` | Clean |
| `public/js/fleet-ui.js`, `settings-hub.js`, `command-centre.js` | UI shows “online/offline” for Centre Summary — **not** model filename |
| `docs/trial-ship/manuals/en` (generated HTML) | No ZLM / GB28181 / ffmpeg / Qwen |
| Product UI for VC | Locales say “Cloud video service” / “On this server” — not LiveKit in `en.json` |
| YULONG / YuLong / DSJ / ProStage | **Not found** in customer-facing ME8 sources |

---

### Must fix before ship (customer-visible — doc/script/pack MOBs)

| # | Location | What customer sees | Suggested fix (MOB genre) |
|---|----------|-------------------|---------------------------|
| **1** | `public/test-zlm.html` | Page title and body: “ZLM”, “FFmpeg”, `FM_LAB_ZLM` | **`mob-ship-exclude-lab-pages`** — add to `SHIP-CONFIDENTIAL-DENYLIST.json` + strip from customer `public/` copy; keep lab-only in ME8 dev |
| **2** | `scripts/trial-ship/manuals-src/*/Configuration-Manual.md` (all langs) | Section “Docker / **LiveKit**”, port table “LiveKit HTTP/RTC” | **`mob-manual-vc-neutral-wording`** — “Video conference media service (Docker)” |
| **3** | `scripts/trial-ship/Install-Mobility.bat` | Echo: “Start **LiveKit** video engine” | **`mob-install-bat-neutral-wording`** — “Start video conference service (Docker)” |
| **4** | `scripts/trial-ship/.env.example.ship` | Comments: `ffmpeg-static`, `FM_GB28181_*`, `qwen2.5-….gguf` | **`mob-ship-env-neutral-comments`** — `FM_SIP_*` aliases in comments only, or generic “SIP public host” |
| **5** | `scripts/trial-ship/verify-install-ship.js` | Fail messages: `ffmpeg-static not installed` | **`mob-verify-neutral-errors`** — “Media tools not installed” |
| **6** | `scripts/trial-ship/THIRD-PARTY-NOTICES.ship.md` | `ffmpeg-static`, `node-llama-cpp`, Qwen model names | **`mob-oss-third-party-notices-generate`** — legal counsel: notices may need vendor names in **legal appendix only**, not in operator Quick Guide |

---

### Report only — function / API (you decide per MOB)

Do **not** change without your explicit MOB:

| Location | Internal exposure | Risk |
|----------|-------------------|------|
| `lib/serverSettings.js`, `serverSecrets.js`, … | `FM_GB28181_*` env var names | IT reads `.env` — rename genre is **`mob-env-sip-neutral-keys`** (breaking for existing installs) |
| `server.js` `/api/platform/status` | JSON `ffmpeg: { path, source, bundled, version }` | Super-admin API; UI today does not paint it — **`mob-api-scrub-platform-status`** if you want belt-and-braces |
| `lib/centreLlm.js` + `/api/command-centre/llm-status` | `configuredModel: qwen2.5-1.5b-….gguf` | Super-admin only; UI does not show — **`mob-api-llm-status-neutral`** optional |
| `lib/platformHealth.js` `moduleMap` | `ffmpeg`, `JSMpeg`, `lib/liveStreamPool.js` | Engineer diagnostics (PIN) — **`mob-tech-health-neutral-map`** |
| `lib/usbMaintenance.js` | `dsjadb.exe` path | Internal path only; never surfaced in UI |
| `public/js/video-wall.js` | Code comments only | No operator text |
| ZLM lab routes in `server.js` | Only when `FM_LAB_ZLM=1` | Off in ship profile; exclude `test-zlm.html` from pack |

---

## Ship pack checklist (before zip leaves)

1. Run customer pack verify + denylist scan (`BUILD-ME8-CUSTOMER.ps1 -CustomerPack`).
2. Grep customer zip (not source tree): no `ZLM`, `GB28181`, `ffmpeg-static`, `qwen`, `YULONG`, `MOB-DISC-START-HERE`.
3. Open generated **Quick Guide** + **Configuration Manual** — read as a customer IT person.
4. Install on clean VM — read every echo from `Install-Mobility.bat`.
5. Log in as operator — no internal names in tabs, toasts, or Settings.

---

## MOB waves (suggested order)

| Step | MOB genre | Risk | Status |
|------|-----------|------|--------|
| 1 | `mob-ship-exclude-lab-pages` | **1** | **APPLIED** 2026-07-07 |
| 2 | `mob-manual-vc-neutral-wording` | **1** | **APPLIED** 2026-07-07 (regenerate manuals on next pack) |
| 3 | `mob-install-bat-neutral-wording` | **1** | **APPLIED** 2026-07-07 |
| 4 | `mob-ship-env-neutral-comments` | **1** | **APPLIED** 2026-07-07 |
| 5 | `mob-verify-neutral-errors` | **1** | **APPLIED** 2026-07-07 |
| 6 | `mob-oss-third-party-notices-generate` | **1** | **PARTIAL** — notices reframed; full auto-generate MOB still open |
| 5 | `mob-api-scrub-platform-status` / `mob-env-sip-neutral-keys` | **2–3** | only if you want zero internal names in IT files/API |

---

## Related

- Brand rule: workspace `mob-brand-naming` (OEM names never in product copy)
- Ship denylist: `pack/me8-fresh/SHIP-CONFIDENTIAL-DENYLIST.json`
- Commercial stack: `ME8-INTERNAL/ship-desk/MOB-DISC-COMMERCIAL-SAFE-STACK-REPLACEMENTS.md`

---

Reply with which MOB genre to apply first (recommend **`mob-ship-exclude-lab-pages`** + **`mob-manual-vc-neutral-wording`**).
