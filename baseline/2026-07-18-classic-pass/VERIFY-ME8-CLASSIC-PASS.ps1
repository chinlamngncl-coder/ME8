# Verify live ME8 matches classic-PASS backup (SHA256).
param([string]$AppRoot = '')
$ErrorActionPreference = 'Stop'
$baseline = $PSScriptRoot
if (-not $AppRoot) {
    $AppRoot = Resolve-Path (Join-Path $baseline '..\..')
    if (-not (Test-Path (Join-Path $AppRoot 'server.js'))) {
        $AppRoot = 'C:\Users\user\Desktop\Enterprise Mobility\ME8'
    }
}

function Get-FileSha256([string]$Path) {
    return (Get-FileHash -Path $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

$hashes = Get-Content (Join-Path $baseline 'HASHES.json') -Raw | ConvertFrom-Json
Write-Host 'VERIFY ME8 classic-PASS backup'
Write-Host "  LIVE     $AppRoot"
Write-Host "  BASELINE $baseline"
Write-Host ''

$ok = 0
$missingLive = 0
$missingBase = 0
$mismatch = 0

foreach ($entry in $hashes.files) {
    $rel = $entry.path -replace '/', '\'
    $live = Join-Path $AppRoot $rel
    $snap = Join-Path $baseline $rel
    if (-not (Test-Path $live)) {
        Write-Host "  MISSING LIVE: $($entry.path)" -ForegroundColor Red
        $missingLive++
        continue
    }
    if (-not (Test-Path $snap)) {
        Write-Host "  MISSING BASELINE: $($entry.path)" -ForegroundColor Red
        $missingBase++
        continue
    }
    $liveHash = $null
    try {
        $liveHash = Get-FileSha256 $live
    } catch {
        if ($entry.path -eq 'storage/mobility.db') {
            $liveLen = (Get-Item $live -ErrorAction SilentlyContinue).Length
            $baseLen = (Get-Item $snap -ErrorAction SilentlyContinue).Length
            if ($liveLen -gt 0 -and $liveLen -eq $baseLen) {
                Write-Host "  OK (db locked, size match): $($entry.path)" -ForegroundColor DarkGray
                $ok++
                continue
            }
        }
        Write-Host "  HASH ERROR: $($entry.path)" -ForegroundColor Red
        $mismatch++
        continue
    }
    if ($liveHash -ne $entry.sha256) {
        Write-Host "  MISMATCH: $($entry.path)" -ForegroundColor Yellow
        $mismatch++
        continue
    }
    $ok++
}

Write-Host ''
Write-Host "Match: $ok / $($hashes.files.Count)"
Write-Host "Missing live: $missingLive | Missing baseline: $missingBase | Mismatch: $mismatch"
if ($missingLive -eq 0 -and $missingBase -eq 0 -and $mismatch -eq 0) {
    Write-Host 'VERIFY OK - live ME8 matches classic-PASS backup.' -ForegroundColor Green
    exit 0
}
Write-Host 'VERIFY FAILED' -ForegroundColor Red
exit 1
