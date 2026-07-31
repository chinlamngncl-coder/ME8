# MOB DISC — License lab push vs commercial pack vs “can they crack it?” (plain English)

**Date:** 2026-07-31  
**Status:** DISC — paper only (no code, no pack, no push)  
**Operator:** *Will this license lab be packed when everything is ready? Can users crack it when we commercialise? What is this all about?*

---

## What this is all about (one minute)

Mobility Axiom needs a way to say:

1. **This customer PC is allowed to run** (right machine, not expired).  
2. **These modules / camera counts are allowed** (what they paid for).  
3. **Customer cannot mint their own “unlimited forever” file** without Ubitron’s secret key.

That is the **air-gap license** story: a signed file `license.lic` checked at boot.  
Ubitron keeps the **private key** offline. The product only has the **public key** (can check, cannot invent).

---

## What `lab-git-push-license-lab` actually was

| It was | It was **not** |
|--------|----------------|
| Saving **lab source code** to GitHub (how the checker works, including trial wildcard support) | Shipping a finished **customer USB** |
| So your desk and git match | Putting `master_license.json` / partner trial into every commercial pack |
| Code: verify signature + HWID + expiry + features helpers | “Commercial product is done” |

So: **push ≠ pack.**  
Git now has the **engine**. A commercial pack later **uses** that engine and drops in a **signed license for that customer**.

---

## Will this be packed when everything is ready?

**Yes — the checker code ships with the product.**  
**No — not the lab trial wildcard as the normal customer story.**

| What goes in a real commercial pack | What must **not** be the default commercial story |
|-------------------------------------|-----------------------------------------------------|
| Protected/runtime that **verifies** `license.lic` | Open “anyone can run forever” with no file |
| **Public** key only (already embedded / ship-safe) | **Private** signing key (never in zip) |
| One signed `storage/license.lic` for **that server’s HWID** + paid features + expiry | Baking **`trial_wildcard`** as the forever customer license |
| `FM_AIRGAP_LICENSE_REQUIRED=1` (air-gap on) | Lab-only “license optional” habits |

**Partner China trial** used `trial_wildcard` so they could try **before** sending HWID. That is a **temporary bridge**.  
When commercial / long-term: issue a **host-locked** license for their real HWID and replace the file.

**Locked principle:** Pack = new install + signed license for that machine — not a clone of lab secrets (`MOB-DISC-COMMERCIAL-PACK-NEW-NO-PORT-RELIGION`).

---

## Can users crack it when we commercialise?

### Honest short answer

| Attack | Reality |
|--------|---------|
| Edit `license.lic` by hand (change BWC count / dates) | **Fails** — signature no longer matches. Server should refuse. |
| Invent a new `.lic` without Ubitron | **Fails** — they do not have the **private key**. |
| Steal private key from the zip | **Only if we screw up** — private key must **never** ship. Packer must purge it. |
| Patch the **software** so it skips the check | **Possible for a skilled pirate** on any Node/JS product if they can change files. Harder with **protected ship** (`build:ship` / minified blob), still not NSA-proof. |
| Use an old **trial_wildcard** license forever | **Bad for us** if we leave wildcard + long expiry in a commercial zip — that is a **product choice**, not “crypto broken.” Do not ship wildcard as the paid SKU. |

**So:** Cryptography stops **fake license files**. It does **not** stop a pirate who rewrites the program to ignore licenses.  
Commercial defence = private key offline + host-locked signed file + protected runtime + do not ship trial wildcard as the paid pack.

Nobody can promise “uncrackable forever.” We promise **honest customers cannot casually forge a license**, and pirates must attack the binary, not just notepad the JSON.

---

## Simple picture

```text
UBITRON (offline)                         CUSTOMER SERVER
-----------------                         ---------------
private key  →  signs license.lic    →    public key checks file
                (HWID + expiry +          if bad / expired / wrong PC
                 features)                → padlock / will not run
```

Lab push = keep that **check code** in git.  
Commercial pack = same check code + **one real signed file** for that site.

---

## What you should remember

1. **License lab push** = save the **rules engine** to GitHub.  
2. **Commercial pack** = engine + **signed license for that HWID** (not “lab open”).  
3. **Trial wildcard** = temporary partner tryout — **replace** before long-term production.  
4. **Crack:** forging a valid `.lic` without the private key ≈ no; patching the app ≈ skilled pirate risk — mitigate with protected ship + never ship the private key / wildcard forever.

---

## Lock

- Paper only. No pack. No code.  
- China pack still **parked**.  
- Commercial license story stays: **sign for HWID, verify on box, private key never in zip.**
