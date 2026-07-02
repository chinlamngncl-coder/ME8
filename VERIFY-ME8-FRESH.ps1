# Wrapper — verify no lab leftovers before customer handoff.
& "$PSScriptRoot\scripts\me8-ship\VERIFY-ME8-FRESH.ps1" @args
exit $LASTEXITCODE
