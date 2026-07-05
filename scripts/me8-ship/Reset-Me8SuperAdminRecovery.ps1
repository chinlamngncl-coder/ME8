# Super admin break-glass recovery (mob-me8-super-admin-recovery). Ubitron ship desk / partner only.
param(
    [string]$AppRoot = '',
    [switch]$List,
    [string]$Username = '',
    [switch]$ResetTotp,
    [switch]$ResetPassword,
    [switch]$ResetAll,
    [string]$TempPassword = '',
    [string]$Actor = 'ship-desk',
    [switch]$Yes
)
$ErrorActionPreference = 'Stop'

function Get-Me8AppRoot {
    param([string]$Start)
    if ($Start -and (Test-Path (Join-Path $Start 'server.js'))) { return (Resolve-Path $Start).Path }
    $here = $PSScriptRoot
    $grand = Split-Path (Split-Path $here -Parent) -Parent
    if (Test-Path (Join-Path $grand 'server.js')) { return $grand }
    throw 'ME8 AppRoot not found — pass -AppRoot'
}

if (-not $AppRoot) { $AppRoot = Get-Me8AppRoot -Start '' }
else { $AppRoot = (Resolve-Path $AppRoot).Path }

$nodeScript = Join-Path $AppRoot 'scripts\me8-ship\super-admin-recovery.js'
if (-not (Test-Path $nodeScript)) { throw "Missing $nodeScript" }

$nodeArgs = @($nodeScript)
if ($List) { $nodeArgs += '--list' }
if ($Username) { $nodeArgs += @('--username', $Username) }
if ($ResetTotp) { $nodeArgs += '--reset-totp' }
if ($ResetPassword) { $nodeArgs += '--reset-password' }
if ($ResetAll) { $nodeArgs += '--reset-all' }
if ($TempPassword) { $nodeArgs += @('--temp-password', $TempPassword) }
if ($Actor) { $nodeArgs += @('--actor', $Actor) }
if ($Yes) { $nodeArgs += '--yes' }

Write-Host 'ME8 super admin recovery (ship desk only)' -ForegroundColor Cyan
Write-Host "  AppRoot: $AppRoot" -ForegroundColor DarkGray

& node @nodeArgs
exit $LASTEXITCODE
