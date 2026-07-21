param(
    [string]$AppRoot = '',
    [string]$ContainerName = 'mobility-postgres'
)
$ErrorActionPreference = 'Stop'

if (-not $AppRoot) { $AppRoot = Split-Path $PSScriptRoot -Parent }
$AppRoot = (Resolve-Path $AppRoot).Path
$envPath = Join-Path $AppRoot '.env'
if (-not (Test-Path $envPath)) { throw "Missing application environment: $envPath" }

$inspect = docker inspect $ContainerName | ConvertFrom-Json
if (-not $inspect -or -not $inspect[0]) { throw "PostgreSQL container not found: $ContainerName" }
$containerEnv = @{}
$inspect[0].Config.Env | ForEach-Object {
    $parts = $_ -split '=', 2
    if ($parts.Count -eq 2) { $containerEnv[$parts[0]] = $parts[1] }
}

$user = [string]$containerEnv.POSTGRES_USER
$password = [string]$containerEnv.POSTGRES_PASSWORD
$database = [string]$containerEnv.POSTGRES_DB
if (-not $user -or -not $password -or -not $database) {
    throw 'PostgreSQL container credentials are incomplete.'
}

$encodedUser = [Uri]::EscapeDataString($user)
$encodedPassword = [Uri]::EscapeDataString($password)
$encodedDatabase = [Uri]::EscapeDataString($database)
$catalogUrl = "postgresql://${encodedUser}:${encodedPassword}@127.0.0.1:5432/${encodedDatabase}"
$updates = [ordered]@{
    FM_CATALOG_MODE = 'postgres_required'
    FM_CATALOG_DB_URL = $catalogUrl
    FM_CATALOG_ALLOW_SQLITE_QUEUE = '0'
    FM_POSTGRES_CONTAINER = $ContainerName
}

$lines = [System.Collections.Generic.List[string]]::new()
Get-Content -Path $envPath | ForEach-Object { $lines.Add($_) }
foreach ($key in $updates.Keys) {
    $replacement = "$key=$($updates[$key])"
    $found = $false
    for ($i = 0; $i -lt $lines.Count; $i += 1) {
        if ($lines[$i] -match ('^\s*' + [Regex]::Escape($key) + '=')) {
            $lines[$i] = $replacement
            $found = $true
            break
        }
    }
    if (-not $found) { $lines.Add($replacement) }
}

$temp = $envPath + '.catalog.tmp'
[IO.File]::WriteAllLines($temp, $lines, [Text.UTF8Encoding]::new($false))
Move-Item -Path $temp -Destination $envPath -Force
Write-Host 'PostgreSQL catalog configuration written without displaying credentials.' -ForegroundColor Green
