#!/usr/bin/env node
/**
 * PH/KR ME8 delivery manuals — English, Filipino, Korean.
 * Usage: node scripts/me8-ship/generate-ph-kr-me8-manuals.js [--out path]
 */
'use strict';

const fs = require('fs');
const path = require('path');

const outArg = process.argv.indexOf('--out');
const OUT = outArg >= 0 ? process.argv[outArg + 1] : path.join(__dirname, '..', '..', 'docs', 'me8-ship', 'manuals-ph-kr');
const SRC = path.join(__dirname, 'ph-kr-manuals-src');
const TRIAL_SRC = path.join(__dirname, '..', 'trial-ship', 'manuals-src');
const LANGS = ['en', 'fil', 'ko'];
const APP = 'Ubitron-ME8';
const PORT = '3988';

function readFile(p) {
  if (!fs.existsSync(p)) throw new Error('Missing: ' + p);
  return fs.readFileSync(p, 'utf8').trimEnd();
}

function patchPorts(text) {
  return text
    .replace(/Mobility-Axiom/g, APP)
    .replace(/Mobility Axiom/g, 'Ubitron Mobility C2')
    .replace(/Install-Mobility\.bat/g, 'Install-Ubitron.bat')
    .replace(/Start Mobility\.bat/g, 'Start Ubitron.bat')
    .replace(/:3888/g, ':' + PORT)
    .replace(/3889/g, '3989')
    .replace(/3890/g, '3990');
}

function writeManual(lang, name, body) {
  const dir = path.join(OUT, lang);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), body + '\n', 'utf8');
}

