# Pin name max 12 + title center

**Status:** APPLIED — `MOB-APPLY-PIN-NAME-MAX12-TITLE-CENTER` · 2026-07-19

---

## Languages (simple)

**12 means 12 characters** — English letters, Chinese, Korean, Thai, etc. each count as **1**.

- English: `OfficerLee` = 10  
- Chinese: `李警官` = 3  
- Same rule in every language. No separate byte limit.

Why 12 works for all: Chinese/Korean letters are **wider** on screen, so a short character cap keeps the pin title readable. The pin shows the **full** name (no “…”) because Settings/CSV already block longer names.

Hints use each language’s normal words (i18n), e.g. English: **Max name input 12 characters.**

---

## Done

1. Nickname / officer name max **12** — BWC UI, groups UI, CSV import, server save  
2. Hint: **Max name input 12 characters.** (translated)  
3. Pin title: centered; PATROL ≈ name size; full name shown (no cut)  
4. Picture size unchanged  

Hard refresh to check.
