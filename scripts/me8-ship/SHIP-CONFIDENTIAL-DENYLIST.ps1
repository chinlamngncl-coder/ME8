# Shared confidential-artifact denylist for ME8 customer packs.
# Dot-source from PACK-ME8-SKELETON.ps1 and VERIFY-ME8-FRESH.ps1.

function Get-ShipConfidentialDenylist {
    param([string]$Me8Root)
    $path = Join-Path $Me8Root 'pack\me8-fresh\SHIP-CONFIDENTIAL-DENYLIST.json'
    if (-not (Test-Path $path)) {
        throw "SHIP-CONFIDENTIAL-DENYLIST.json missing: $path"
    }
    return Get-Content $path -Raw -Encoding UTF8 | ConvertFrom-Json
}

function Remove-ShipConfidentialArtifacts {
    param(
        [string]$PackRoot,
        [string]$DenylistSourceRoot
    )
    $deny = Get-ShipConfidentialDenylist -Me8Root $DenylistSourceRoot
    $removed = @()

    foreach ($rel in @($deny.purgeFromCustomerPack)) {
        if (-not $rel) { continue }
        $target = Join-Path $PackRoot ($rel -replace '/', '\')
        if (Test-Path $target) {
            Remove-Item $target -Force -ErrorAction Stop
            $removed += $rel
        }
    }

    Get-ChildItem $PackRoot -Recurse -File -Force -ErrorAction SilentlyContinue | ForEach-Object {
        $name = $_.Name
        foreach ($forbiddenName in @($deny.forbiddenFileNames)) {
            if (-not $forbiddenName) { continue }
            if ($name -ieq $forbiddenName) {
                Remove-Item $_.FullName -Force -ErrorAction Stop
                $rel = $_.FullName.Substring($PackRoot.Length).TrimStart('\')
                $removed += $rel
                break
            }
        }
    }

    return $removed
}

function Test-ShipConfidentialDenylist {
    param(
        [string]$PackRoot,
        [string]$DenylistSourceRoot,
        [scriptblock]$OnFail = { param($msg) Write-Host "[fail] $msg" -ForegroundColor Red },
        [scriptblock]$OnOk = { param($msg) }
    )
    $deny = Get-ShipConfidentialDenylist -Me8Root $DenylistSourceRoot
    $failures = @()
    $textExt = @('.js', '.json', '.md', '.html', '.htm', '.txt', '.bat', '.ps1', '.example', '.env', '.csv', '.yaml', '.yml', '.pem', '.key')

    Get-ChildItem $PackRoot -Recurse -Force -ErrorAction SilentlyContinue | ForEach-Object {
        if (-not $_.PSIsContainer) {
            $rel = $_.FullName.Substring($PackRoot.Length).TrimStart('\')
            $relNorm = $rel -replace '/', '\'
            $segments = $relNorm -split '\\'

            foreach ($segment in @($deny.forbiddenPathSegments)) {
                if (-not $segment) { continue }
                foreach ($part in $segments) {
                    if ($part -ieq $segment) {
                        $failures += "forbidden path segment '$segment': $relNorm"
                        break
                    }
                }
            }

            foreach ($forbiddenName in @($deny.forbiddenFileNames)) {
                if (-not $forbiddenName) { continue }
                if ($_.Name -ieq $forbiddenName) {
                    $failures += "forbidden file name '$forbiddenName': $relNorm"
                }
            }

            foreach ($forbiddenRel in @($deny.forbiddenRelativePaths)) {
                if (-not $forbiddenRel) { continue }
                $wanted = ($forbiddenRel -replace '/', '\')
                if ($relNorm -ieq $wanted) {
                    $failures += "forbidden internal doc: $relNorm"
                }
            }

            $ext = [System.IO.Path]::GetExtension($_.Name).ToLowerInvariant()
            $skipContent = @(
                'SHIP-CONFIDENTIAL-DENYLIST.json',
                'SHIP-CONFIDENTIAL-DENYLIST.ps1'
            )
            if ($skipContent -contains $_.Name) { return }
            if ($textExt -contains $ext -or $_.Name -eq '.env') {
                try {
                    $raw = Get-Content $_.FullName -Raw -Encoding UTF8 -ErrorAction Stop
                    if ($raw -match '-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----') {
                        $failures += "private key material: $relNorm"
                    }
                } catch {
                    $failures += "unreadable file during confidential scan: $relNorm"
                }
            }
        }
    }

    if ($failures.Count -gt 0) {
        foreach ($msg in $failures) { & $OnFail $msg }
        return @{ ok = $false; failures = $failures }
    }

    & $OnOk 'no confidential artifacts in customer pack'
    return @{ ok = $true; failures = @() }
}
