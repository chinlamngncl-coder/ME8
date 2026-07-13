# Ubitron Mobility C2 — 설치 가이드

**대상:** IT 설치 담당자, 시스템 관리자  
**함께 읽기:** Quick-Guide.md · Configuration-Manual.md · User-Manual.md · Migration-Guide.md  
**패키지:** Mobility Test 2 (영어, 필리핀어, 한국어)

이 가이드는 압축 해제된 폴더부터 대시보드, 화상 회의, 얼굴 분석이 동작할 때까지 순서대로 안내합니다. 각 단계를 순서대로 따르십시오. 실패 시 **이 단계가 실패한 경우**를 읽은 후 다음으로 진행하십시오.

**이전 체험판이 이미 있음**(포트 3888, 구 폴더, Node 오류)? 먼저 **Migration-Guide.md**를 따르고, 완전 신규 PC 설치가 필요할 때만 이 문서로 돌아오십시오.

---

## 목차

1. [시작 전 준비 사항](#1-시작-전-준비-사항)
2. [배송 폴더 압축 해제](#2-배송-폴더-압축-해제)
3. [Docker Desktop 설치](#3-docker-desktop-설치)
4. [1회 설치 프로그램 실행](#4-1회-설치-프로그램-실행)
5. [서버 시작 및 로그인](#5-서버-시작-및-로그인)
6. [얼굴 분석용 Python 설치](#6-얼굴-분석용-python-설치)
7. [서버 구성 (첫 로그인 후)](#7-서버-구성-첫-로그인-후)
8. [Android 화상 회의 앱 설치](#8-android-화상-회의-앱-설치)
9. [설치 확인](#9-설치-확인)
10. [문제 해결](#10-문제-해결)

---

## 1. 시작 전 준비 사항

| 항목 | 필수? | 비고 |
|------|-------|------|
| Windows 10 또는 11 (64비트) | 예 | Docker 및 방화벽 설정에 관리자 권한 |
| 본 배송 패키지 | 예 | 전체 폴더 — `Ubitron-ME8\` 삭제 금지 |
| **Node.js** | **아니오** | `Ubitron-ME8\tools\node\`에 포함 |
| **Docker Desktop** | 예 | 화상 회의(LiveKit)에 필요 |
| **Python 3.11+** | 예 (얼굴 분석) | [6절](#6-얼굴-분석용-python-설치)에서 설치 |
| 인터넷 | 최초 설치 시만 | Docker 이미지; 얼굴 분석용 Python 패키지 |
| LAN | 예 | 서버 PC와 바디캠이 동일 네트워크 |

**본 패키지에 포함된 라이선스**

| 항목 | 한도 |
|------|------|
| 바디캠 | 5대 |
| 대시보드 사용자 | 10명 |
| 얼굴 분석 소스 | 5 |
| 화상 회의 | 사용 가능 |
| 유효 기간 | 2036-07-12 |

라이선스 키 입력 불필요 — 서명된 라이선스가 `Ubitron-ME8\storage\platform-license.json`에 있습니다.

---

## 2. 배송 폴더 압축 해제

1. 바탕화면에서 zip 파일을 찾습니다 (예: `Mobility-Test-2-YYYYMMDD-HHMM.zip`).
2. 마우스 오른쪽 → **모두 압축 풀기**
3. 고정 경로 선택, 예: `C:\Mobility-Test-2\`
4. 압축 해제 후 다음 항목 확인:

| 경로 | 용도 |
|------|------|
| `Install-Ubitron.bat` | 1회 설치 |
| `Start Ubitron.bat` | 매일 서버 시작 |
| `Ubitron-ME8\` | 애플리케이션 (삭제 금지) |
| `MobilityConference-1.5.6.apk` | Android 화상 회의 앱 |
| `manuals\en\` · `manuals\fil\` · `manuals\ko\` | 3개 언어 매뉴얼 |

**이 단계가 실패한 경우:** 디스크 여유 ≥ 8 GB 확인. 특수 문자 없는 짧은 경로에 다시 압축 해제 (예: `C:\Mobility-Test-2\`).

---

## 3. Docker Desktop 설치

화상 회의는 Docker 내 LiveKit을 사용합니다.

1. 다운로드: https://www.docker.com/products/docker-desktop/
2. 설치 프로그램 실행 — IT 정책이 없으면 기본값 유지.
3. 설치 프로그램이 요청하면 PC 재시작.
4. 시작 메뉴에서 **Docker Desktop** 실행.
5. 시스템 트레이 고래 아이콘이 **안정**될 때까지 대기.

**이 단계가 실패한 경우**

| 증상 | 다음 조치 |
|------|-----------|
| Docker 시작 안 됨 | 가상화(BIOS/UEFI) 활성화. IT에 Hyper-V 또는 WSL2 확인 요청. |
| “Docker daemon not running” | Docker Desktop 수동 실행; 2분 대기; [4절](#4-1회-설치-프로그램-실행) 재시도. |
| 프록시로 다운로드 차단 | IT에 `docker.io`, `registry-1.docker.io` 허용 요청. |

---

## 4. 1회 설치 프로그램 실행

1. 압축 해제 폴더 열기 (예: `C:\Mobility-Test-2\`).
2. **`Install-Ubitron.bat`** 더블클릭.
3. 스크립트 수행 내용:
   - **1/4** — 번들 Node.js 및 라이브러리 확인
   - **2/4** — PC LAN IP로 `.env` 생성
   - **3/4** — Docker에서 LiveKit 시작
   - **4/4** — 얼굴 분석 준비 (Python 설치된 경우)

4. 출력 확인. **Install complete** 표시 후 아무 키나 눌러 종료.

**`npm install`을 실행하지 마십시오** — 의존성은 패키지에 포함되어 있습니다.

**이 단계가 실패한 경우**

| 증상 | 다음 조치 |
|------|-----------|
| “Docker Desktop is required” | [3절](#3-docker-desktop-설치) 완료 후 `Install-Ubitron.bat` 재실행. |
| “Bundled Node runtime missing” | 전체 zip 다시 압축 해제; 파일만 복사하지 말 것. |
| LiveKit 시작 실패 | Docker Desktop → **Containers** — 멈춘 `livekit` 제거 → 설치 재실행. |
| Python 안내만 표시 | 첫 로그인 후 [6절](#6-얼굴-분석용-python-설치) 진행. |

---

## 5. 서버 시작 및 로그인

1. 패키지 루트에서 **`Start Ubitron.bat`** 더블클릭.
2. **Ubitron ME8 Server** 콘솔 창이 열림 — **닫지 마십시오**.
3. 브라우저가 자동으로 열림 (예: `http://192.168.1.10:3988/`).

**`172.17`–`172.31` 주소는 사용하지 마세요** (WSL/Docker 가상망). 카메라·PTT가 실패합니다. 실제 Wi‑Fi/이더넷 IPv4(`192.168.x.x` 등)를 사용하세요.
4. 로그인:

| 항목 | 값 |
|------|-----|
| URL | `http://<서버-IP>:3988` |
| 사용자명 | `global` |
| 비밀번호 | `global123` |

5. 즉시 비밀번호 변경: **Settings → Server Config → My account → Update password**.

**이 단계가 실패한 경우**

| 증상 | 다음 조치 |
|------|-----------|
| 브라우저 연결 불가 | 서버 창이 열려 있는지 확인. 10초 대기 후 새로고침. 서버 PC에서 `http://127.0.0.1:3988` 시도. |
| “Run Install-Ubitron.bat once first” | 먼저 [4절](#4-1회-설치-프로그램-실행) 완료. |
| 로그인 거부 | 최초 설치 시 정확히 `global` / `global123`. Caps Lock 확인. |
| 포트 사용 중 | 다른 Mobility/Ubitron 창 종료. `kill-fleet-ports.ps1` 실행 후 `Start Ubitron.bat` 재시도. |

---

## 6. 얼굴 분석용 Python 설치

얼굴 분석(감시 목록 매칭)에는 Python 3.11 이상이 필요합니다. 서버 PC에 1회 설치.

1. 다운로드: https://www.python.org/downloads/
2. 설치 프로그램 실행.
3. 첫 화면에서 **Add python.exe to PATH** 선택.
4. **Install Now** — 완료까지 대기.
5. 새 명령 프롬프트에서 `py --version` — Python 3.11 이상 확인.
6. **`Install-Ubitron.bat`** 다시 실행 (4/4 — 5~15분 소요 가능).
7. 또는 **`START-FACE-MATCHING.bat`** 실행 후 Face watch 사용 중 창 유지.

**이 단계가 실패한 경우**

| 증상 | 다음 조치 |
|------|-----------|
| `py` 인식 안 됨 | **Add to PATH** 선택 후 Python 재설치; PC 재부팅. |
| pip 설치 오류 | 인터넷 확인; 설치 재실행; 백신이 `Ubitron-ME8\fr-sidecar\` 차단 여부 확인. |
| Face watch 오프라인 | **START-FACE-MATCHING.bat** 실행; 강력 새로고침(Ctrl+F5). |

---

## 7. 서버 구성 (첫 로그인 후)

로그인 성공 **후** 완료. 상세는 **Configuration-Manual.md**.

### 7.1 네트워크

1. **Settings → Server Config → Network & deployment**
2. **BWC SIP server IP**를 이 PC IPv4로 설정 (호스트명 금지). **`172.17`–`172.31`(WSL/Docker) 금지.**
3. **Save server settings**.

### 7.2 바디캠 등록

1. **Settings → Server Config → BWCs**
2. **Add row** → **Device ID**(카메라와 동일) 및 **Officer** 이름.
3. **Save BWC list**.
4. 각 카메라 SIP 화면에 **Type on BWC** 값 입력 (IPv4만).
5. 약 30초 대기 — **Online** 확인.

### 7.3 FTP 도킹 (선택)

1. **Settings → Server Config → Evidence / FTP**
2. FTP 사용자명 및 비밀번호 설정.
3. 각 도킹 스테이션에 동일 포트(`2121`) 및 자격 증명 적용.

**BWC가 오프라인인 경우:** 동일 LAN; 서버 IP ping; SIP 비밀번호가 **Type on BWC**와 일치하는지 확인.

---

## 8. Android 화상 회의 앱 설치

1. **`MobilityConference-1.5.6.apk`**를 Android 기기로 복사.
2. **알 수 없는 앱 설치** 허용 (Android 안내 시).
3. APK 설치.
4. **Mobility Conference** 실행.
5. 서버 URL = 대시보드 URL (예: `http://192.168.1.10:3988`).
6. 로그인 → 방 열기 → **Join with camera**.

**영상 연결 실패 시:** Docker 실행 여부; 동일 LAN; Windows 방화벽에서 7880, 7881 포트 허용 (Configuration-Manual §10 참조).

---

## 9. 설치 확인

| 확인 항목 | 기대 결과 |
|-----------|-----------|
| 대시보드 | `http://<서버-IP>:3988` — 지도 또는 로그인 |
| 슈퍼 관리자 로그인 | `global`(또는 변경한 비밀번호) 성공 |
| Docker | LiveKit 관련 컨테이너 실행 중 |
| BWC 온라인 | SIP 구성 후 최소 1대 **Online** |
| 화상 회의 | Android 앱 영상 연결 |
| 얼굴 분석 | **START-FACE-MATCHING.bat** 창 열림; Face watch 정상 |

모든 확인 통과 시 운영자에게 **User-Manual.md** 전달.

---

## 10. 문제 해결

| 문제 | 가능한 원인 | 다음 조치 |
|------|-------------|-----------|
| 대시보드 접속 불가 | 서버 창 닫힘 또는 포트 차단 | `Start Ubitron.bat`; 방화벽 3988 포트 |
| 화상 회의 실패 | Docker 중지 | Docker Desktop 시작; 설치 2단계 재실행 |
| 라이선스 오류 | `platform-license.json` 누락/편집 | 원본 패키지 복원; vendor 문의 — 라이선스 파일 편집 금지 |
| 얼굴 매칭 준비 안 됨 | Python 미설치 또는 sidecar 중지 | [6절](#6-얼굴-분석용-python-설치); START-FACE-MATCHING.bat |
| FTP 업로드 실패 | 잘못된 포트 또는 비밀번호 | 포트 2121; Settings → FTP와 장치 일치 |
| 재시작 시 EADDRINUSE | 이전 서버 프로세스 잔존 | 관리자 권한으로 `Ubitron-ME8\kill-fleet-ports.ps1` |

방화벽 및 포트 목록은 **Configuration-Manual.md**. 일상 운영은 **User-Manual.md**.

---

*Ubitron Mobility C2 — Mobility Test 2 배송 패키지. 지원: vendor에 문의.*
