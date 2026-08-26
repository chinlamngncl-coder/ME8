# MOB DISC — LAN audio / mic: secure context + cert (not localhost forever)

**Status:** APPLY done `DASHBOARD-TLS-SAN-LAN-IP-V1` (2026-08-22) — see `MOB-APPLIED-DASHBOARD-TLS-SAN-LAN-IP-V1-20260822.md`. Operator HTTPS mic PASS pending.  
**Symptom (operator PASS/FAIL 2026-08-22):** Live listen + talk work on `http://localhost:3988`. Fail on `http://192.168.x.x:3988`. Fail on `https://192.168.x.x:4438` in this lab retest.  
**Rules:** credit-lean · zero-change without APPLY · no WSL `172.17–172.31` as server IP.

---

## 1) Will the client always type localhost?

**No. Never for a real site.**

| Who | URL |
|-----|-----|
| Engineer on the **same PC** as the server (lab only) | `localhost` is OK |
| Operator / client on **another PC**, or phone, or second monitor PC | `localhost` = *their* machine → **wrong**. They must use the **server LAN IP or DNS** |

Ship product must work as: `https://<server-ip-or-name>:<https-port>/` with mic + BWC listen.

Localhost-only audio = **lab accident**, not a customer design.

---

## 2) Is this an industry browser issue?

**Yes — for the mic (PTT / talk).**

Browsers (Chrome / Edge / Firefox) require a **secure context** for `getUserMedia` (microphone):

- Allowed: `https://…`, and the special case `http://localhost` / `127.0.0.1`
- Not allowed: plain `http://192.168.…` (shows “Not secure”)

ME8 already encodes that in `call-mic.js` / `ptt-mic.js` (`isSecureContext === false` → clear error).

**BWC listen (unmute PCM)** is Web Audio + `/ws/audio`. Same-origin HTTPS should be enough; if HTTPS IP still silent, that is a **second** bug (cert / WS / focus / PCM), not “browser forbids LAN forever.”

Industry VMS / bodycam UIs do the same: **HTTPS (or enterprise trusted TLS) on the operator URL.** They do not tell every desk to open `localhost` on the server box.

---

## 3) Do we need certificate compliance so clients skip localhost?

**Yes. That is the real fix path.**

| Approach | Client experience | Ship? |
|----------|-------------------|-------|
| HTTP LAN IP only | Mic blocked by browser | No |
| Lab self-signed HTTPS, user clicks “Advanced → Continue” once | Often works **if** cert SANs include that IP and page is really `https://` | Lab OK; rough for customers |
| Self-signed + IT installs root/CA on operator PCs | Works without scary page | Common on closed LAN |
| Public CA or internal PKI on real DNS name (`axiom.site.local`) | Clean padlock, no teach | Best for enterprise |

Product already has **DASHBOARD-HTTPS-LAN-V1** (`FM_HTTPS_ENABLED`, port **4438**, PEMs under `certs/lab-dashboard/`). That is the lever — not “force localhost.”

**Comply** here means: TLS that the **operator browser trusts** for the **hostname/IP they type**, not a paper compliance stamp for its own sake.

---

## 4) Why HTTPS IP can still fail in lab (your retest)

If `https://192.168.1.38:4438` still has no talk/listen, check in order (operator, one hard refresh):

1. Address bar is really **https** and padlock / “Continue” already done (not HTTP 3988).
2. Cert must list that IP (or DNS) as **SAN**. Cert minted for `localhost` only → browsers warn hard; some paths stay broken.
3. Console after unmute/mic: secure-context / getUserMedia / `/ws/audio` red vs green.
4. Separate: HTTP login JS **401** allowlist on fresh LAN sessions (`LOGIN-PUBLIC-JS-ALLOWLIST-V1`) — login chrome only; not the root of mic policy.

Until (2) is true, “HTTPS can’t do audio” may still be **bad lab cert**, not “industry says IP can never work.”

---

## 5) Locked product intent

1. **Clients use server IP or DNS over HTTPS** — not localhost.  
2. **HTTP `:3988` stays** as fallback for video/ops where policy allows; **talk/mic is HTTPS path.**  
3. **Certs are required** for normal talk on LAN (lab self-signed + trust, or site CA/DNS).  
4. Do **not** invent a product that only works on localhost.

---

## 6) Recommended next APPLYs (one at a time)

| Order | Name | Why |
|------:|------|-----|
| 1 | `DASHBOARD-TLS-SAN-LAN-IP-V1` | Regen/ensure lab cert with SAN = Wi‑Fi IP (e.g. `192.168.1.38`) + localhost; document trust-once / IT root. Prove mic + unmute on `https://192.168.1.38:4438`. |
| 2 | `LOGIN-PUBLIC-JS-ALLOWLIST-V1` | Stop 401 on login page scripts over LAN HTTP (pic 2). |
| 3 | Only if HTTPS+SAN still silent | Named PCM/`/ws/audio` host debug MOB — after cert proof fails. |

**Recommendation:** start with **1**. Without a cert the browser trusts for that IP, clients cannot “type their IP and talk” the industry way.

No code until operator says **`MOB-APPLY …`** for one row.
