#Requires -Version 5.1
param(
    [switch]$SkipDockerExport,
    [switch]$SkipZip
)
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

function Write-Step([string]$m) { Write-Host $m -ForegroundColor Cyan }
function Fail([string]$m) { Write-Host ("FATAL: " + $m) -ForegroundColor Red; exit 1 }

Write-Host ''
Write-Host 'PACK-CN-AIRGAP-V2' -ForegroundColor Cyan

$Master = Join-Path $Root 'master_license.json'
if (-not (Test-Path $Master)) { Fail 'master_license.json missing' }

$stamp = Get-Date -Format 'yyyyMMdd-HHmm'
$StageName = 'Mobility_Axiom_AirGapped_CN'
$Stage = Join-Path $Root ('dist\' + $StageName)
$Zip = Join-Path $Root ('dist\' + $StageName + '-' + $stamp + '.zip')

# Preserve docker tars across stage wipe (1.0 GB+ — avoid re-export every pack)
$imgCache = Join-Path $Root 'dist\_docker-image-cache'
New-Item -ItemType Directory -Force -Path $imgCache | Out-Null
$prevImg = Join-Path $Stage 'vendor\docker-images'
if (Test-Path $prevImg) {
    Write-Step '[cache] seed docker tars from previous stage'
    Get-ChildItem $prevImg -Filter '*.tar' -ErrorAction SilentlyContinue | ForEach-Object {
        Copy-Item -Force $_.FullName (Join-Path $imgCache $_.Name)
        Write-Host ('  keep ' + $_.Name)
    }
}

Write-Step ('[stage] Cleaning ' + $Stage)
if (Test-Path $Stage) { Remove-Item -Recurse -Force $Stage }
New-Item -ItemType Directory -Force -Path $Stage, (Join-Path $Stage 'scripts'), (Join-Path $Stage 'storage') | Out-Null

$Protected = Join-Path $Root 'ship-build\protected'
# Always rebuild — never ship a stale July run.js when source moved on (weapons/UI/auth, etc.)
Write-Step '[build] npm run build:ship (forced fresh)'
npm run build:ship
if ($LASTEXITCODE -ne 0) { Fail 'build:ship failed' }
if (-not (Test-Path (Join-Path $Protected 'run.js'))) { Fail 'run.js missing after build:ship' }
$runAgeHrs = ((Get-Date) - (Get-Item (Join-Path $Protected 'run.js')).LastWriteTime).TotalHours
if ($runAgeHrs -gt 12) { Fail ('run.js still stale after build (ageHrs=' + [math]::Round($runAgeHrs, 1) + ')') }
Write-Host ('  OK fresh run.js ageHrs=' + [math]::Round($runAgeHrs, 2))

$Sb = Join-Path $Stage 'ship-build'
$SbProt = Join-Path $Sb 'protected'
$SbStorage = Join-Path $Sb 'storage'
$SbVendorFf = Join-Path $Sb 'vendor\ffmpeg-lgpl'
$SbScripts = Join-Path $Sb 'scripts'
New-Item -ItemType Directory -Force -Path $SbProt, $SbStorage, $SbVendorFf, $SbScripts | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $Stage 'storage'), (Join-Path $Stage 'vendor\ffmpeg-lgpl'), (Join-Path $Stage 'scripts'), (Join-Path $Stage 'keys') | Out-Null

Write-Step '[copy] protected runtime'
Copy-Item -Recurse -Force (Join-Path $Protected '*') $SbProt

Write-Step '[copy] node_modules'
$Nm = Join-Path $Root 'node_modules'
if (-not (Test-Path (Join-Path $Nm 'express'))) { Fail 'node_modules incomplete' }
robocopy $Nm (Join-Path $SbProt 'node_modules') /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
if ($LASTEXITCODE -ge 8) { Fail ('robocopy node_modules failed ' + $LASTEXITCODE) }
$global:LASTEXITCODE = 0
Copy-Item -Force (Join-Path $Root 'package.json') (Join-Path $SbProt 'package.json') -ErrorAction SilentlyContinue
Copy-Item -Force (Join-Path $Root 'package-lock.json') (Join-Path $SbProt 'package-lock.json') -ErrorAction SilentlyContinue

Write-Step '[copy] public docker launchers'
foreach ($rel in @('public', 'docker', 'Axiom_Enterprise_Setup.bat', 'axiom_setup.sh', '.env.deploy.example', 'package.json')) {
    $src = Join-Path $Root $rel
    if (Test-Path $src) {
        if (Test-Path $src -PathType Container) { Copy-Item -Recurse -Force $src (Join-Path $Stage $rel) }
        else { Copy-Item -Force $src (Join-Path $Stage $rel) }
    }
}
if (Test-Path (Join-Path $Root 'public')) {
    New-Item -ItemType Directory -Force -Path (Join-Path $SbProt 'public') | Out-Null
    robocopy (Join-Path $Root 'public') (Join-Path $SbProt 'public') /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
    $global:LASTEXITCODE = 0
}

$Ffmpeg = Join-Path $Root 'vendor\ffmpeg-lgpl\ffmpeg.exe'
if (-not (Test-Path $Ffmpeg)) { Fail 'ffmpeg.exe missing' }
Copy-Item -Force $Ffmpeg (Join-Path $SbVendorFf 'ffmpeg.exe')
Copy-Item -Force $Ffmpeg (Join-Path $Stage 'vendor\ffmpeg-lgpl\ffmpeg.exe')

$Gis = Join-Path $Root 'data\gis\offline'
if (-not (Test-Path $Gis)) { Fail 'data/gis/offline missing' }
New-Item -ItemType Directory -Force -Path (Join-Path $Stage 'data\gis'), (Join-Path $Sb 'data\gis') | Out-Null
robocopy $Gis (Join-Path $Stage 'data\gis\offline') /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
$global:LASTEXITCODE = 0
robocopy $Gis (Join-Path $Sb 'data\gis\offline') /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
$global:LASTEXITCODE = 0

Write-Step '[license] ship-build/storage/license.lic'
Copy-Item -Force $Master (Join-Path $SbStorage 'license.lic')
Copy-Item -Force $Master (Join-Path $SbStorage 'master_license.json')
Copy-Item -Force $Master (Join-Path $Stage 'storage\license.lic')
Copy-Item -Force $Master (Join-Path $Stage 'storage\master_license.json')
Copy-Item -Force $Master (Join-Path $Stage 'master_license.json')

# DB migrations — siteDb reads ship-build/db/migrations ( __dirname=protected → ../db )
$DbSrc = Join-Path $Root 'db'
if (-not (Test-Path (Join-Path $DbSrc 'migrations\001_catalog_primary.sql'))) { Fail 'db/migrations/001_catalog_primary.sql missing in ME8' }
New-Item -ItemType Directory -Force -Path (Join-Path $Sb 'db') | Out-Null
robocopy $DbSrc (Join-Path $Sb 'db') /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
$global:LASTEXITCODE = 0
New-Item -ItemType Directory -Force -Path (Join-Path $Stage 'db') | Out-Null
robocopy $DbSrc (Join-Path $Stage 'db') /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
$global:LASTEXITCODE = 0

# SIP bridge — server passes appRoot=BASE_DIR=ship-build/protected → needs protected/scripts/
# Child script also require('../lib/…') from that folder — pack the require graph (not only the .js entry).
$sip = Join-Path $Root 'scripts\wvp-sip-lan-proxy.js'
if (-not (Test-Path $sip)) { Fail 'wvp-sip-lan-proxy.js missing' }
$ProtScripts = Join-Path $SbProt 'scripts'
$ProtLib = Join-Path $SbProt 'lib'
$SbLib = Join-Path $Sb 'lib'
New-Item -ItemType Directory -Force -Path $ProtScripts, $SbScripts, $ProtLib, $SbLib, (Join-Path $Stage 'lib') | Out-Null
Copy-Item -Force $sip (Join-Path $ProtScripts 'wvp-sip-lan-proxy.js')
Copy-Item -Force $sip (Join-Path $SbScripts 'wvp-sip-lan-proxy.js')
Copy-Item -Force $sip (Join-Path $Stage 'scripts\wvp-sip-lan-proxy.js')
$sipLibs = @(
    'wvpSipLanMap.js',
    'wvpLabClient.js',
    'fleetLog.js',
    'siteTime.js',
    'glassFortressLog.js'
)
foreach ($lf in $sipLibs) {
    $srcLib = Join-Path $Root ('lib\' + $lf)
    if (-not (Test-Path $srcLib)) { Fail ('SIP lib missing in ME8: lib\' + $lf) }
    Copy-Item -Force $srcLib (Join-Path $ProtLib $lf)
    Copy-Item -Force $srcLib (Join-Path $SbLib $lf)
    Copy-Item -Force $srcLib (Join-Path $Stage ('lib\' + $lf))
}
Copy-Item -Force (Join-Path $Root 'scripts\Set-DeployHostEnv.ps1') (Join-Path $Stage 'scripts\Set-DeployHostEnv.ps1')
Copy-Item -Force (Join-Path $Root 'scripts\Set-DeployHostEnv.ps1') (Join-Path $SbScripts 'Set-DeployHostEnv.ps1')
# secrets vault ACL script (warn if missing — ship if present)
$acl = Join-Path $Root 'scripts\me8-ship\LOCK-SECRETS-ACL.ps1'
if (Test-Path $acl) {
    New-Item -ItemType Directory -Force -Path (Join-Path $Sb 'scripts\me8-ship'), (Join-Path $ProtScripts 'me8-ship') | Out-Null
    Copy-Item -Force $acl (Join-Path $Sb 'scripts\me8-ship\LOCK-SECRETS-ACL.ps1')
    Copy-Item -Force $acl (Join-Path $ProtScripts 'me8-ship\LOCK-SECRETS-ACL.ps1')
}

Write-Step '[node] portable Node 22'
$toolsNode = Join-Path $Stage 'tools\node'
New-Item -ItemType Directory -Force -Path $toolsNode | Out-Null
$nodeZip = Join-Path $Root 'vendor\node-win-x64-cache\node-v22.18.0-win-x64.zip'
if (-not (Test-Path $nodeZip)) { Fail 'node-v22.18.0-win-x64.zip missing' }
$tmpNode = Join-Path $Stage 'tools\_node_extract'
if (Test-Path $tmpNode) { Remove-Item -Recurse -Force $tmpNode }
New-Item -ItemType Directory -Force -Path $tmpNode | Out-Null
Expand-Archive -Path $nodeZip -DestinationPath $tmpNode -Force
$inner = Join-Path $tmpNode 'node-v22.18.0-win-x64'
Get-ChildItem $inner | ForEach-Object { Copy-Item -Recurse -Force $_.FullName (Join-Path $toolsNode $_.Name) }
Remove-Item -Recurse -Force $tmpNode
if (-not (Test-Path (Join-Path $toolsNode 'node.exe'))) { Fail 'tools/node/node.exe missing' }

$imgDir = Join-Path $Stage 'vendor\docker-images'
New-Item -ItemType Directory -Force -Path $imgDir, $imgCache | Out-Null
$images = @(
    'valkey/valkey:8-alpine',
    'postgres:16.10-alpine',
    'postgres:15-alpine',
    'zlmediakit/zlmediakit:master',
    'gemcjz/wvp-pro:latest'
)
if (-not $SkipDockerExport) {
    Write-Step '[docker] export image tars (reuse dist/_docker-image-cache when present)'
    where.exe docker | Out-Null
    $dockerOk = ($LASTEXITCODE -eq 0)
    foreach ($img in $images) {
        $safe = $img.Replace(':', '_').Replace('/', '_')
        $tarName = $safe + '.tar'
        $tar = Join-Path $imgDir $tarName
        $cached = Join-Path $imgCache $tarName
        if ((Test-Path $cached) -and ((Get-Item $cached).Length -gt 1MB)) {
            Copy-Item -Force $cached $tar
            Write-Host ('  cache ' + $tarName)
            continue
        }
        if (-not $dockerOk) { Fail 'docker not on PATH and no image cache' }
        Write-Host ('  save ' + $img)
        docker pull $img 2>&1 | Out-Null
        docker save -o $cached $img
        if (-not (Test-Path $cached) -or ((Get-Item $cached).Length -lt 1MB)) { Fail ('docker save failed ' + $img) }
        Copy-Item -Force $cached $tar
    }
}

Copy-Item -Force (Join-Path $Root '.env.deploy.example') (Join-Path $Stage '.env.deploy.example')
Copy-Item -Force (Join-Path $Root '.env.deploy.example') (Join-Path $SbProt '.env.deploy.example')

Write-Step '[purge] secrets'
Get-ChildItem -Path $Stage -Recurse -Filter '*private*.pem' -ErrorAction SilentlyContinue | Remove-Item -Force
Get-ChildItem -Path $Stage -Recurse -Filter '.env' -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -eq '.env' } | Remove-Item -Force
Get-ChildItem -Path $Stage -Recurse -Filter 'generate-license.js' -ErrorAction SilentlyContinue | Remove-Item -Force

Write-Step '[cn] inject zh/Jiangsu meta via node'
$injectPath = Join-Path $env:TEMP 'me8-inject-cn.js'
@'
const fs = require('fs');
const path = require('path');
function inj(p) {
  if (!fs.existsSync(p)) return;
  let h = fs.readFileSync(p, 'utf8');
  h = h.replace(/<meta name="fm-locales"[^>]*>/, '<meta name="fm-locales" content="zh,en">');
  h = h.replace(/<meta name="fm-default-lang"[^>]*>/, '<meta name="fm-default-lang" content="zh">');
  if (!/fm-default-lang/.test(h)) {
    h = h.replace(/<head>/i, '<head>\n    <meta name="fm-locales" content="zh,en">\n    <meta name="fm-default-lang" content="zh">');
  }
  h = h.replace(/<meta name="fm-map-countries"[^>]*>/, '<meta name="fm-map-countries" content="cn">');
  if (!/fm-map-countries/.test(h)) {
    h = h.replace(/(<meta name="fm-default-lang"[^>]*>)/, '$1\n    <meta name="fm-map-countries" content="cn">');
  }
  if (!/fm-map-offline-only/.test(h)) {
    h = h.replace(/(<meta name="fm-map-countries"[^>]*>)/, '$1\n    <meta name="fm-map-offline-only" content="1">');
  }
  if (!/name="fm-map-offline"/.test(h)) {
    h = h.replace(/(<meta name="fm-map-offline-only"[^>]*>)/, '$1\n    <meta name="fm-map-offline" content="1">');
  }
  h = h.replace(/pos:\s*\[1\.3521,\s*103\.8198\]/g, 'pos: [32.0617, 118.7630]');
  fs.writeFileSync(p, h);
}
const stage = process.argv[2];
[
  'public/index.html',
  'public/login.html',
  'ship-build/protected/public/index.html',
  'ship-build/protected/public/login.html'
].forEach((r) => inj(path.join(stage, r)));
'@ | Set-Content -Path $injectPath -Encoding UTF8
node $injectPath $Stage
Remove-Item -Force $injectPath -ErrorAction SilentlyContinue

$readmeEn = @(
    'Mobility Axiom - China Air-Gapped Pack (v2)',
    '==========================================',
    '1. Unzip completely.',
    '2. Start Docker Desktop.',
    '3. Double-click Axiom_Enterprise_Setup.bat',
    '4. Enter LAN IPv4 (NOT 172.17-172.31).',
    '5. Open http://YOUR_IP:3888',
    '   Login: global / global123',
    '',
    'License already at ship-build\storage\license.lic',
    '20 BWC / 10 IPC / all modules / expiry 2036-08-06.',
    'Offline map: Jiangsu tiles in data\gis\offline. UI default zh.',
    'Dashboard QR/TOTP 2FA: OFF (FM_TOTP_SUSPENDED=1). Password login only.'
) -join "`r`n"
Set-Content -Path (Join-Path $Stage 'README-DEPLOY.txt') -Value $readmeEn -Encoding UTF8

$readmeCn = @(
    'Mobility Axiom - CN Air-Gapped Pack (v2)',
    '====================================',
    '1. Unzip fully.',
    '2. Start Docker Desktop.',
    '3. Run Axiom_Enterprise_Setup.bat',
    '4. Enter LAN IPv4 (not 172.17-172.31).',
    '5. Open http://LAN_IP:3888  login global / global123',
    'License baked: ship-build/storage/license.lic (20 BWC, to 2036-08-06).',
    'Offline map: data/gis/offline (Jiangsu).',
    'No QR 2FA: FM_TOTP_SUSPENDED=1 (password only).'
) -join "`r`n"
Set-Content -Path (Join-Path $Stage 'README-CN.txt') -Value $readmeCn -Encoding UTF8

Write-Step '[manual] Mobility_Axiom_User_Manual_CN.md'
$manualCn = @'
# Mobility Axiom — 中国离线部署用户手册（Air-Gapped）

**产品：** Mobility Axiom（Ubitron）  
**对象：** 系统管理员 / 值班长  
**语言：** 简体中文  

---

## 1. 安装前准备

| 项目 | 要求 |
|------|------|
| 系统 | Windows 10/11 64 位 |
| 权限 | 管理员权限（安装 Docker、放行防火墙） |
| 硬件建议 | 16 GB 内存及以上 |
| 必备软件 | **Docker Desktop**（必须安装并保持运行） |
| 网络 | 本机网卡真实局域网 IPv4（如 `192.168.x.x`） |

**禁止使用的地址：** `172.17.x.x`～`172.31.x.x`（Docker/WSL 虚拟网段）。

本包已内置：试用许可证、Node.js 22、ffmpeg、江苏离线地图、Docker 镜像（Postgres / Valkey / WVP / ZLM）、数据库迁移脚本。

---

## 2. 安装步骤（一次完成）

1. 将 zip **完整解压**到本地固定目录（例：`C:\Mobility_Axiom_AirGapped_CN\`）。不要在压缩包内直接运行。
2. 确认解压根目录能看到：`Axiom_Enterprise_Setup.bat`、`ship-build\`、`tools\`、`vendor\`、本手册。
3. 安装并启动 **Docker Desktop**，等待托盘图标稳定。
4. 双击 **`Axiom_Enterprise_Setup.bat`**。
5. 按提示输入本机 **局域网 IPv4**（例：`192.168.0.182`）。禁止填 172.17～172.31。
6. 等待完成：写配置 → 加载离线镜像 → 启动容器 → 打开黑色服务窗口。
7. 浏览器打开：`http://本机IP:3888`

**首次登录**

| 项目 | 值 |
|------|----|
| 用户名 | `global` |
| 密码 | `global123` |

登录后请尽快在 **设置 → 服务器配置** 中修改密码。

**双因素（QR / TOTP）：** 本中国离线包默认 **关闭**（`FM_TOTP_SUSPENDED=1`）。登录仅需账号密码，不会强制扫码绑定验证器。

---

## 3. 许可证（无需再拷贝）

已预置：`ship-build\storage\license.lic`

| 项目 | 内容 |
|------|------|
| 类型 | 通配试用/伙伴授权（无需硬件 ID） |
| BWC | 最多 **20** 台 |
| 固定摄像头 | 最多 **10** 路 |
| 有效期 | **2036-08-06** |

请勿删除该文件。若提示 license missing = 解压不完整或进错目录。

---

## 4. 日常启动 / 停止

**启动：** Docker Desktop 运行 → 双击 `Axiom_Enterprise_Setup.bat` → 保持黑色窗口打开。  
**停止：** 关闭黑色服务窗口；如需停容器，在 Docker Desktop 中 Stop。

---

## 5. 摄像机（BWC）上线

1. **设置 → 服务器配置 → 网络**：公网/局域网地址 = 本机真实 IPv4。  
2. **BWC 列表** 添加设备 ID 与名称并保存。  
3. 在摄像机 SIP 界面填写：

| 摄像机字段 | 填写内容 |
|------------|----------|
| SIP 服务器 | 本机局域网 IPv4 |
| 端口 | 与服务器配置一致（常见 5060） |
| 平台 ID / Realm | 与服务器配置一致 |
| 密码 | **SIP 注册密码**（不是仪表盘 `global123`） |
| 设备 ID | 与 BWC 列表完全一致 |

4. 等待 30～60 秒，确认在线后再测：实时视频 → SOS → 对讲。

---

## 6. 离线地图（江苏）

- 界面默认：**中文**  
- 离线瓦片：`data\gis\offline\`（江苏 / 南京附近）  
- 地图空白：`Ctrl+Shift+R` 强制刷新；确认瓦片目录未被删除。

---

## 7. 防火墙

入站放行：TCP **3888**；SIP（常见 **5060**）；PTT（若启用，常见 **29201**）；以及服务器配置中的媒体相关端口。

---

## 8. 常见问题

| 现象 | 处理 |
|------|------|
| 页面打不开 | 黑色服务窗口须保持运行；地址 `http://IP:3888` |
| `license.lic missing` | 许可证应在 `ship-build\storage\` |
| `db\migrations\... ENOENT` | 解压不完整或用了旧包；请使用本版 zip 并完整解压 |
| `wvp-sip-lan-proxy.js` / `Cannot find module '../lib/…'` | 须保留 `ship-build\protected\scripts\` 与 `ship-build\protected\lib\`（含 wvpSipLanMap 等） |
| Docker 失败 | 先开 Docker Desktop，再重跑 Setup |
| 仅有 GPS、无视频/SOS | 重填服务器 IP 与每台 BWC 的 SIP IP |
| 输入 172.x | Setup 会拒绝；改用真实网卡 IP |
| 出现 QR / 双因素绑定页 | 本包应已关闭；确认 `.env` 中 `FM_TOTP_SUSPENDED=1` 后重启服务 |

---

## 9. 安全建议

1. 首次登录后立即修改 `global` 密码  
2. 对外暴露前修改 Postgres / WVP 等默认口令  
3. 正式商用可更换为硬件绑定许可证  

---

## 10. 反馈时请提供

1. 服务窗口最后 30 行日志  
2. 安装根目录完整路径  
3. `ipconfig` 使用的 IPv4  
4. 浏览器完整 URL  

---

**Ubitron · Mobility Axiom** — 中国离线部署包 · 用户手册
'@
$manualPath = Join-Path $Stage 'Mobility_Axiom_User_Manual_CN.md'
Set-Content -Path $manualPath -Value $manualCn -Encoding UTF8
# Chinese filename alias (same content)
Copy-Item -Force $manualPath (Join-Path $Stage 'Mobility_Axiom_用户手册_CN.md')

Write-Step '[verify] self-check'
$must = @(
    'ship-build\protected\run.js',
    'ship-build\protected\node_modules\express',
    'ship-build\storage\license.lic',
    'ship-build\vendor\ffmpeg-lgpl\ffmpeg.exe',
    'ship-build\db\migrations\001_catalog_primary.sql',
    'ship-build\db\migrations\009_analytics_capture_audit.sql',
    'ship-build\protected\scripts\wvp-sip-lan-proxy.js',
    'ship-build\protected\lib\wvpSipLanMap.js',
    'ship-build\protected\lib\wvpLabClient.js',
    'ship-build\protected\lib\fleetLog.js',
    'ship-build\protected\lib\siteTime.js',
    'ship-build\protected\lib\glassFortressLog.js',
    'ship-build\scripts\wvp-sip-lan-proxy.js',
    'ship-build\data\gis\offline',
    'tools\node\node.exe',
    'Axiom_Enterprise_Setup.bat',
    'scripts\Set-DeployHostEnv.ps1',
    '.env.deploy.example',
    'docker\docker-compose.enterprise.yml',
    'docker\wvp\docker-compose.wvp.yml',
    'README-DEPLOY.txt',
    'Mobility_Axiom_User_Manual_CN.md'
)
foreach ($m in $must) {
    if (-not (Test-Path (Join-Path $Stage $m))) { Fail ('self-check missing: ' + $m) }
    Write-Host ('  OK ' + $m)
}
# All 9 migrations required
$migDir = Join-Path $Stage 'ship-build\db\migrations'
$migNeed = @(
    '001_catalog_primary.sql', '002_tactical_blueprint_uv.sql', '003_fixed_cameras.sql',
    '004_fixed_cameras_stream_transport.sql', '005_tactical_blueprint_size_raise.sql',
    '006_tactical_blueprint_placement.sql', '007_bwc_paired_secondary.sql',
    '008_anpr_capture_history.sql', '009_analytics_capture_audit.sql'
)
foreach ($mf in $migNeed) {
    if (-not (Test-Path (Join-Path $migDir $mf))) { Fail ('migration missing: ' + $mf) }
}
Write-Host '  OK all 9 db migrations'
$lic = (Get-Content (Join-Path $Stage 'ship-build\storage\license.lic') -Raw -Encoding UTF8) | ConvertFrom-Json
if ($lic.payload.hardwareId -ne 'trial_wildcard') { Fail 'bad hardwareId' }
if ([int]$lic.payload.maxBwcDevices -lt 20) { Fail 'maxBwcDevices < 20' }
if ($lic.payload.expiryDate -lt '2036-01-01') { Fail 'expiry too short' }
Write-Host ('  OK license ' + $lic.payload.expiryDate + ' bwc=' + $lic.payload.maxBwcDevices)

$envEx = Get-Content (Join-Path $Stage '.env.deploy.example') -Raw
if ($envEx -notmatch 'FM_CATALOG_MODE=postgres_required') { Fail 'env template missing FM_CATALOG_MODE' }
if ($envEx -notmatch 'FM_REDIS_URL=') { Fail 'env template missing FM_REDIS_URL' }
if ($envEx -notmatch '(?m)^FM_TOTP_SUSPENDED=1\s*$') { Fail 'CN pack must ship FM_TOTP_SUSPENDED=1' }
Write-Host '  OK FM_TOTP_SUSPENDED=1'
$depHost = Get-Content (Join-Path $Stage 'scripts\Set-DeployHostEnv.ps1') -Raw
if ($depHost -notmatch "Set-EnvLine 'FM_TOTP_SUSPENDED' '1'") { Fail 'Set-DeployHostEnv must force TOTP suspended=1' }
Write-Host '  OK Set-DeployHostEnv TOTP=1'

if (-not $SkipDockerExport) {
    $tars = @(Get-ChildItem $imgDir -Filter '*.tar' -File)
    if ($tars.Count -lt 5) { Fail ('docker tars count ' + $tars.Count) }
    Write-Host ('  OK docker tars=' + $tars.Count)
}

$tileCount = @(Get-ChildItem (Join-Path $Stage 'data\gis\offline') -Recurse -File).Count
if ($tileCount -lt 100) { Fail ('tiles ' + $tileCount) }
Write-Host ('  OK tiles=' + $tileCount)

# SIP require-graph smoke — must resolve without MODULE_NOT_FOUND (does not bind ports)
Write-Step '[smoke] SIP lib require graph'
$nodeExe = Join-Path $Stage 'tools\node\node.exe'
$smokeJs = Join-Path $env:TEMP 'me8-sip-lib-smoke.js'
@'
const path = require('path');
const fs = require('fs');
const prot = process.argv[2];
if (!prot) { console.error('usage: node smoke.js <protectedDir>'); process.exit(2); }
const libs = [
  'wvpSipLanMap.js',
  'wvpLabClient.js',
  'fleetLog.js',
  'siteTime.js',
  'glassFortressLog.js'
];
for (const f of libs) {
  const abs = path.join(prot, 'lib', f);
  if (!fs.existsSync(abs)) { console.error('MISSING ' + abs); process.exit(2); }
  require(abs);
  console.log('OK require ' + f);
}
const proxy = path.join(prot, 'scripts', 'wvp-sip-lan-proxy.js');
if (!fs.existsSync(proxy)) { console.error('MISSING ' + proxy); process.exit(2); }
const txt = fs.readFileSync(proxy, 'utf8');
if (!/require\(['\"]\.\.\/lib\/wvpSipLanMap['\"]\)/.test(txt)) {
  console.error('proxy script missing wvpSipLanMap require');
  process.exit(2);
}
// Resolve the same way the child process does: from scripts/ → ../lib/
const resolved = require.resolve('../lib/wvpSipLanMap.js', { paths: [path.join(prot, 'scripts')] });
if (!resolved || !resolved.includes(path.join('protected', 'lib'))) {
  console.error('resolve path unexpected: ' + resolved);
  process.exit(2);
}
console.log('OK proxy resolve -> ' + resolved);
'@ | Set-Content -Path $smokeJs -Encoding UTF8
& $nodeExe $smokeJs (Join-Path $Stage 'ship-build\protected')
if ($LASTEXITCODE -ne 0) { Fail 'SIP lib require smoke failed' }
Remove-Item -Force $smokeJs -ErrorAction SilentlyContinue
Write-Host '  OK SIP lib require smoke'

if (-not $SkipZip) {
    Write-Step ('[zip] ' + $Zip)
    if (Test-Path $Zip) { Remove-Item -Force $Zip }
    $sevenCandidates = @(
        (Join-Path ${env:ProgramFiles} '7-Zip\7z.exe'),
        (Join-Path ${env:ProgramFiles(x86)} '7-Zip\7z.exe')
    )
    $seven = $sevenCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
    if ($seven) {
        & $seven a -tzip -mx=1 $Zip (Join-Path $Stage '*') | Out-Null
        if ($LASTEXITCODE -ne 0) { Fail '7z failed' }
    } else {
        Compress-Archive -Path (Join-Path $Stage '*') -DestinationPath $Zip -Force
    }
    if (-not (Test-Path $Zip)) { Fail 'zip missing' }

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $z = [System.IO.Compression.ZipFile]::OpenRead($Zip)
    try {
        $names = @($z.Entries | ForEach-Object { ($_.FullName -replace '\\', '/').TrimStart('./') })
        foreach ($w in @(
            'ship-build/storage/license.lic',
            'ship-build/vendor/ffmpeg-lgpl/ffmpeg.exe',
            'ship-build/protected/run.js',
            'ship-build/db/migrations/001_catalog_primary.sql',
            'ship-build/db/migrations/009_analytics_capture_audit.sql',
            'ship-build/protected/scripts/wvp-sip-lan-proxy.js',
            'ship-build/protected/lib/wvpSipLanMap.js',
            'ship-build/protected/lib/glassFortressLog.js',
            'Axiom_Enterprise_Setup.bat',
            'tools/node/node.exe',
            'Mobility_Axiom_User_Manual_CN.md'
        )) {
            $hit = $names | Where-Object { $_ -eq $w -or $_.EndsWith('/' + $w) -or $_.EndsWith($w) } | Select-Object -First 1
            if (-not $hit) { Fail ('zip missing ' + $w) }
            Write-Host ('  OK zip:' + $w)
        }
    } finally {
        $z.Dispose()
    }
    $zipMB = [math]::Round((Get-Item $Zip).Length / 1MB, 1)
    Write-Host ''
    Write-Host ('OK folder: ' + $Stage) -ForegroundColor Green
    Write-Host ('OK zip: ' + $Zip + ' (' + $zipMB + ' MB)') -ForegroundColor Green
}

Write-Host 'Partner: unzip -> Axiom_Enterprise_Setup.bat -> http://LAN:3888'
