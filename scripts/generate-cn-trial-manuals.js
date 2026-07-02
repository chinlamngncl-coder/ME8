#!/usr/bin/env node
/**
 * CN trial manuals — en + zh (Quick, User, Config).
 * Usage: node scripts/generate-cn-trial-manuals.js [--out path]
 */
'use strict';

const fs = require('fs');
const path = require('path');

const outArg = process.argv.indexOf('--out');
const OUT = outArg >= 0 ? process.argv[outArg + 1] : path.join(__dirname, '..', 'docs', 'trial-ship', 'manuals-cn');
const SRC = path.join(__dirname, 'trial-ship', 'manuals-src');

function readSrcManual(lang, name) {
  const p = path.join(SRC, lang, name);
  if (!fs.existsSync(p)) throw new Error('Missing manual: ' + p);
  return fs.readFileSync(p, 'utf8').trimEnd();
}

function ensureExpandedManuals() {
  const emit = path.join(__dirname, 'trial-ship', 'emit-expanded-manuals.js');
  if (fs.existsSync(emit)) {
    require('child_process').execSync(`node "${emit}"`, { stdio: 'inherit' });
  }
}
ensureExpandedManuals();

const INSTALL_EN = [
  '## What you need on this PC',
  '',
  '| Item | Required? | Notes |',
  '|------|-----------|-------|',
  '| Windows 10/11 (64-bit) | Yes | Administrator rights for Docker |',
  '| **Node.js** | **No** | **Included** in `Mobility-Axiom\\tools\\node\\` |',
  '| **Docker Desktop** | Yes (VC only) | [Download](https://www.docker.com/products/docker-desktop/) |',
  '| Internet | First install only | Docker image pull; **map tiles are offline** |',
  '',
  '## Install (once)',
  '',
  '1. **Unzip** the full **CN Trial Mobility** folder (e.g. `C:\\CN-Trial\\`).',
  '2. **Install Docker Desktop** — start it (whale icon steady).',
  '3. Double-click **`Install-Mobility.bat`** in the pack root.',
  '4. Double-click **`Start Mobility.bat`** each time you use Mobility.',
  '',
  '**Do not** run `npm install` — libraries are pre-built in the pack.',
].join('\n');

const INSTALL_ZH = [
  '## 本机需要准备',
  '',
  '| 项目 | 是否必须 | 说明 |',
  '|------|----------|------|',
  '| Windows 10/11（64 位） | 是 | 安装 Docker 需管理员权限 |',
  '| **Node.js** | **否** | **已内置**于 `Mobility-Axiom\\tools\\node\\` |',
  '| **Docker Desktop** | 是（仅视频会议） | [下载](https://www.docker.com/products/docker-desktop/) |',
  '| 外网 | 仅首次安装 | 拉取 Docker 镜像；**地图瓦片为离线** |',
  '',
  '## 安装（一次）',
  '',
  '1. **解压**完整 **CN Trial Mobility** 文件夹（如 `C:\\CN-Trial\\`）。',
  '2. 安装并启动 **Docker Desktop** — 等待托盘鲸鱼图标稳定。',
  '3. 在包根目录双击 **`Install-Mobility.bat`**。',
  '4. 每次使用双击 **`Start Mobility.bat`**。',
  '',
  '**请勿**运行 `npm install` — 依赖库已预装在包内。',
].join('\n');

const EN = {
  quick: [
    '# Mobility Axiom — Quick Guide',
    '',
    INSTALL_EN,
    '',
    '## First login',
    '| Field | Value |',
    '|-------|-------|',
    '| URL | http://\<server-ip\>:3888 |',
    '| Username | global |',
    '| Password | global123 |',
    '',
    'Language: **English** or **中文（简体）** on login page.',
    '',
    '## Map',
    'This pack includes **offline map tiles** (Beijing area). No internet needed for the basemap.',
    '',
    '## BWC online (short)',
    '1. **Settings → Server Config → Network** — set server IPv4.',
    '2. **Settings → Server Config → BWCs** — add Device ID + officer name.',
    '3. On BWC SIP screen — use **Type on BWC** values (IPv4 only).',
    '',
    '## Video Conference',
    'Install **MobilityConference-1.5.6.apk** on Android. Docker must be running.',
  ].join('\n'),
  config: [
    '# Mobility Axiom — Configuration Manual',
    '',
    '## Server + BWC',
    'See Quick Guide — Network and BWC list under **Settings → Server Config**.',
    '',
    '## Offline map',
    'Tiles: `data/gis/offline/tiles/` — do not delete.',
    'Extended regional coverage: contact your Mobility Axiom vendor.',
    '',
    '## Firewall',
    '| Port | Service |',
    '|------|---------|',
    '| 3888 | Dashboard |',
    '| 5060 | SIP |',
    '| 7880 | Video Conference |',
  ].join('\n'),
};

const ZH = {
  quick: [
    '# Mobility Axiom — 快速指南',
    '',
    INSTALL_ZH,
    '',
    '## 首次登录',
    '| 项目 | 值 |',
    '|------|-----|',
    '| 地址 | http://\<服务器IP\>:3888 |',
    '| 用户名 | global |',
    '| 密码 | global123 |',
    '',
    '语言：登录页可选 **English** 或 **中文（简体）**。',
    '',
    '## 地图',
    '本包含 **离线地图瓦片**（北京区域），底图无需外网。',
    '',
    '## 执法记录仪上线（概要）',
    '1. **设置 → 服务器配置 → 网络** — 填写服务器 IPv4。',
    '2. **设置 → 服务器配置 → BWC** — 添加设备 ID 与警员姓名。',
    '3. 在 BWC SIP 界面填写 **Type on BWC** 中的值（仅 IPv4）。',
    '',
    '## 视频会议',
    '在 Android 安装 **MobilityConference-1.5.6.apk**。Docker 须保持运行。',
  ].join('\n'),
  config: [
    '# Mobility Axiom — 配置手册',
    '',
    '## 服务器与 BWC',
    '见快速指南 — **设置 → 服务器配置** 中的网络与 BWC 列表。',
    '',
    '## 离线地图',
    '瓦片路径：`data/gis/offline/tiles/` — 请勿删除。',
    '扩展区域瓦片：请联系 Mobility Axiom 供应商。',
    '',
    '## 防火墙',
    '| 端口 | 服务 |',
    '|------|------|',
    '| 3888 | 控制台 |',
    '| 5060 | SIP |',
    '| 7880 | 视频会议 |',
  ].join('\n'),
};

function write(lang, name, body) {
  const dir = path.join(OUT, lang);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), body + '\n', 'utf8');
}

write('en', 'Quick-Guide.md', EN.quick);
write('en', 'User-Manual.md', readSrcManual('en', 'User-Manual.md'));
write('en', 'Configuration-Manual.md', readSrcManual('en', 'Configuration-Manual.md'));
write('zh', 'Quick-Guide.md', ZH.quick);
write('zh', 'User-Manual.md', readSrcManual('zh', 'User-Manual.md'));
write('zh', 'Configuration-Manual.md', readSrcManual('zh', 'Configuration-Manual.md'));

console.log('CN manuals ->', OUT);
