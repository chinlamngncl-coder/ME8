param(
    [Parameter(Mandatory = $true)][string]$AppRoot,
    [string]$StorageRoot = '',
    [string]$NodeExe = '',
    [string]$ReportPath = ''
)
$ErrorActionPreference = 'Stop'

$AppRoot = (Resolve-Path $AppRoot).Path
if (-not $StorageRoot) { $StorageRoot = Join-Path $AppRoot 'storage' }
if (-not $NodeExe) {
    $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
    if (-not $nodeCommand -or -not $nodeCommand.Source) {
        throw 'Startup preflight failed: bundled or system Node.js was not found.'
    }
    $NodeExe = $nodeCommand.Source
}

$probe = Join-Path $AppRoot 'scripts\startup-preflight.js'
if (-not (Test-Path $probe)) {
    throw "Startup preflight failed: missing $probe"
}

Write-Host '  Running startup preflight and isolated listener probe...' -ForegroundColor Gray
$output = & $NodeExe $probe --app-root $AppRoot --storage-root $StorageRoot --json 2>&1
$exitCode = $LASTEXITCODE
$text = ($output | ForEach-Object { "$_" }) -join [Environment]::NewLine

try {
    $report = $text | ConvertFrom-Json
} catch {
    throw "Startup preflight returned unreadable output: $text"
}

if ($ReportPath) {
    $reportDir = Split-Path $ReportPath -Parent
    if ($reportDir) { New-Item -ItemType Directory -Force -Path $reportDir | Out-Null }
    $report | ConvertTo-Json -Depth 8 | Set-Content -Path $ReportPath -Encoding UTF8
}

if ($exitCode -ne 0 -or -not $report.ok) {
    $reason = if ($report.error) { $report.error } else { 'unknown preflight failure' }
    throw "Startup preflight blocked this build: $reason"
}

Write-Host '  PREFLIGHT PASS: dependencies, configuration, storage, database clone, HTTP, SIP and PTT.' -ForegroundColor Green
return $report
