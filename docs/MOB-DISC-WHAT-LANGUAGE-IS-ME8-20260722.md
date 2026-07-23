# MOB DISC — What code is Mobility Axiom / ME8 written in?

**Status:** DISC locked — facts only (no APPLY)  
**Date:** 2026-07-22  
**Trigger:** Operator asked: JSON? Python? What language writes our software?

---

## One-sentence answer

**The product (dashboard + Fleet server) is written in JavaScript and runs on Node.js.**  
JSON is **data/config**, not the language we write features in. Python is only for **face-recognition helpers**, not the main app.

---

## Plain English stack

| Layer | What it is | Language / tech |
|-------|------------|-----------------|
| **Fleet server** | Login, SOS, PTT, Call, API, devices | **JavaScript** on **Node.js** (`server.js`, `lib/*.js`) |
| **Dashboard UI** | Map, wall, pins, PTT Groups, settings | **HTML + CSS + JavaScript** (`public/`) |
| **Realtime** | Live updates to the browser | **Socket.IO** / WebSocket (still JS) |
| **Config / labels** | Settings examples, i18n strings | **JSON** (data files — not “the app language”) |
| **Face recognition (FR)** | Optional sidecar that looks at faces | **Python** (`fr-sidecar*`) |
| **Video media (lab)** | WVP + ZLM containers | Separate products (Java / C++ media stack) — we **integrate**, we don’t rewrite them in ME8 |
| **Lab scripts** | Start / restore / verify | **PowerShell** / `.bat` + some Node verify scripts |
| **Android companion (lab proof)** | Small SOS interceptor proof | **Java** (optional; not the main dashboard) |
| **Database** | Catalog / enterprise data | **SQL** (Postgres) + JS drivers |

---

## What JSON is (and is not)

| JSON is | JSON is not |
|---------|-------------|
| Config (`.env` companions, compose files often YAML) | The language that runs PTT / Call / live |
| Locale strings (`public/locales/en.json`) | A replacement for JavaScript |
| API payloads (request/response bodies) | Something you “code the product in” |

When you see `.json` files, think **settings and text**, not the brain of the software.

---

## What we change day-to-day (your MOBs)

Almost always:

1. **`server.js` / `lib/*.js`** — server behavior  
2. **`public/index.html` + `public/js/*.js`** — what you click and see  
3. Sometimes **`public/locales/*.json`** — button labels only  

Rarely:

- Python FR sidecars (FR genre only)  
- Docker compose for WVP/ZLM (infra)  
- Android proof APK (separate track)

---

## Not in the main product

| Language | Role here |
|----------|-----------|
| **Python** | FR engines only — not dashboard / PTT / Call |
| **TypeScript / React** | Not the main Fleet UI (classic HTML/JS) |
| **C# / .NET** | Not this repo’s core |
| **Go / Rust** | Not this repo’s core |

---

## Why this matters for “next MOB”

When we say **`MOB-APPLY CALL-GROUP-DISPATCH-V1`**, the work is still **JavaScript** (server + left-panel UI) reusing existing SIP call code — same stack as PTT Groups. No switch to Python or JSON-as-language.

---

## Honesty

| Claim | Truth |
|-------|-------|
| “We write the software in JSON” | **No** — JSON holds data; logic is JavaScript |
| “We write it in Python” | **Only** the face-recognition sidecars |
| “It’s Node / JavaScript” | **Yes** — that is the product core |

No APPLY from this disc. Reference only.
