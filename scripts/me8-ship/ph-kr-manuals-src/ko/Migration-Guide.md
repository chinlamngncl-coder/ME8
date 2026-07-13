# Ubitron Mobility C2 — 마이그레이션 가이드 (이전 체험판 → Mobility Test 2)

**대상:** 이전 체험 팩을 이미 설치한 사이트의 IT 담당자  
**함께 읽기:** Installation-Guide.md (마이그레이션 후) · Quick-Guide.md · Configuration-Manual.md  
**패키지:** Mobility Test 2 — 포트 **3988** · 번들 **Node 22**

이전 체험판(대개 포트 **3888**, 구버전 Node, 불완전 팩)이 있는 사이트를 위한 문서입니다. 단계를 순서대로 따르십시오.

**신규 PC**에 Mobility가 없다면 이 문서는 무시하고 **Installation-Guide.md**만 사용하십시오.

---

## 목차

1. [유지할 것 / 교체할 것](#1-유지할-것--교체할-것)
2. [이전 체험판 완전 중지](#2-이전-체험판-완전-중지)
3. [이전 애플리케이션 폴더 정리](#3-이전-애플리케이션-폴더-정리)
4. [새 폴더에 Mobility Test 2 설치](#4-새-폴더에-mobility-test-2-설치)
5. [선택 — 이전 데이터 유지](#5-선택--이전-데이터-유지)
6. [새 팩 첫 로그인](#6-새-팩-첫-로그인)
7. [네트워크 IP 및 바디캠 수정](#7-네트워크-ip-및-바디캠-수정)
8. [화상 회의(휴대폰 앱) 수정](#8-화상-회의휴대폰-앱-수정)
9. [마이그레이션 확인](#9-마이그레이션-확인)
10. [실패 시](#10-실패-시)

---

## 1. 유지할 것 / 교체할 것

| 항목 | 조치 | 이유 |
|------|------|------|
| **Docker Desktop** | **유지** — 제거하지 않음 | 화상 회의에 계속 필요 |
| **Windows Node.js** (nodejs.org 설치분) | **그대로 둠** — 제거하지 않음 | 새 팩은 폴더 안 번들 Node만 사용 |
| **이전 Mobility / Trial 폴더** | **중지 후 이름 변경 또는 삭제** | Node 20 팩은 `node:sqlite`로 즉시 실패 |
| **이전 Android VC 앱** | **새 APK로 덮어쓰기 설치** | 휴대폰 초기 불필요 |
| **Settings의 LAN IP** | **로그인 후 다시 설정** | 포트 **3988**; IPv4 확인 |
| **FTP / SIP 비밀번호** | storage를 비웠다면 Settings에서 재설정 | 팩에 비밀값 없음 |

**Docker나 Windows Node를 제거할 필요는 없습니다.**

---

## 2. 이전 체험판 완전 중지

1. Mobility / Fleet / Axiom / Ubitron 서버 콘솔 창을 모두 닫습니다.
2. Windows 서비스가 있으면: `net stop UbitronC2` (없을 수 있음).
3. 이전 URL `http://localhost:3888`이 더 이상 동작하지 않는지 확인합니다.
4. 종료되지 않으면 이전 폴더에서 관리자 PowerShell:  
   `powershell -ExecutionPolicy Bypass -File .\kill-fleet-ports.ps1`

**이 단계 실패 시:** PC를 한 번 재시작한 뒤 3단계로 진행합니다. 이전 서버가 실행 중이면 새 팩을 설치하지 마십시오.

---

## 3. 이전 애플리케이션 폴더 정리

1. 이전 폴더를 찾습니다 (예: `Mobility-Axiom`, `Trial June Mobility`, `Mobility-Trial`).
2. `Mobility-OLD-2026`처럼 **이름 변경**합니다 (즉시 삭제보다 안전).
3. 해당 폴더에서 `Install-Mobility.bat` / `Start Mobility.bat`를 다시 실행하지 마십시오.

**이 단계 실패 시:** 폴더가 사용 중이면 2단계로 돌아가 프로세스를 종료합니다.

---

## 4. 새 폴더에 Mobility Test 2 설치

1. zip 파일: `Mobility-Test-2-YYYYMMDD-HHMM.zip`.
2. **새** 경로에 압축 해제, 예: `C:\Mobility-Test-2\` — 이전 폴더 위에 덮어쓰지 않음.
3. 확인: `Install-Ubitron.bat`, `Start Ubitron.bat`, `MobilityConference-1.5.6.apk`, `Ubitron-ME8\`, `manuals\`.
4. Docker Desktop 실행(고래 아이콘 안정).
5. **`Install-Ubitron.bat`** 1회 실행.
6. **`Start Ubitron.bat`** 실행 — 서버 창을 닫지 않음.

**대시보드 URL:** `http://<서버-IP>:3988` (3888 아님).

**이 단계 실패 시:** Installation-Guide.md 4절의 실패 표를 따릅니다.

---

## 5. 선택 — 이전 데이터 유지

이전 체험에서 BWC·사용자가 **이미 정상**일 때만 사용합니다.

1. 새 서버를 중지한 뒤, 이전 `storage\`를  
   `C:\Mobility-Test-2\Ubitron-ME8\storage\`로 복사합니다.
2. **`platform-license.json`은 새 Mobility Test 2 팩의 파일을 사용**합니다.
3. **`Start Ubitron.bat`**로 다시 시작합니다.

이전 체험이 불안정했다면 **이 절을 건너뛰고** 깨끗이 설치한 뒤 Settings에서 카메라를 다시 등록하십시오.

---

## 6. 새 팩 첫 로그인

1. 브라우저: `http://127.0.0.1:3988` 또는 `http://<LAN-IP>:3988`.
2. `global` / `global123` (storage를 복원했다면 이전에 바꾼 비밀번호).
3. 즉시 비밀번호 변경: **Settings → Server Config → My account → Update password**, 또는 첫 로그인 후 강제 변경 페이지.
4. **비밀번호 안내:** 최초 설치는 `global123`. 변경한 뒤에는 **`global123`이 실패**합니다 — 새 비밀번호를 사용하세요. 변경 페이지에서는 12자 이상, 대·소문자·숫자·기호 포함(예: `Ab12cd34!@#$`)으로 직접 입력하세요. 붙여넣기·브라우저 저장 비밀번호에 의존하지 마세요.

**이 단계 실패 시:** 서버 창 유지 여부, 포트 **3988**, Ctrl+F5.

---

## 7. 네트워크 IP 및 바디캠 수정

이전 체험에서 가장 많은 불만이 나온 구간입니다. 로그인 **성공 후** 진행합니다.

1. **Settings → Server Config → Network & deployment**
2. **BWC SIP server IP** = 이 PC의 **IPv4** (호스트명 금지). **`172.17`–`172.31`(WSL/Docker) 금지.**
3. HTTP 포트 **3988** 확인 → **Save server settings**.
4. **BWCs** — Device ID·담당자 → **Save BWC list**.
5. 각 카메라 SIP에 **Type on BWC** 값 입력 (IPv4만).
6. 약 30초 후 **Online** 확인.

**오프라인인 경우:** 동일 LAN; 카메라 SIP가 이전 IP/포트를 가리키면 새 값으로 수정.

---

## 8. 화상 회의(휴대폰 앱) 수정

1. **`MobilityConference-1.5.6.apk`** 덮어쓰기 설치.
2. 서버 URL: `http://<대시보드와-동일한-LAN-IP>:3988`
3. 로그인 → 방 참가 → **Join with camera**.
4. 서버에서 Docker 실행 확인.

**영상이 안 되면:** URL에 아직 `:3888`이 남아 있는 경우가 가장 흔합니다.

---

## 9. 마이그레이션 확인

| 확인 | 기대 |
|------|------|
| 이전 폴더 | 이름 변경됨 / 미사용 |
| 대시보드 | 포트 **3988** |
| 로그인 | 성공; 비밀번호 변경됨 |
| Network | SIP IP = PC IPv4 |
| BWC | Online (현장 카메라 있을 때) |
| VC 앱 | 동일 IP + **:3988** |
| Docker | 설치·실행 중 |

---

## 10. 실패 시

| 문제 | 다음 조치 |
|------|-----------|
| `node:sqlite` 오류 | 아직 구 팩(Node 20) — Mobility Test 2(Node 22)만 사용 |
| 대시보드가 3888만 됨 | 이전 체험판 — **3988**로 마이그레이션 |
| `global123`으로 Invalid sign-in | 이미 비밀번호를 바꿨다면 **새 비밀번호** 사용 — `global123`은 의도적으로 실패합니다. 직접 입력하고 브라우저 저장 비밀번호를 쓰지 마세요. |
| 시작 후 접속 불가 | Installation-Guide.md 5절 |
| VC 실패 | Installation-Guide.md 8절 |
| Face Analytics 오프라인 | Installation-Guide.md 6절 |

---

*Ubitron Mobility C2 — Mobility Test 2. 이전 체험판에서 이전. 지원: vendor에 문의.*