const QUICK = {
  en: `# Ubitron Mobility C2 — Quick Guide

Read **Installation-Guide.md** first for a new PC, or **Migration-Guide.md** if you already had an older trial. This page is a short reference after install is complete.

## First login

| Field | Value |
|-------|-------|
| URL | http://\<server-ip\>:${PORT} |
| Username | global |
| Password | global123 |

Change password immediately: **Settings → Server Config → My account → Update password**.

## Daily start

1. Ensure **Docker Desktop** is running (whale icon steady).
2. Double-click **Start Ubitron.bat** in the pack root.
3. Sign in at the URL above.

## Register a body-worn camera (summary)

1. **Settings → Server Config → Network** — set server IPv4 → **Save server settings**.
2. **Settings → Server Config → BWCs** — add Device ID and officer name → **Save BWC list**.
3. On each BWC SIP screen, enter values from **Type on BWC** (IPv4 only).
4. Wait about 30 seconds — device shows **Online** in the fleet list.

## Video Conference (Android)

1. Install **MobilityConference-1.5.6.apk** on the phone.
2. Server URL = same as dashboard (http://\<server-ip\>:${PORT}).
3. Sign in → open a room → **Join with camera**.

## Face Analytics (summary)

1. Install **Python 3.11+** once if not already installed.
2. Run **Install-Ubitron.bat** once (installs face packages on first run).
3. If Face watch shows offline, double-click **START-FACE-MATCHING.bat** and leave the window open.

## License (this pack)

| Item | Limit |
|------|-------|
| Body-worn cameras | 5 |
| Dashboard users | 10 |
| Face Analytics sources | 5 |
| Video Conference | Enabled |
| Valid until | 2036-07-12 |

Full configuration: **Configuration-Manual.md**. Daily operator tasks: **User-Manual.md**.`,

  fil: `# Ubitron Mobility C2 — Mabilis na Gabay

Basahin muna ang **Installation-Guide.md** (bagong PC) o **Migration-Guide.md** (may dating trial). Ang pahinang ito ay maikling sanggunian pagkatapos ng install.

## Unang login

| Field | Value |
|-------|-------|
| URL | http://\<server-ip\>:${PORT} |
| Username | global |
| Password | global123 |

Palitan agad ang password: **Settings → Server Config → My account → Update password**.

## Araw-araw na pagsisimula

1. Siguraduhing tumatakbo ang **Docker Desktop** (matatag ang whale icon).
2. I-double-click ang **Start Ubitron.bat** sa root ng pack.
3. Mag-sign in sa URL sa itaas.

## Magrehistro ng body-worn camera (buod)

1. **Settings → Server Config → Network** — itakda ang IPv4 ng server → **Save server settings**.
2. **Settings → Server Config → BWCs** — idagdag ang Device ID at pangalan ng opisyal → **Save BWC list**.
3. Sa SIP screen ng bawat BWC, ilagay ang mga halaga mula sa **Type on BWC** (IPv4 lamang).
4. Maghintay ng ~30 segundo — **Online** ang device sa fleet list.

## Video Conference (Android)

1. I-install ang **MobilityConference-1.5.6.apk** sa telepono.
2. Server URL = pareho sa dashboard (http://\<server-ip\>:${PORT}).
3. Mag-sign in → buksan ang room → **Join with camera**.

## Face Analytics (buod)

1. I-install ang **Python 3.11+** isang beses kung wala pa.
2. Patakbuhin ang **Install-Ubitron.bat** isang beses (nag-i-install ng face packages sa unang run).
3. Kung offline ang Face watch, i-double-click ang **START-FACE-MATCHING.bat** at huwag isara ang window.

## Lisensya (pack na ito)

| Item | Limit |
|------|-------|
| Body-worn cameras | 5 |
| Dashboard users | 10 |
| Face Analytics sources | 5 |
| Video Conference | Naka-enable |
| Valid hanggang | 2036-07-12 |

Buong configuration: **Configuration-Manual.md**. Gawain ng operator: **User-Manual.md**.`,

  ko: `# Ubitron Mobility C2 — 빠른 시작 가이드

신규 PC는 **Installation-Guide.md**, 이전 체험판이 있으면 **Migration-Guide.md**를 먼저 읽으십시오. 이 문서는 설치 완료 후 짧은 참고용입니다.

## 첫 로그인

| 항목 | 값 |
|------|-----|
| URL | http://\<서버-IP\>:${PORT} |
| 사용자명 | global |
| 비밀번호 | global123 |

즉시 비밀번호 변경: **Settings → Server Config → My account → Update password**.

## 매일 시작

1. **Docker Desktop** 실행(고래 아이콘 안정).
2. 패키지 루트에서 **Start Ubitron.bat** 더블클릭.
3. 위 URL로 로그인.

## 바디캠 등록 (요약)

1. **Settings → Server Config → Network** — 서버 IPv4 설정 → **Save server settings**.
2. **Settings → Server Config → BWCs** — Device ID·담당자 추가 → **Save BWC list**.
3. 각 BWC SIP 화면에 **Type on BWC** 값 입력(IPv4만).
4. 약 30초 후 fleet 목록에서 **Online** 확인.

## 화상 회의 (Android)

1. **MobilityConference-1.5.6.apk** 설치.
2. 서버 URL = 대시보드와 동일 (http://\<서버-IP\>:${PORT}).
3. 로그인 → 방 열기 → **Join with camera**.

## 얼굴 분석 (요약)

1. **Python 3.11+** 미설치 시 1회 설치.
2. **Install-Ubitron.bat** 1회 실행(최초 시 얼굴 패키지 설치).
3. Face watch 오프라인이면 **START-FACE-MATCHING.bat** 실행 후 창 유지.

## 라이선스 (본 패키지)

| 항목 | 한도 |
|------|------|
| 바디캠 | 5대 |
| 대시보드 사용자 | 10명 |
| 얼굴 분석 소스 | 5 |
| 화상 회의 | 사용 가능 |
| 유효 기간 | 2036-07-12 |

상세 구성: **Configuration-Manual.md**. 운영자 매뉴얼: **User-Manual.md**.`,
};

