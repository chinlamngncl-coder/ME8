---
name: License request
about: Internal — generate a signed customer license.lic (Ed25519)
title: "[license] "
labels: license
assignees: ""
---

> **Internal only.** Never paste `license-private.pem` or the private key into this issue.
> Generator: `node tools/generate-license.js` (vendor machine). Customer HWID comes from **their server PC**.

## Customer

| Field | Value |
|-------|--------|
| Legal / site name | |
| Pack / product SKU | Mobility Axiom |
| Contact email | |
| Country / region | |

## Hardware ID (required)

Paste exact output of on **customer server**:

```
npm run license:print-hwid
```

or

```
node tools/generate-license.js --print-hwid
```

```
hardwareId: ________________________________
```

## Entitlement window

| Field | Value |
|-------|--------|
| Valid from (UTC ISO) | |
| Valid until (UTC ISO) | |
| Seat / camera cap (if any) | |
| Notes / SKU flags | |

## Delivery

- [ ] Signed `license.lic` file only (customer places under `storage/`)
- [ ] Also update ship pack / release tag: _______________
- [ ] Grey-out / feature flags (when Task 3.x UI lands): _______________

## Checklist (issuer)

- [ ] HWID matches customer **server** (not browser / BWC)
- [ ] Signed with vendor private key **offline**
- [ ] Public key already in pack / `keys/license-public.pem`
- [ ] Customer told: restart after dropping `storage/license.lic`
- [ ] No private key left on customer media

## Audit

| Field | Value |
|-------|--------|
| Issued by | |
| Issue date (UTC) | |
| License file hash (SHA-256) | |
| Tracking / PO | |
