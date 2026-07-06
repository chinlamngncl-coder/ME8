# MOB DISC — Centre Summary AI: customers do **not** download

**Status:** DISC only — clarifies ship design + optional UI MOB.  
**Parent:** `mob-centre-llm-apache-model-swap` (1.5B Apache model)  
**Search:** `Centre Summary`, `LLM`, `vendor/llm`, `download`, `FM_LLM_AUTO_DOWNLOAD`

---

## Short answer (your question)

**No — real customers do not run `download-centre-llm.ps1` and do not download from the internet.**

| Who | What happens |
|-----|----------------|
| **Ubitron ship desk (you)** | Run `scripts\download-centre-llm.ps1` **once** before building the customer ZIP. Model (~1 GB) goes into `vendor\llm\`. |
| **Customer IT** | Unzip / install Mobility Axiom. Model is **already inside** the package. |
| **Customer server (first start)** | Software **copies** `vendor\llm\` → `storage\llm\` on the same machine (~1 min, **no internet**). |
| **Operator** | Opens Centre Summary → asks a question. No download step. |

The line *“on first use download the 1.5B”* in chat was **lab-only** — your **ME8 dev bench** had no GGUF file yet. That is **not** the customer story.

---

## Already locked in product (today)

| Setting | Ship value | Meaning |
|---------|------------|---------|
| `FM_LLM_AUTO_DOWNLOAD` | **`0`** in `.env.example.ship` | Server will **not** fetch from Hugging Face at customer site |
| `PACK-SHIP-DELIVERY.ps1` | **Fails** if `vendor\llm\qwen2.5-1.5b-instruct-q4_k_m.gguf` missing | You cannot ship without bundling |
| `centreLlm.js` | `installBundledModelIfNeeded()` on start | Local copy from package → `storage\llm\` |
| Manuals | “No download on site” | `Configuration-Manual.md` §9 |

**Customer internet download** only exists if someone sets `FM_LLM_AUTO_DOWNLOAD=1` (lab / mistake — not ship profile).

---

## What the operator sees today (gap)

`command-centre.js` only shows **Online** / **Offline** on the LLM status line.

The server already returns richer status (`installing`, `downloadPct`, `hint`) but the UI **does not** show:

- “Setting up assistant from your install… 45%”
- Progress during first local copy

Locales already exist (`centre.llm.installing`, `centre.llm.downloading`) — **underused**.

There is **no download button** in the UI today. Customers are not asked to click anything for a normal ship.

---

## Your idea — one-time button, then never again

### Ship model (recommended — no button)

```
Customer ZIP includes vendor/llm/*.gguf
    → first server start: auto local install (copy)
    → UI: "Preparing assistant…" + % bar (super-admin, Centre Summary tab)
    → done: status "Online", bar gone forever
```

- **No** “Download from internet” button for shipped customers.
- Operator does **nothing** — IT already installed the full package.

### Optional fallback (only if you approve later)

If pack was broken (model file missing) **and** site has internet:

| UI | Behaviour |
|----|-----------|
| Super-admin only | One button: “Install assistant components” |
| Behind flag | `FM_LLM_AUTO_DOWNLOAD=1` **or** new `FM_LLM_ALLOW_ON_DEMAND_INSTALL=1` |
| After success | Button hidden; never shown again |

**Not recommended for standard ship** — fix the pack at ship desk instead. Fallback is for disaster recovery / dev.

---

## Why we decided “vendor bundles, client does not download”

1. **Air-gapped / no internet** — many command centres cannot reach Hugging Face.
2. **Legal / support** — you control which Apache model build is in the zip.
3. **Operator simplicity** — dispatchers must not run IT steps.
4. **Size** — ~1 GB belongs in the **installer USB/ZIP**, not a surprise download on go-live day.

---

## Lab vs customer (do not confuse)

| | **Your ME8 lab** | **Customer ship** |
|--|------------------|-------------------|
| Who downloads GGUF | **You** (`download-centre-llm.ps1`) | **Already in zip** (you did it at pack time) |
| `vendor\llm\` | Empty until you run script | Required before `BUILD` / `PACK` |
| `storage\llm\` | Created on first server start | Same — local copy after install |
| Internet at site | Optional | **Must not be required** |

---

## MOB genres (if you want UI polish — no change to ship rules)

| MOB | Risk | What |
|-----|------|------|
| `mob-centre-llm-install-progress-ui` | **1** | Show install % + “from your package” during local copy; hide when `modelReady` |
| `mob-centre-llm-manual-1gb` | **1** | Update manual §9: ~1 GB (not ~2 GB), neutral wording (no Qwen in operator text) |
| `mob-centre-llm-on-demand-fallback` | **2** | Super-admin button + API — **only** if you want emergency internet install |

**Do not** enable client Hugging Face download by default in ship `.env`.

---

## Ship desk checklist (Centre Summary)

1. `.\scripts\download-centre-llm.ps1` → `vendor\llm\qwen2.5-1.5b-instruct-q4_k_m.gguf`
2. Build customer pack — script verifies file exists
3. Customer `.env` has `FM_LLM_AUTO_DOWNLOAD=0`
4. After customer install: first restart → local copy runs automatically
5. Super-admin: Centre Summary → status **Online** → test one question

---

Reply **`MOB-APPLY mob-centre-llm-install-progress-ui`** if you want the one-time progress bar (no download button for ship).
