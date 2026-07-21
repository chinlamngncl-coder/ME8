param(
    [Parameter(Mandatory = $true)][string]$CandidateRoot,
    [string]$ServiceName = 'UbitronC2',
    [int]$HealthTimeoutSec = 60,
    [int]$StableHealthChecks = 3,
    [ValidateSet('', 'after-stop', 'after-cutover', 'after-start')][string]$InjectFailurePhase = ''
)
$ErrorActionPreference = 'Stop'

function Test-Admin {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-NssmValue([string]$Name) {
    $value = (& $script:Nssm get $script:ServiceName $Name 2>$null | Out-String)
    if ($LASTEXITCODE -ne 0) { return '' }
    return $value.TrimEnd()
}

function Set-NssmValue([string]$Name, [string]$Value) {
    & $script:Nssm set $script:ServiceName $Name $Value | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Could not set service property $Name" }
}

function Write-TransactionState([string]$Phase, [string]$Message, [bool]$Ok) {
    $script:State.phase = $Phase
    $script:State.message = $Message
    $script:State.ok = $Ok
    $script:State.updatedAt = (Get-Date).ToString('o')
    $temp = $script:StatePath + '.tmp'
    $script:State | ConvertTo-Json -Depth 8 | Set-Content -Path $temp -Encoding UTF8
    Move-Item -Path $temp -Destination $script:StatePath -Force
}

function Wait-ServiceStatus([string]$Wanted, [int]$Seconds) {
    $deadline = (Get-Date).AddSeconds($Seconds)
    do {
        $service = Get-Service -Name $script:ServiceName -ErrorAction SilentlyContinue
        if ($service -and "$($service.Status)" -eq $Wanted) { return $true }
        Start-Sleep -Milliseconds 500
    } while ((Get-Date) -lt $deadline)
    return $false
}

function Stop-UbitronService {
    $service = Get-Service -Name $script:ServiceName -ErrorAction SilentlyContinue
    if (-not $service) { return }
    if ($service.Status -eq 'Paused') {
        & $script:Nssm stop $script:ServiceName confirm 2>$null | Out-Null
    } else {
        Stop-Service -Name $script:ServiceName -Force -ErrorAction SilentlyContinue
    }
    if (-not (Wait-ServiceStatus -Wanted 'Stopped' -Seconds 25)) {
        & $script:Nssm stop $script:ServiceName confirm 2>$null | Out-Null
        if (-not (Wait-ServiceStatus -Wanted 'Stopped' -Seconds 10)) {
            throw "Service $($script:ServiceName) would not stop safely."
        }
    }
}

function Start-UbitronService {
    Start-Service -Name $script:ServiceName
    if (-not (Wait-ServiceStatus -Wanted 'Running' -Seconds 20)) {
        $service = Get-Service -Name $script:ServiceName -ErrorAction SilentlyContinue
        $status = if ($service) { "$($service.Status)" } else { 'missing' }
        throw "Service did not reach Running state (status: $status)."
    }
}

function Read-HttpPort([string]$Root) {
    $port = 3988
    $envFile = Join-Path $Root '.env'
    if (Test-Path $envFile) {
        $match = Select-String -Path $envFile -Pattern '^(?:FM_HTTP_PORT|PORT)=(\d+)\s*$' |
            Select-Object -First 1
        if ($match -and $match.Matches.Count) { $port = [int]$match.Matches[0].Groups[1].Value }
    }
    return $port
}

function Wait-StableHealth([string]$Root, [bool]$RequireExtended = $true) {
    $port = Read-HttpPort -Root $Root
    $uri = "http://127.0.0.1:$port/api/health"
    $deadline = (Get-Date).AddSeconds($script:HealthTimeoutSec)
    $stable = 0
    $lastReason = 'health endpoint did not answer'
    while ((Get-Date) -lt $deadline) {
        try {
            $health = Invoke-RestMethod -Uri $uri -TimeoutSec 5
            $coreReady = $health.ok -and $health.dashboard.httpReady -and $health.dashboard.sipReady `
                -and $health.dashboard.pttReady -and $health.dashboard.poolReady
            $extendedReady = (-not $RequireExtended) `
                -or ($health.dashboard.databaseReady -and $health.dashboard.storageWritable)
            $complete = $coreReady -and $extendedReady
            if ($complete) {
                $stable += 1
                if ($stable -ge $script:StableHealthChecks) { return $health }
            } else {
                $stable = 0
                $lastReason = 'health reported: ' + (($health.reasons | ForEach-Object { "$_" }) -join ', ')
            }
        } catch {
            $stable = 0
            $lastReason = $_.Exception.Message
        }
        Start-Sleep -Seconds 2
    }
    throw "Stable health gate failed at $uri ($lastReason)."
}

function Read-EnvValue([string]$Root, [string]$Name, [string]$Fallback) {
    $envFile = Join-Path $Root '.env'
    if (Test-Path $envFile) {
        $match = Select-String -Path $envFile -Pattern ("^" + [regex]::Escape($Name) + "=(.+)$") |
            Select-Object -First 1
        if ($match -and $match.Matches.Count) {
            return $match.Matches[0].Groups[1].Value.Trim().Trim('"')
        }
    }
    return $Fallback
}

function New-PostgresSnapshot([string]$Root, [string]$Destination) {
    $container = Read-EnvValue -Root $Root -Name 'FM_POSTGRES_CONTAINER' -Fallback 'mobility-postgres'
    $user = Read-EnvValue -Root $Root -Name 'FM_POSTGRES_USER' -Fallback 'mobility'
    $database = Read-EnvValue -Root $Root -Name 'FM_POSTGRES_DB' -Fallback 'mobility'
    New-Item -ItemType Directory -Force -Path (Split-Path $Destination -Parent) | Out-Null
    $remote = "/tmp/me8-upgrade-$($script:transactionId).pgdump"
    & docker exec $container pg_dump --username $user --dbname $database --format custom --file $remote
    if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL pg_dump failed before cutover.' }
    try {
        & docker exec $container pg_restore --list $remote | Out-Null
        if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL snapshot verification failed.' }
        & docker cp "${container}:$remote" $Destination | Out-Null
        if ($LASTEXITCODE -ne 0 -or -not (Test-Path $Destination)) {
            throw 'Could not copy verified PostgreSQL snapshot from the container.'
        }
        $hash = (Get-FileHash -Algorithm SHA256 -Path $Destination).Hash.ToLowerInvariant()
        @{ path = $Destination; sha256 = $hash; bytes = (Get-Item $Destination).Length } |
            ConvertTo-Json | Set-Content -Path ($Destination + '.json') -Encoding UTF8
    } finally {
        & docker exec $container rm -f $remote 2>$null | Out-Null
    }
}

function Restore-PostgresSnapshot([string]$Root, [string]$Source) {
    if (-not (Test-Path $Source)) { throw "PostgreSQL rollback snapshot missing: $Source" }
    $manifest = Get-Content ($Source + '.json') -Raw | ConvertFrom-Json
    $actual = (Get-FileHash -Algorithm SHA256 -Path $Source).Hash.ToLowerInvariant()
    if ($actual -ne $manifest.sha256) { throw 'PostgreSQL rollback snapshot hash mismatch.' }
    $container = Read-EnvValue -Root $Root -Name 'FM_POSTGRES_CONTAINER' -Fallback 'mobility-postgres'
    $user = Read-EnvValue -Root $Root -Name 'FM_POSTGRES_USER' -Fallback 'mobility'
    $database = Read-EnvValue -Root $Root -Name 'FM_POSTGRES_DB' -Fallback 'mobility'
    $remote = "/tmp/me8-rollback-$($script:transactionId).pgdump"
    & docker cp $Source "${container}:$remote" | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Could not stage PostgreSQL rollback snapshot.' }
    try {
        & docker exec $container pg_restore --list $remote | Out-Null
        if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL rollback snapshot is unreadable.' }
        & docker exec $container pg_restore --clean --if-exists --exit-on-error `
            --username $user --dbname $database $remote
        if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL rollback restore failed.' }
        & docker exec $container psql --username $user --dbname $database `
            --tuples-only --command 'SELECT MAX(version) FROM schema_migrations;' | Out-Null
        if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL rollback verification query failed.' }
    } finally {
        & docker exec $container rm -f $remote 2>$null | Out-Null
    }
}

function Ensure-SharedRuntime([string]$PreviousRoot, [string]$NextRoot) {
    if ($PreviousRoot -eq $NextRoot) { return (Join-Path $PreviousRoot 'storage') }
    $sharedStorage = Join-Path $PreviousRoot 'storage'
    $candidateStorage = Join-Path $NextRoot 'storage'
    if (-not (Test-Path $sharedStorage)) { throw "Current shared storage is missing: $sharedStorage" }
    if (Test-Path $candidateStorage) {
        $item = Get-Item $candidateStorage -Force
        $isLink = [bool]($item.Attributes -band [IO.FileAttributes]::ReparsePoint)
        if (-not $isLink) {
            $entries = @(Get-ChildItem -Force $candidateStorage -ErrorAction SilentlyContinue)
            if ($entries.Count -gt 0) {
                throw 'Candidate storage contains files. Code releases must not overwrite customer storage.'
            }
            Remove-Item $candidateStorage -Force
        } else {
            Remove-Item $candidateStorage -Force
        }
    }
    New-Item -ItemType Junction -Path $candidateStorage -Target $sharedStorage | Out-Null

    $oldEnv = Join-Path $PreviousRoot '.env'
    $newEnv = Join-Path $NextRoot '.env'
    if ((Test-Path $oldEnv) -and -not (Test-Path $newEnv)) {
        Copy-Item -Path $oldEnv -Destination $newEnv -Force
    }
    return $sharedStorage
}

if (-not (Test-Admin)) { throw 'Run this upgrade gate as Administrator.' }
$CandidateRoot = (Resolve-Path $CandidateRoot).Path
if (-not (Test-Path (Join-Path $CandidateRoot 'server.js'))) { throw "Invalid candidate root: $CandidateRoot" }

$existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if (-not $existing) { throw "Service $ServiceName is not installed. Use INSTALL-UBITRON-SERVICE.ps1 first." }

$Nssm = & (Join-Path $CandidateRoot 'scripts\me8-ship\Get-Nssm.ps1') -AppRoot $CandidateRoot
$previousRoot = Get-NssmValue 'AppDirectory'
if (-not $previousRoot -or -not (Test-Path $previousRoot)) {
    throw 'Could not determine the current service application directory.'
}
$previousRoot = (Resolve-Path $previousRoot).Path
$sharedStorage = Ensure-SharedRuntime -PreviousRoot $previousRoot -NextRoot $CandidateRoot
$transactions = Join-Path $sharedStorage 'upgrade-transactions'
$transactionId = (Get-Date).ToString('yyyyMMdd-HHmmss') + '-' + [Guid]::NewGuid().ToString('N').Substring(0, 8)
$transactionDir = Join-Path $transactions $transactionId
New-Item -ItemType Directory -Force -Path $transactionDir | Out-Null
$StatePath = Join-Path $transactionDir 'state.json'
$State = [ordered]@{
    id = $transactionId
    ok = $false
    phase = 'created'
    message = ''
    previousRoot = $previousRoot
    candidateRoot = $CandidateRoot
    createdAt = (Get-Date).ToString('o')
}

$snapshot = [ordered]@{
    Application = Get-NssmValue 'Application'
    AppDirectory = $previousRoot
    AppParameters = Get-NssmValue 'AppParameters'
    AppEnvironmentExtra = Get-NssmValue 'AppEnvironmentExtra'
    AppStdout = Get-NssmValue 'AppStdout'
    AppStderr = Get-NssmValue 'AppStderr'
    AppExitDefault = ((& $Nssm get $ServiceName AppExit Default 2>$null | Out-String).Trim())
}
$snapshot | ConvertTo-Json -Depth 4 | Set-Content -Path (Join-Path $transactionDir 'service-before.json') -Encoding UTF8

$preflightScript = Join-Path $CandidateRoot 'scripts\me8-ship\Test-UbitronStartupPreflight.ps1'
& $preflightScript -AppRoot $CandidateRoot -StorageRoot $sharedStorage `
    -NodeExe $snapshot.Application -ReportPath (Join-Path $transactionDir 'preflight.json') | Out-Null
Write-TransactionState -Phase 'preflight-passed' -Message 'Candidate preflight passed without stopping the current service.' -Ok $false

$databaseBackup = Join-Path $transactionDir 'database-before.pgdump'
$cutoverStarted = $false
try {
    Write-Host '  Stopping current service for transactional cutover...' -ForegroundColor Gray
    Stop-UbitronService
    $cutoverStarted = $true
    New-PostgresSnapshot -Root $previousRoot -Destination $databaseBackup
    Write-TransactionState -Phase 'stopped-and-backed-up' -Message 'Current service stopped and database snapshot saved.' -Ok $false
    if ($InjectFailurePhase -eq 'after-stop') { throw 'Injected failure after stop' }

    Set-NssmValue 'AppDirectory' $CandidateRoot
    Set-NssmValue 'AppParameters' 'server.js'
    Set-NssmValue 'AppStdout' (Join-Path $sharedStorage 'service-stdout.log')
    Set-NssmValue 'AppStderr' (Join-Path $sharedStorage 'service-stderr.log')
    & $Nssm set $ServiceName AppExit Default Exit | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Could not configure bounded service exit behavior.' }
    & sc.exe failure $ServiceName reset= 86400 actions= restart/5000/restart/15000/none/0 | Out-Null
    & sc.exe failureflag $ServiceName 1 | Out-Null
    Write-TransactionState -Phase 'candidate-configured' -Message 'Service points to candidate with bounded recovery.' -Ok $false
    if ($InjectFailurePhase -eq 'after-cutover') { throw 'Injected failure after cutover' }

    Start-UbitronService
    if ($InjectFailurePhase -eq 'after-start') { throw 'Injected failure after start' }
    $health = Wait-StableHealth -Root $CandidateRoot
    $health | ConvertTo-Json -Depth 8 | Set-Content -Path (Join-Path $transactionDir 'health-after.json') -Encoding UTF8
    Write-TransactionState -Phase 'committed' -Message 'Candidate passed stable production health checks.' -Ok $true
    Write-Host '  UPGRADE COMMITTED: candidate is healthy; previous build and database snapshot are retained.' -ForegroundColor Green
    exit 0
} catch {
    $failure = $_.Exception.Message
    Write-Host "  CUTOVER FAILED: $failure" -ForegroundColor Red
    if ($cutoverStarted) {
        Write-Host '  Restoring previous service and database automatically...' -ForegroundColor Yellow
        Stop-UbitronService
        Restore-PostgresSnapshot -Root $previousRoot -Source $databaseBackup
        Set-NssmValue 'Application' $snapshot.Application
        Set-NssmValue 'AppDirectory' $snapshot.AppDirectory
        Set-NssmValue 'AppParameters' $snapshot.AppParameters
        if ($snapshot.AppEnvironmentExtra) { Set-NssmValue 'AppEnvironmentExtra' $snapshot.AppEnvironmentExtra }
        Set-NssmValue 'AppStdout' $snapshot.AppStdout
        Set-NssmValue 'AppStderr' $snapshot.AppStderr
        $previousExitAction = if ($snapshot.AppExitDefault) { $snapshot.AppExitDefault } else { 'Restart' }
        & $Nssm set $ServiceName AppExit Default $previousExitAction | Out-Null
        Start-UbitronService
        $rollbackHealth = Wait-StableHealth -Root $previousRoot -RequireExtended $false
        $rollbackHealth | ConvertTo-Json -Depth 8 |
            Set-Content -Path (Join-Path $transactionDir 'health-rollback.json') -Encoding UTF8
        Write-TransactionState -Phase 'rolled-back' -Message $failure -Ok $false
        Write-Host '  ROLLBACK PASS: the previous healthy build is running.' -ForegroundColor Green
    } else {
        Write-TransactionState -Phase 'preflight-failed' -Message $failure -Ok $false
    }
    throw "Upgrade was not committed. $failure"
}
