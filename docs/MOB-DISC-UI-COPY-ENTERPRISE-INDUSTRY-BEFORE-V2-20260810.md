# MOB DISC — Enterprise UI wording standard (before PASS-V2) (2026-08-10)

**Status:** LOCKED paper. **No code this turn.**  
**Read:** `.cursorrules` (functional IDs / no CSS freestyle / CREDIT-LEAN / UI COPY PROFESSIONAL).  
**Industry check:** SAP Fiori UI text · enterprise progressive disclosure · admin-console content patterns (short labels; help outside the chrome).  
**Extends:** whole-product copy disc · PASS-V1 plan · `me8-ui-copy-professional.mdc`.

---

## Verdict (industry)

Control-room / enterprise admin products do **not** teach a feature in a paragraph under every panel title.

| Layer | Industry pattern | Mobility Axiom |
|-------|------------------|----------------|
| **Page / panel** | Title + optional **one** calm line | Same |
| **Controls** | Verb + object (**Save**, **Mark complete**) | Same |
| **Errors** | Short, factual | Same |
| **Deep how-to** | Docs / Companion / manuals — **progressive disclosure** | **Manuals teach**; UI does not |

Teaching on every page = lab leftover, not enterprise.

---

## Words — locked tone

| Do | Don’t |
|----|--------|
| Clear, neutral, dispatcher English | Chatty: I've… / Let's… / Just… |
| Sentence case for hints (one short sentence) | Roadmaps: later steps / MOB / Cursor |
| Title-style short buttons | Lab: LAB CONSOLE / lab install / toast-as-product |
| Permission via **hidden nav / disabled control** + short error if needed | “Super admin only” essay under every hint |
| Same meaning after shorten | Invent new features or change procedure |

**Length cap (UI hints / intros):** ≤ **~12–18 words** or **one sentence**. Prefer title alone when the title is enough.

---

## Actions — what PASS-V2 will do (when you APPLY + Grep OK)

| Action | Detail |
|--------|--------|
| **1. List** | After you say **OK to Grep**: list `en.json` keys matching `hint` / `intro` / `Note` / `setupHint` with length ≥ ~140 (locale only — not whole repo). |
| **2. Replace** | Change **string values only** to enterprise one-liners (table in APPLY disc). |
| **3. Mirror** | Update matching HTML `data-i18n` **text defaults** only where those keys appear. |
| **4. Leave** | Elements, `id`, `data-*`, classes, CSS, scroll, layout, JS logic — **untouched**. Shorter text → content below moves up by normal flow. |
| **5. Never blank** | Hint stays non-empty (no dead empty `<p>`). |
| **6. Manuals** | **Out of scope** — manuals keep teaching professionally (separate manuals APPLY). |

**Not in V2:** redesign, new buttons, hiding panels, gutting manuals, other locales (unless you name them).

---

## Examples (enterprise clarity)

| Before (teach-on-page) | After (enterprise) |
|------------------------|--------------------|
| Long paragraph: how FTP works, what IT mounts, what comes later… | **Set where dock FTP and live capture files are stored.** |
| Long paragraph: enroll faces, grades, 5,000 limit, photo tips… | **Enroll people on the Watchlist from a clear ID photo.** |
| Restart Fleet (LAB CONSOLE START)… | *(already V1)* Restart Fleet, hard-refresh… |

Buttons already V1: **Mark complete**, **Remind later**.

---

## Gate before code

1. You read this disc.  
2. You reply **OK to Grep** (locale long-hint list only).  
3. Agent returns a **short replace table** (key → new line) for your eye-check.  
4. You paste **`MOB-APPLY UI-COPY-PROFESSIONAL-PASS-V2`** again (or **go ahead** on that table) → words-only patch.

Prior lone APPLY without Grep OK = **held**. Industry + your scan rule both win.

---

## Agent forever (with `.cursorrules`)

- New UI string → enterprise short; manuals → teach clearly.  
- Ask before whole-locale Grep.  
- Words only when fixing copy; never break `id` / `data-*` / scroll locks.