function buildConfig(lang) {
  const src = path.join(TRIAL_SRC, lang, 'Configuration-Manual.md');
  let body = patchPorts(readFile(src));
  body = body.replace(/## 11\. Trial license[\s\S]*?(?=## 12\.)/, `## 11. Platform license

This delivery pack includes a signed license:

| Item | Limit |
|------|-------|
| Body-worn cameras | 5 |
| Dashboard users | 10 |
| Face Analytics | 5 sources |
| Video Conference | Enabled |
| Expires | 2036-07-12 |

The license file is \`storage/platform-license.json\`. Do not edit it. Contact your vendor for renewal or expansion.

`);
  if (lang === 'fil') {
    body = body.replace('## 11. Platform license', '## 11. Lisensya ng platform');
  }
  if (lang === 'ko') {
    body = body.replace('## 11. Platform license', '## 11. 플랫폼 라이선스');
  }
  const frSection = {
    en: `

## 14. Face Analytics

1. Install **Python 3.11+** from https://www.python.org/downloads/ (check **Add python.exe to PATH**).
2. Run **Install-Ubitron.bat** once — step 3 installs face packages automatically.
3. If Analytics shows sidecar offline, double-click **START-FACE-MATCHING.bat** in the pack root and leave the window open.
4. In the dashboard: **Analytics → Face watch** — add watchlist entries and assign camera sources (up to 5).

**If face matching fails to start:** close other face-matching windows, run **START-FACE-MATCHING.bat** again, then hard-refresh the browser (Ctrl+F5).
`,
    fil: `

## 14. Face Analytics

1. I-install ang **Python 3.11+** mula sa https://www.python.org/downloads/ (lagyan ng check ang **Add python.exe to PATH**).
2. Patakbuhin ang **Install-Ubitron.bat** isang beses — awtomatikong nag-i-install ng face packages sa hakbang 3.
3. Kung offline ang sidecar sa Analytics, i-double-click ang **START-FACE-MATCHING.bat** sa root ng pack at huwag isara ang window.
4. Sa dashboard: **Analytics → Face watch** — magdagdag ng watchlist at mag-assign ng camera sources (hanggang 5).

**Kung hindi magsimula ang face matching:** isara ang ibang face-matching window, patakbuhin ulit ang **START-FACE-MATCHING.bat**, pagkatapos hard-refresh ang browser (Ctrl+F5).
`,
    ko: `

## 14. 얼굴 분석 (Face Analytics)

1. https://www.python.org/downloads/ 에서 **Python 3.11+** 설치(**Add python.exe to PATH** 선택).
2. **Install-Ubitron.bat** 1회 실행 — 3단계에서 얼굴 패키지 자동 설치.
3. Analytics에서 sidecar 오프라인이면 패키지 루트의 **START-FACE-MATCHING.bat** 실행 후 창 유지.
4. 대시보드: **Analytics → Face watch** — 감시 목록 추가 및 카메라 소스 할당(최대 5).

**얼굴 매칭 시작 실패 시:** 다른 face-matching 창 종료 → **START-FACE-MATCHING.bat** 재실행 → 브라우저 강력 새로고침(Ctrl+F5).
`,
  };
  if (!body.includes('## 14.')) {
    body += frSection[lang] || frSection.en;
  }
  return body;
}

fs.mkdirSync(OUT, { recursive: true });
LANGS.forEach((lang) => {
  const installPath = path.join(SRC, lang, 'Installation-Guide.md');
  writeManual(lang, 'Installation-Guide.md', patchPorts(readFile(installPath)));
  writeManual(lang, 'Migration-Guide.md', patchPorts(readFile(path.join(SRC, lang, 'Migration-Guide.md'))));
  writeManual(lang, 'Quick-Guide.md', QUICK[lang]);
  writeManual(lang, 'User-Manual.md', patchPorts(readFile(path.join(TRIAL_SRC, lang, 'User-Manual.md'))));
  writeManual(lang, 'Configuration-Manual.md', buildConfig(lang));
});
console.log('PH/KR ME8 manuals written to', OUT, '(' + LANGS.length * 5 + ' files)');
