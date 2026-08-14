# MOB-DISC FTP for ANPR — plain English — 2026-08-14

**Status:** planning. **No APPLY.**  
**Audience:** operator (non-tech). Fixes confusing “storage / disk / UI” talk.

---

## Your question

> Storage does not have ftp uploads. It is used for the upload **path setting**. Right? Then what are you talking about disk vs UI?

**You are right about the setting.**  
FTP files do **not** have to live in a folder named `storage/ftp-uploads`. That name is only a **default if nobody set a path**.  

In the product, **you (or IT) set the FTP upload folder** in settings — wherever that path points is where dock/BWC FTP files actually arrive.

I was mumbling. Here it is in human English.

---

## Two different things (stop mixing them)

### 1) Where the photos sit (the folder)

- Cameras/docks upload by FTP into **one folder you already configured** (FTP upload path in settings).
- That folder might be on the PC, a NAS, a D: drive — **whatever path you set**.
- We will **not** invent a second secret ANPR folder and copy everything again.

Call this: **“the FTP folder”** (your setting). Not “storage magic.”

### 2) Where you look at them in the software (the screen)

- To **pick** those photos and run plate check, you use a screen in ANPR.
- That screen is already started under **Offline Match → Image Investigation → FTP inbox** (Refresh / thumbnails).
- Snapshot **Bulk** is different: you drag photos from your PC yourself. Not the dock FTP folder.

Call this: **“the FTP inbox on Offline Match”** — a browser into the FTP folder.

---

## One picture

```
Dock / BWC  --FTP-->  [FTP folder from Settings]
                              |
                              v
              Offline Match → Image → FTP inbox
                              |
                              v
                    Analyze / scan plate → plate lists
```

Snapshot Bulk:

```
Your PC photos --drag--> Snapshot Bulk → same plate scan
```

Same plate engine. **Two ways in.** One FTP folder on the machine.

---

## What “FTP inbox polish” would do later (when you MOB-APPLY)

Not move files. Not rename Settings.

Only improve the Offline Match FTP inbox so you can see useful labels, for example:

- which camera / folder  
- which date  

…for files that are **already** in your FTP folder.

Suggested APPLY name (later): `ANPR-OFFLINE-FTP-INBOX-META-V1`

---

## Fast plate-OCR (separate job)

That only upgrades **how well** plates are read inside the ANPR program.  
It does **not** change where FTP files are stored.  
Suggested APPLY: `ANPR-FAST-PLATE-OCR-SWAP-V1`

---

## Offline Match tab

Leave Offline Match as it is (your order). No “route everything to Snapshot” MOB.
