#!/usr/bin/env node
/**
 * Generate trial ship manuals — 3 docs × 5 languages.
 * Usage: node scripts/generate-trial-manuals.js [--out path]
 */
const fs = require('fs');
const path = require('path');

const outArg = process.argv.indexOf('--out');
const OUT = outArg >= 0 ? process.argv[outArg + 1] : path.join(__dirname, '..', 'docs', 'trial-ship', 'manuals');
const SRC = path.join(__dirname, 'trial-ship', 'manuals-src');
const LANGS = ['en', 'ko', 'th', 'id', 'fil'];

function readSrcManual(lang, name) {
  const p = path.join(SRC, lang, name);
  if (!fs.existsSync(p)) throw new Error('Missing manual source: ' + p);
  return fs.readFileSync(p, 'utf8').trimEnd();
}

function ensureExpandedManuals() {
  const emit = path.join(__dirname, 'trial-ship', 'emit-expanded-manuals.js');
  const expanded = path.join(__dirname, 'trial-ship', 'manuals-expanded', 'user-en.md');
  if (fs.existsSync(expanded)) {
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
  '| Internet | First install only | Docker image pull for Video Conference |',
  '',
  '## Install (once)',
  '',
  '1. **Unzip** the full delivery folder (e.g. to `C:\\Mobility-Trial\\`).',
  '2. **Install Docker Desktop** from the link above. Start Docker — wait until the whale icon is steady.',
  '3. Double-click **`Install-Mobility.bat`** (in the pack root, same folder as this README).',
  '   - Verifies bundled Node + libraries',
  '   - Creates `.env` with your LAN IP',
  '   - Starts LiveKit (Video Conference engine)',
  '4. Double-click **`Start Mobility.bat`** every time you use Mobility.',
  '   - Opens the dashboard in your browser',
  '',
  '**Do not** run `npm install` — dependencies are pre-built in the pack.',
  '',
  '## Folder layout (after unzip)',
  '',
  '| Path | Purpose |',
  '|------|---------|',
  '| `Install-Mobility.bat` | Run once after unzip |',
  '| `Start Mobility.bat` | Start server + open browser |',
  '| `Mobility-Axiom\\` | Application (do not delete) |',
  '| `Mobility-Axiom\\tools\\node\\` | Bundled Node.js 20 |',
  '| `MobilityConference-1.5.6.apk` | Android Video Conference app |',
  '| `manuals\\` | Guides in your language |',
].join('\n');

const INSTALL_KO = [
  '## 이 PC에 필요한 것',
  '',
  '| 항목 | 필수? | 설명 |',
  '|------|-------|------|',
  '| Windows 10/11 (64비트) | 예 | Docker 설치 시 관리자 권한 |',
  '| **Node.js** | **아니오** | 패키지에 포함 (`Mobility-Axiom\\tools\\node\\`) |',
  '| **Docker Desktop** | 예 (화상회의) | [다운로드](https://www.docker.com/products/docker-desktop/) |',
  '| 인터넷 | 최초 설치 시 | 화상회의용 Docker 이미지 다운로드 |',
  '',
  '## 설치 (한 번)',
  '',
  '1. 배송 폴더 전체를 **압축 해제** (예: `C:\\Mobility-Trial\\`).',
  '2. 위 링크에서 **Docker Desktop** 설치 후 실행 — 고래 아이콘이 안정될 때까지 대기.',
  '3. **`Install-Mobility.bat`** 더블클릭 (패키지 루트).',
  '   - 번들 Node 및 라이브러리 확인',
  '   - LAN IP로 `.env` 생성',
  '   - LiveKit(화상회의) 시작',
  '4. 사용할 때마다 **`Start Mobility.bat`** 더블클릭.',
  '',
  '**`npm install`을 실행하지 마세요** — 의존성은 패키지에 포함되어 있습니다.',
].join('\n');

const INSTALL_TH = [
  '## สิ่งที่ต้องมีบน PC นี้',
  '',
  '| รายการ | จำเป็น? | หมายเหตุ |',
  '|--------|---------|----------|',
  '| Windows 10/11 (64-bit) | ใช่ | สิทธิ์ผู้ดูแลระบบสำหรับ Docker |',
  '| **Node.js** | **ไม่** | **รวมอยู่ในแพ็ก** (`Mobility-Axiom\\tools\\node\\`) |',
  '| **Docker Desktop** | ใช่ (VC) | [ดาวน์โหลด](https://www.docker.com/products/docker-desktop/) |',
  '| อินเทอร์เน็ต | ติดตั้งครั้งแรก | ดึง Docker image สำหรับ Video Conference |',
  '',
  '## ติดตั้ง (ครั้งเดียว)',
  '',
  '1. **แตกไฟล์** โฟลเดอร์ทั้งหมด (เช่น `C:\\Mobility-Trial\\`).',
  '2. ติดตั้ง **Docker Desktop** จากลิงก์ด้านบน เปิด Docker — รอจนไอคอนวาฬคงที่.',
  '3. ดับเบิลคลิก **`Install-Mobility.bat`** (โฟลเดอร์รากของแพ็ก).',
  '4. ทุกครั้งที่ใช้งาน ดับเบิลคลิก **`Start Mobility.bat**`.',
  '',
  '**อย่า** รัน `npm install` — ไลบรารีถูกสร้างไว้ในแพ็กแล้ว.',
].join('\n');

const INSTALL_ID = [
  '## Yang dibutuhkan di PC ini',
  '',
  '| Item | Wajib? | Catatan |',
  '|------|--------|---------|',
  '| Windows 10/11 (64-bit) | Ya | Hak admin untuk Docker |',
  '| **Node.js** | **Tidak** | **Sudah termasuk** (`Mobility-Axiom\\tools\\node\\`) |',
  '| **Docker Desktop** | Ya (VC) | [Unduh](https://www.docker.com/products/docker-desktop/) |',
  '| Internet | Instal pertama | Unduh image Docker untuk Video Conference |',
  '',
  '## Instal (sekali)',
  '',
  '1. **Ekstrak** folder pengiriman penuh (mis. `C:\\Mobility-Trial\\`).',
  '2. Instal **Docker Desktop** dari tautan di atas. Jalankan Docker — tunggu ikon paus stabil.',
  '3. Klik dua kali **`Install-Mobility.bat`** (folder akar paket).',
  '4. Setiap kali pakai, klik dua kali **`Start Mobility.bat**`.',
  '',
  '**Jangan** jalankan `npm install` — dependensi sudah ada di paket.',
].join('\n');

const INSTALL_FIL = [
  '## Kailangan sa PC na ito',
  '',
  '| Item | Kailangan? | Tala |',
  '|------|------------|------|',
  '| Windows 10/11 (64-bit) | Oo | Admin rights para sa Docker |',
  '| **Node.js** | **Hindi** | **Kasama na** sa pack (`Mobility-Axiom\\tools\\node\\`) |',
  '| **Docker Desktop** | Oo (VC) | [I-download](https://www.docker.com/products/docker-desktop/) |',
  '| Internet | Unang install | Docker image para sa Video Conference |',
  '',
  '## I-install (isang beses)',
  '',
  '1. **I-unzip** ang buong delivery folder (hal. `C:\\Mobility-Trial\\`).',
  '2. I-install ang **Docker Desktop** mula sa link sa itaas. Patakbuhin — hintayin ang whale icon.',
  '3. I-double-click ang **`Install-Mobility.bat`** (root ng pack).',
  '4. Sa bawat paggamit, i-double-click ang **`Start Mobility.bat**`.',
  '',
  '**Huwag** patakbuhin ang `npm install` — naka-bundle na ang dependencies.',
].join('\n');

function loginBlock(lang) {
  const rows = {
    en: ['| URL | http://\<server-ip\>:3888 |', '| Username | global |', '| Password | global123 |'],
    ko: ['| URL | http://\<서버-IP\>:3888 |', '| 사용자명 | global |', '| 비밀번호 | global123 |'],
    th: ['| URL | http://\<server-ip\>:3888 |', '| ชื่อผู้ใช้ | global |', '| รหัสผ่าน | global123 |'],
    id: ['| URL | http://\<server-ip\>:3888 |', '| Nama pengguna | global |', '| Kata sandi | global123 |'],
    fil: ['| URL | http://\<server-ip\>:3888 |', '| Username | global |', '| Password | global123 |'],
  };
  return rows[lang] || rows.en;
}

function firstLoginHeader(lang) {
  return { en: '## First login', ko: '## 첫 로그인', th: '## เข้าสู่ระบบครั้งแรก', id: '## Login pertama', fil: '## Unang login' }[lang] || '## First login';
}

function buildQuick(lang) {
  const title = {
    en: 'Mobility Axiom — Quick Guide',
    ko: 'Mobility Axiom — 빠른 시작 가이드',
    th: 'Mobility Axiom — คู่มือเริ่มต้นอย่างรวดเร็ว',
    id: 'Mobility Axiom — Panduan Singkat',
    fil: 'Mobility Axiom — Mabilis na Gabay',
  }[lang];
  const install = { en: INSTALL_EN, ko: INSTALL_KO, th: INSTALL_TH, id: INSTALL_ID, fil: INSTALL_FIL }[lang];
  const bwcHeader = { en: '## BWC online (short)', ko: '## BWC 온라인 (요약)', th: '## BWC ออนไลน์ (สรุป)', id: '## BWC online (ringkas)', fil: '## BWC online (maikli)' }[lang];
  const vcHeader = { en: '## Video Conference (phone)', ko: '## 화상 회의 (휴대폰)', th: '## Video Conference (โทรศัพท์)', id: '## Video Conference (ponsel)', fil: '## Video Conference (telepono)' }[lang];
  const trialHeader = { en: '## Trial license', ko: '## 체험 라이선스', th: '## ใบอนุญาตทดลอง', id: '## Lisensi uji coba', fil: '## Trial license' }[lang];

  return [
    '# ' + title,
    '',
    install,
    '',
    firstLoginHeader(lang),
    '| Field | Value |',
    '|-------|-------|',
    ...loginBlock(lang),
    '',
    lang === 'en' ? 'Change password: **Settings → Server Config → My account → Update password**.' : '',
    '',
    bwcHeader,
    '1. **Settings → Server Config → Network** — set server IPv4 → **Save server settings**.',
    '2. **Settings → Server Config → BWCs** — add Device ID + officer name → **Save BWC list**.',
    '3. On each BWC SIP screen — enter values from **Type on BWC** (IPv4 only).',
    '4. Wait ~30s — device shows **Online** in fleet list.',
    '',
    vcHeader,
    '1. Install **MobilityConference-1.5.6.apk** on Android.',
    '2. Server URL = same as dashboard (http://\<server-ip\>:3888).',
    '3. Sign in → open room → Join with camera.',
    '',
    trialHeader,
    '5 BWC · 10 dashboard users · 1 year.',
    '',
    lang === 'en' ? 'Full steps: **Configuration Manual** in your language folder.' : 'Full steps: **Configuration Manual** in this folder.',
  ].filter((line, i, arr) => line !== '' || (i > 0 && arr[i - 1] !== '')).join('\n');
}

function translateManual(lang, type) {
  if (type === 'quick') return buildQuick(lang);
  if (type === 'user') return readSrcManual(lang, 'User-Manual.md');
  if (type === 'config') return readSrcManual(lang, 'Configuration-Manual.md');
  throw new Error('Unknown manual type: ' + type);
}

function writeManual(lang, name, body) {
  const dir = path.join(OUT, lang);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), body + '\n', 'utf8');
}

fs.mkdirSync(OUT, { recursive: true });
LANGS.forEach((lang) => {
  writeManual(lang, 'Quick-Guide.md', translateManual(lang, 'quick'));
  writeManual(lang, 'User-Manual.md', translateManual(lang, 'user'));
  writeManual(lang, 'Configuration-Manual.md', translateManual(lang, 'config'));
});
console.log('Manuals written to', OUT, '(' + LANGS.length * 3 + ' files)');
