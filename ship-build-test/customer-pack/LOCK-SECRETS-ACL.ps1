# Wrapper — restrict storage/secrets/ to service account + admins.
& "$PSScriptRoot\scripts\me8-ship\LOCK-SECRETS-ACL.ps1" @args
exit $LASTEXITCODE
