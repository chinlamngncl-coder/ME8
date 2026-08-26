# Pre-Ship Checklist (ME8 / Mobility Axiom)

[ ] CRITICAL: Re-enable 2FA logic on login page before production deployment.

**Lab / development (now):** Keep `FM_TOTP_SUSPENDED=1`. Login page still contains the TOTP UI step for when 2FA is turned back on. Do not flip this for day-to-day testing.

**Ship / customer pack:** Turn `FM_TOTP_SUSPENDED` off and verify authenticator login end-to-end before zip.
