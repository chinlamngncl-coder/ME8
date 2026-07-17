# Install Ubitron Mobility C2 as a Windows service (auto-start, no console window).
# mob-me8-windows-service — IT runs once after NEW-ME8-INSTALL; operators use the portal URL only.
param(
    [string]$AppRoot = '',
    [switch]$SkipPortKill,
    [switch]$PauseAtEnd
)
$ErrorActionPreference = 'Stop'

$ServiceName = 'UbitronC2'
$DisplayName = 'Ubitron Mobility C2'

function Resolve-Me8Root([string]$Start) {
    if ($Start -and (Test-Path (Join-Path $Start 'server.js'))) { return (Resolve-Path $Start).Path }
    $here = $PSScriptRoot
    $parent = Split-Path $here -Parent
    $grand = Split-Path $parent -Parent
    if (Test-Path (Join-Path $grand 'server.js')) { return $grand }
    if (Test-Path (Join-Path $parent 'server.js')) { return $parent }
    throw 'ME8 AppRoot not found — run from ME8 root or pass -AppRoot'
}

function Test-Admin {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    $p = New-Object Security.Principal.WindowsPrincipal($id)
    return $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Resolve-NodeExe {
    $cmd = Get-Command node -ErrorAction SilentlyContinue
    if ($cmd -and $cmd.Source) { return $cmd.Source }
    throw 'Node.js not on PATH. Install Node 20+ LTS and reopen PowerShell as Administrator.'
}

function Ensure-LocalMachineVaultKey {
    param([string]$Root)
    $keyPath = Join-Path $Root 'storage\secrets\vault-key.dpapi'
    if (-not (Test-Path $keyPath)) { return }
    Write-Host '  Preparing secrets key for Windows service (LocalMachine)...' -ForegroundColor Gray
    $q = $keyPath.Replace("'", "''")
    $ps = @"
Add-Type -AssemblyName System.Security
`$p='$q'
`$prot=[IO.File]::ReadAllBytes(`$p)
`$raw=`$null
try {
  `$raw=[Security.Cryptography.ProtectedData]::Unprotect(`$prot,`$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
} catch {
  try {
    `$raw=[Security.Cryptography.ProtectedData]::Unprotect(`$prot,`$null,[Security.Cryptography.DataProtectionScope]::LocalMachine)
  } catch { exit 1 }
}
`$new=[Security.Cryptography.ProtectedData]::Protect(`$raw,`$null,[Security.Cryptography.DataProtectionScope]::LocalMachine)
[IO.File]::WriteAllBytes(`$p,`$new)
"@
    & powershell -NoProfile -ExecutionPolicy Bypass -Command $ps
    if ($LASTEXITCODE -ne 0) { Write-Host '  Warning: vault key migrate skipped — service may need RESTART-FLEET lab mode.' -ForegroundColor Yellow }
}

function Grant-SystemFolderAccess {
    param([string]$Root)
    Write-Host '  Granting background service access to Face Matching folder...' -ForegroundColor Gray
    $targets = @($Root, (Join-Path $Root 'fr-sidecar'))
    foreach ($t in $targets) {
        if (-not (Test-Path $t)) { continue }
        & icacls $t /grant 'NT AUTHORITY\SYSTEM:(OI)(CI)RX' /T 2>$null | Out-Null
    }
}

if (-not (Test-Admin)) {
    Write-Host 'ERROR: Run PowerShell as Administrator to install the Windows service.' -ForegroundColor Red
    exit 1
}

if (-not $AppRoot) { $AppRoot = Resolve-Me8Root '' }
else {
    $AppRoot = (Resolve-Path $AppRoot).Path
    if (-not (Test-Path (Join-Path $AppRoot 'server.js'))) { throw "Not ME8 root: $AppRoot" }
}

$nodeExe = Resolve-NodeExe
$serverJs = Join-Path $AppRoot 'server.js'
$storageDir = Join-Path $AppRoot 'storage'
New-Item -ItemType Directory -Force -Path $storageDir | Out-Null
$stdoutLog = Join-Path $storageDir 'service-stdout.log'
$stderrLog = Join-Path $storageDir 'service-stderr.log'

Write-Host ''
Write-Host 'Install Ubitron Mobility C2 — Windows service' -ForegroundColor Cyan
Write-Host "  App:     $AppRoot"
Write-Host "  Node:    $nodeExe"
Write-Host "  Service: $ServiceName"
Write-Host ''

$nssm = & (Join-Path $PSScriptRoot 'Get-Nssm.ps1') -AppRoot $AppRoot
if (-not (Test-Path $nssm)) { throw "NSSM not found: $nssm" }

$existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host '  Removing existing service registration...' -ForegroundColor Yellow
    & $nssm stop $ServiceName confirm 2>$null | Out-Null
    Start-Sleep -Seconds 2
    & $nssm remove $ServiceName confirm
    Start-Sleep -Seconds 1
}

if (-not $SkipPortKill) {
    $killScript = Join-Path $AppRoot 'kill-fleet-ports.ps1'
    if (Test-Path $killScript) {
        Write-Host '  Freeing C2 ports (lab console server if any)...' -ForegroundColor Gray
        & $killScript
    }
}

Ensure-LocalMachineVaultKey -Root $AppRoot
Grant-SystemFolderAccess -Root $AppRoot

$frPy = Join-Path $AppRoot 'fr-sidecar\.venv\Scripts\python.exe'
$envExtra = "FM_SECRETS_DPAPI_SCOPE=LocalMachine`r`nFM_FR_SIDECAR_AUTO=1"
if (Test-Path $frPy) {
    $envExtra += "`r`nFM_FR_PY=$frPy"
    Write-Host "  FR Python: $frPy" -ForegroundColor Gray
} else {
    Write-Host '  Warning: fr-sidecar venv not found — run START-FACE-MATCHING.bat once after install.' -ForegroundColor Yellow
}

Write-Host '  Registering service...' -ForegroundColor Gray
& $nssm install $ServiceName $nodeExe
& $nssm set $ServiceName AppDirectory $AppRoot
& $nssm set $ServiceName AppParameters 'server.js'
& $nssm set $ServiceName DisplayName $DisplayName
& $nssm set $ServiceName Description 'Ubitron Mobility C2 - BWC fleet, live video, PTT, analytics. Operators use the portal URL; no console required.'
& $nssm set $ServiceName Start SERVICE_AUTO_START
& $nssm set $ServiceName AppStdout $stdoutLog
& $nssm set $ServiceName AppStderr $stderrLog
& $nssm set $ServiceName AppStdoutCreationDisposition 4
& $nssm set $ServiceName AppStderrCreationDisposition 4
& $nssm set $ServiceName AppRotateFiles 1
& $nssm set $ServiceName AppRotateBytes 10485760
& $nssm set $ServiceName AppExit Default Restart
& $nssm set $ServiceName AppRestartDelay 5000
& $nssm set $ServiceName AppEnvironmentExtra $envExtra

Write-Host '  Starting service...' -ForegroundColor Gray
& $nssm start $ServiceName
Start-Sleep -Seconds 8

$svc = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($svc -and $svc.Status -eq 'Paused') {
    & $nssm continue $ServiceName 2>$null | Out-Null
    Start-Sleep -Seconds 5
    $svc = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
}
$port = 3988
$envPath = Join-Path $AppRoot '.env'
if (Test-Path $envPath) {
    $m = Select-String -Path $envPath -Pattern '(?m)^FM_HTTP_PORT=(\d+)' -AllMatches -ErrorAction SilentlyContinue
    if ($m -and $m.Matches.Count) { $port = [int]$m.Matches[0].Groups[1].Value }
    else {
        $m2 = Select-String -Path $envPath -Pattern '(?m)^PORT=(\d+)' -AllMatches -ErrorAction SilentlyContinue
        if ($m2 -and $m2.Matches.Count) { $port = [int]$m2.Matches[0].Groups[1].Value }
    }
}

Write-Host ''
if ($svc -and $svc.Status -eq 'Running') {
    Write-Host 'UBITRON C2 SERVICE OK' -ForegroundColor Green
    Write-Host "  Status:  Running ($ServiceName)"
    Write-Host "  Portal:  http://localhost:$port  (or Operator URL from Settings)"
    Write-Host "  Logs:    $stdoutLog"
    Write-Host '  IT:      net stop UbitronC2  |  net start UbitronC2'
    Write-Host '  Remove:  .\UNINSTALL-UBITRON-SERVICE.ps1'
    Write-Host ''
    Write-Host 'Operators: bookmark the portal — do not use RESTART-FLEET.bat in production.' -ForegroundColor DarkGray
    if ($PauseAtEnd -or $env:UBITRON_SERVICE_INSTALL_PAUSE -eq '1') {
        Write-Host 'Press any key to close...' -ForegroundColor Gray
        $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
    }
    exit 0
}

Write-Host 'SERVICE NOT RUNNING YET' -ForegroundColor Red
Write-Host "  $stderrLog"
Write-Host "  $stdoutLog"
if ($svc) { Write-Host "  Service status: $($svc.Status)" -ForegroundColor Red }
Write-Host ''
Write-Host 'For now use lab mode: double-click RESTART-FLEET.bat (keep window open).' -ForegroundColor Yellow
if ($PauseAtEnd -or $env:UBITRON_SERVICE_INSTALL_PAUSE -eq '1') {
    Write-Host 'Press any key to close...' -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
}
exit 1
