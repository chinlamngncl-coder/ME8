# Prefer real Wi-Fi / Ethernet IPv4 for Mobility HOST / browser open.
# NEVER pick WSL / Hyper-V / Docker virtual NICs (often 172.17–172.31) — cameras and PTT die there.
# See docs/MOB-DISC-NO-WSL-172-AS-SERVER-IP.md
param([switch]$Print)

function Test-UbitronBadLanInterface([string]$alias) {
    $a = [string]$alias
    if ($a -match '(?i)WSL|Hyper-V|vEthernet|Docker|vgate|Bluetooth|Loopback|Local Area Connection') { return $true }
    return $false
}

function Test-UbitronBadLanIp([string]$ip) {
    if ([string]::IsNullOrWhiteSpace($ip)) { return $true }
    if ($ip -like '127.*') { return $true }
    if ($ip -like '169.254.*') { return $true }
    # Docker / common WSL NAT ranges — never as BWC SIP / dashboard host
    if ($ip -match '^172\.(1[7-9]|2[0-9]|3[0-1])\.') { return $true }
    return $false
}

function Get-UbitronPreferredLanIPv4 {
    $rows = @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object {
            -not (Test-UbitronBadLanIp $_.IPAddress) -and
            $_.PrefixOrigin -ne 'WellKnown'
        })

    $scored = foreach ($r in $rows) {
        $alias = ''
        try {
            $ad = Get-NetAdapter -InterfaceIndex $r.InterfaceIndex -ErrorAction SilentlyContinue
            if ($ad) { $alias = [string]$ad.Name }
        } catch { }
        if (Test-UbitronBadLanInterface $alias) { continue }

        $score = 50
        if ($alias -match '(?i)Wi-?Fi|WLAN|Wireless') { $score = 100 }
        elseif ($alias -match '(?i)^Ethernet') { $score = 90 }
        if ($r.IPAddress -like '192.168.*') { $score += 20 }
        elseif ($r.IPAddress -like '10.*') { $score += 10 }

        [pscustomobject]@{ Ip = $r.IPAddress; Alias = $alias; Score = $score }
    }

    $best = @($scored | Sort-Object Score -Descending | Select-Object -First 1)
    if ($best.Count -gt 0 -and $best[0].Ip) { return [string]$best[0].Ip }
    return $null
}

if ($Print) {
    $ip = Get-UbitronPreferredLanIPv4
    if ($ip) { Write-Output $ip }
}
