# Mobility Axiom — 구성 매뉴얼

**대상:** IT 담당자, 슈퍼 관리자, 설치 담당자.  
**함께 읽기:** **빠른 시작 가이드** · **사용자 매뉴얼**

서버 설정, BWC 등록, 운영자, 저장소, 방화벽, 화상 회의를 단계별로 설명합니다.

---

## 목차

1. [시작 전 준비](#1-시작-전-준비)
2. [Server Config 열기](#2-server-config-열기)
3. [Network & deployment](#3-network--deployment)
4. [BWC 등록](#4-bwc-등록)
5. [Map groups](#5-map-groups)
6. [Dashboard Auth](#6-dashboard-auth)
7. [증거 저장 경로](#7-증거-저장-경로)
8. [Video Conference](#8-video-conference)
9. [Centre Summary AI](#9-centre-summary-ai)
10. [방화벽 및 포트](#10-방화벽-및-포트)
11. [체험 라이선스](#11-체험-라이선스)
12. [비밀번호 및 감사](#12-비밀번호-및-감사)
13. [설정 확인 체크리스트](#13-설정-확인-체크리스트)

---

## 1. 시작 전 준비

| 항목 | 요구 사항 |
|------|-----------|
| 서버 PC | Windows 10/11 64비트, 고정 LAN IP 권장 |
| 팩 | 압축 해제 후 `Install-Mobility.bat` 1회 실행 |
| Docker Desktop | 설치·실행(화상 회의용) |
| BWC | 전원, 네트워크, SIP 화면 접근 |
| 네트워크 | 서버와 BWC 동일 LAN, 카메라 키패드 **IPv4만** |

별도 Node.js 설치 불필요 — `Mobility-Axiom\tools\node\` 포함.

---

## 2. Server Config 열기

1. 슈퍼 관리자 로그인(체험: `global`).
2. **Settings** → **Server Config**.
3. 왼쪽: **Network & deployment** | **BWCs** | **Map groups** | **Dashboard Auth**.

운영자 계정은 **읽기 전용**.

---

## 3. Network & deployment

### 3.1 Deployment

**LAN server** 선택 → **Save server settings**.

### 3.2 LAN network (중요)

1. **BWC SIP server IP** = 이 PC **IPv4**(예: `192.168.1.10`) — 호스트명 금지.
2. HTTP `3888`, 비디오 WS `3889` 확인.
3. **Save server settings**.

### 3.3 BWC camera register

Platform ID, Realm, Password 설정 → **Type on BWC** 값을 각 카메라 SIP에 입력.

---

## 4. BWC 등록

**BWCs** 탭:

1. 행 추가 → **Device ID**(카메라와 동일) → **Officer** 이름 → **Map group**(선택).
2. **Save BWC list**.

**카메라 SIP 화면:**

| 필드 | 값 |
|------|-----|
| SIP 서버 | 서버 IPv4 |
| 포트 | 5060 |
| Platform ID / Realm / Password | Server Config와 동일 |
| Device ID | BWC 목록과 동일 |

30초 후 **Operations** → **Online** 확인.

체험 팩은 `FM_SEED_BWC_ID=` 비움 — 데모 장치 없음.

---

## 5. Map groups

그룹 이름·색상 생성 → BWCs 탭에서 할당 → 핀 색, PTT, 비디오 월에 사용.

---

## 6. Dashboard Auth

**Operator:** Operations·Evidence·Command Wall·VC 허용, Server Config 편집 금지 → 행 **Save**.

**Super admin** 추가 시 동일하게 **Save**.

---

## 7. 증거 저장 경로

FTP 업로드, 라이브 캡처, 증거 인덱스 경로 설정 → **Save storage** → **Scan FTP for evidence**.

NAS는 Windows에 마운트 후 경로 지정.

SOS 시 자동 서버 녹화 옵션 활성화 가능.

---

## 8. Video Conference

1. Docker Desktop 설치.
2. `Install-Mobility.bat` — บริการประชุมทางวิดีโอ 시작.
3. **Video Conference → Settings** — 휴대폰용 WebSocket URL(예: `ws://192.168.1.10:7880`).

`MobilityConference-1.5.6.apk` 배포.

---

## 9. Centre Summary AI

- 어시스턴트는 설치 패키지에 포함(~1GB). 현장 다운로드 없음. 첫 **Ask** 1–2분. 슈퍼 관리자만.

---

## 10. 방화벽 및 포트

| 포트 | 서비스 |
|------|--------|
| 3888 | 대시보드 HTTP |
| 3889 | 라이브 비디오 WS |
| 5060 | SIP |
| 7880 | บริการประชุมทางวิดีโอ |
| 40130+ UDP | RTP |

---

## 11. 체험 라이선스

5 BWC · 10 사용자 · 1년(발급 라이선스 기준).

---

## 12. 비밀번호 및 감사

비밀번호: **Dashboard Auth** → 행 **Save**.

**Audit Trail**에서 필터·CSV보내기.

---

## 13. 설정 확인 체크리스트

| 단계 | 통과 |
|------|------|
| Install-Mobility.bat 성공 | ☐ |
| Docker 실행 | ☐ |
| localhost:3888 접속 | ☐ |
| LAN IP = PC IPv4 | ☐ |
| BWC 등록·저장 | ☐ |
| 카메라 SIP 일치 | ☐ |
| 60초 내 Online | ☐ |
| Pin 라이브 영상 | ☐ |
| PTT 음성 | ☐ |
| FTP 스캔 | ☐ |
| VC Join Room | ☐ |
| 운영자 읽기 전용 테스트 | ☐ |

실패 시 사용자 매뉴얼 §18 및 `VIEW-LOG.bat` 확인.
