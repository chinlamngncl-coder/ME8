# Mobility Axiom — 사용자 매뉴얼 (운영자 가이드)

**대상:** 디스패처, 감독관, 증거 담당자, 관제실 운영자.  
**관련 문서:** **빠른 시작 가이드**(설치) · **구성 매뉴얼**(서버/BWC) · **README.txt**

이 가이드는 대시보드의 **모든 탭**, **주요 버튼**, **단계별 워크플로**를 설명합니다. UI 라벨은 선택한 언어와 일치합니다.

---

## 목차

1. [시스템 기능](#1-시스템-기능)
2. [로그인, 언어, 로그아웃](#2-로그인-언어-로그아웃)
3. [헤더 바](#3-헤더-바)
4. [Operations 탭 레이아웃](#4-operations-탭-레이아웃)
5. [Device Summary(함대 표)](#5-device-summary함대-표)
6. [SOS](#6-sos)
7. [PTT 그룹 및 메시지](#7-ptt-그룹-및-메시지)
8. [지도](#8-지도)
9. [지오펜싱](#9-지오펜싱)
10. [비디오 월(6패널)](#10-비디오-월6패널)
11. [Evidence & Docking](#11-evidence--docking)
12. [Command Wall](#12-command-wall)
13. [Centre Summary](#13-centre-summary)
14. [Video Conference](#14-video-conference)
15. [Settings 및 Audit Trail](#15-settings-및-audit-trail)
16. [사용자 역할](#16-사용자-역할)
17. [워크플로 예시](#17-워크플로-예시)
18. [문제 해결](#18-문제-해결)

---

## 1. 시스템 기능

| 기능 | UI 위치 | 할 수 있는 일 |
|------|---------|----------------|
| 실시간 GPS 지도 | Operations → 지도 | 요원 위치, SOS, 녹화 상태 |
| BWC 라이브 영상 | 지도 핀 패널, 비디오 월, Command Wall | 다중 스트림(Operations 기본 6) |
| 음성/PTT | 함대 표, 지도 핀, PTT 그룹 | 1:1 또는 그룹 무전 |
| SOS | 헤더 배너, SOS 로그, 지도 | 알람, 보고서, 폴더보내기 |
| BWC 문자 | Operations → Messages | 온라인 카메라에 텍스트 |
| 증거 라이브러리 | Evidence 탭 | 도크 업로드, 서버 녹화, 사건 파일 검색 |
| 화상 회의 | Video Conference 탭 | 휴대폰·PC·BWC 라이브 공유 |
| 관리 | Settings → Server Config | 네트워크, BWC 목록, 운영자 |

---

## 2. 로그인, 언어, 로그아웃

### 2.1 첫 로그인

1. 브라우저 열기(Chrome 또는 Edge 권장).
2. `http://<서버-IP>:3888` 접속(같은 PC: `http://localhost:3888`).
3. **사용자명**·**비밀번호** 입력(체험: `global` / `global123`).
4. **Sign in** 클릭.

### 2.2 언어 변경

- **로그인 화면:** 드롭다운에서 언어 선택.
- **로그인 후:** 헤더 오른쪽 **Language** 드롭다운.
- APAC: 영어, 한국어, 태국어, 인도네시아어, 필리핀어.

### 2.3 비밀번호 변경(슈퍼 관리자)

1. **Settings** → **Server Config**.
2. **Dashboard Auth** 열기.
3. 사용자 행에서 새 비밀번호 → **Save**.

### 2.4 로그아웃

1. **Settings** 탭.
2. 왼쪽 패널 **Sign out**.
3. 공용 PC에서는 반드시 로그아웃.

---

## 3. 헤더 바

| 컨트롤 | 위치 | 기능 |
|--------|------|------|
| **Mobility Axiom** 로고 | 왼쪽 상단 | 브랜드 |
| **Voice mute** 🔊 | 오른쪽 | SOS/알림 음성 음소거 |
| **Repeat** | 오른쪽 | 마지막 음성 알림 반복 |
| **Language** | 오른쪽 | UI 언어 변경 |
| **SOS 배너** | 헤더 아래(SOS 시) | 장치명, 시간, 조치 |

---

## 4. Operations 탭 레이아웃

로그인 후 기본 화면.

### 4.1 세 영역

| 영역 | 내용 |
|------|------|
| **왼쪽 사이드바** | Device Summary, SOS 로그, PTT 그룹, Messages, Storage |
| **중앙** | 지도 + 도구 모음 |
| **오른쪽** | 라이브 비디오 6패널 |

### 4.2 사이드바 접기

사이드바와 지도 사이 **◀** 클릭.

### 4.3 상단 도구(Operations 시)

| 항목 | 동작 |
|------|------|
| **Auto-rotate** | 6패널 자동 순환 |
| **Popout Matrix** | 다른 모니터 전체 화면 |
| **Config** | 비디오 월 할당 |

---

## 5. Device Summary(함대 표)

**위치:** Operations → **Device Summary**.

### 5.1 검색·필터

1. **Search** — 요원명 또는 장치 ID.
2. **Filter:** All / Online only / Offline only.

### 5.2 열 설명

| 열 | 사용법 |
|----|--------|
| **Pin** | 클릭 — 지도 핀+플로팅 영상 토글 |
| **PTT** | **길게 누름** — 1:1 음성 |
| **Call** | 클릭 — 음성 통화 |
| **GPS** | 클릭 — 경로/추적 |
| **Device** | 요원명·장치 ID |
| **Status** | Online / Offline |

### 5.3 일괄 작업

- **Open All (Up to 6)** — 최대 6대 지도에 표시
- **Clear map pins** — 모든 핀 패널 제거

### 5.4 한 요원 모니터링

1. 표에서 찾기 → **Online** 확인.
2. **Pin** 클릭 → 지도 줌, 영상 열림.
3. **PTT** 길게 눌러 통화.

---

## 6. SOS

### 6.1 활성 SOS

1. 헤더 아래 **빨간 배너**.
2. 지도 **SOS 위치로 줌**.
3. **Pin**·**PTT**·**SOS 로그** 행으로 상세 확인.

**디스패처 조치:**

1. 필요 시 **응답 반경**(200–1000 m) — 지도 빨간 원.
2. **Pin**으로 알람 요원 실시간 영상 확인.
3. **Acknowledge** — §6.1b(체크된 근처 요원으로 PTT 팀), 또는 배너 **PTT team**.
4. **PTT TEAM · ON** 시 월/핀에서 **PTT 길게** — 전체 팀 음성.
5. **SOS 로그** 행에서 상세 보고서.

### 6.1b 응답 반경 및 SOS PTT 팀

| 배너 | 동작 |
|------|------|
| **반경 칩** | 200–1000 m — 지도상 “근처” 단위 |
| **요약 줄** | 근처 요원 이름·거리 |
| **PTT team** | 지금 PTT 그룹 푸시(알람 요원 + 반경 내 온라인); 알람 유지 |
| **Acknowledge** | 로그에 알람 종료; 아래 절차 |

**권장 — Acknowledge 시 자동 PTT 팀:** 배너 **Acknowledge** → 근처 요원 **기본 체크**(제외 시 체크 해제) → 메모 후 **Submit** → **PTT team ON** 토스트 → 알람 요원 월/핀에서 **PTT 길게**(전체 팀, 음성만).

**수동:** 알람이 열린 상태에서 **PTT team** 클릭 후 동일하게 PTT.

**참고:** 도우미는 **온라인**이고 반경 내(GPS). 팀 없이 로그만 하려면 Ack에서 **전체 체크 해제**. 서버 PTT 활성화 필요(Configuration Manual).

### 6.2 SOS 로그

| 항목 | 동작 |
|------|------|
| 행 클릭 | 사건 대화상자 + 지도 이동 |
| **Open incident files** | 서버 SOS 폴더 |
| **Download CSV** | 로그보내기 |

민감 보고서는 **PIN** 입력 후 **Unlock**.

---

## 7. PTT 그룹 및 메시지

### 7.1 PTT 그룹

1. **맵 그룹** 선택 또는 표에서 **2대 이상** 체크.
2. **Join group PTT** → **Ungroup all**로 해제.

### 7.2 Messages

온라인 BWC 클릭 → 메시지 입력 → **Send**. UI 24시간, 서버 30일 보관.

---

## 8. 지도

- 드래그: 이동, 휠: 줌.
- **Pin** 클릭 또는 함대 **Pin** — 플로팅 패널(영상, **PTT**, 최소화/확대).
- 도구 모음: **Wall Map**, **Snapshot**, SD/서버 녹화, 지오펜싱.

---

## 9. 지오펜싱

1. 반경(미터) 입력 → **Set geofencing**.
2. BWC 선택 → 지도에서 위치 → **Save geofence**.
3. **Clear geofencing**으로 제거.

---

## 10. 비디오 월(6패널)

- **Auto-rotate**, **Popout Matrix**, **Config**(6패널별 장치/그룹/CSV), 패널 **Stop**.

---

## 11. Evidence & Docking

**하위 탭:** Overview · Docking Stations · Evidence Library · Case Files · Route & GPS · Storage

1. **Evidence Library** — **Refresh**, 검색, **Detail** 미리보기, **Download**.
2. **Docking Stations** — **Register dock**, 베이 상태.
3. **Case Files** — **New case file**, **Create from SOS**, 증거 연결.
4. **Route & GPS** — 장치·기간 선택 재생.
5. **Storage**(관리자) — 경로 저장 → **Scan FTP**.

---

## 12. Command Wall

**Live wall:** Roster에서 **드래그** → 패널에 놓기 → 레이아웃 1/4/9/16/32 → **Rotate** → **Spotlight** → **Clear wall**.

**Display room:** **4-Monitor SOS Room** 멀티 모니터 프리셋.

---

## 13. Centre Summary

KPI, SOS 차트, 저장소, 시스템 상태, **AI assistant** → **Ask**. **Refresh**.

---

## 14. Video Conference

Docker 필요. **Live** → 방 이름 → **Join Room**. 레이아웃(Gallery, Speaker 등), **Share screen**, BWC **Add to Room**. APK: MobilityConference-1.5.6.apk.

---

## 15. Settings 및 Audit Trail

**Server Config**, 라이프사이클 카드(Onboarding, Assets 등), **Audit Trail**(날짜 필터 → **Apply** → **Export CSV**), **Sign out**.

---

## 16. 사용자 역할

| 역할 | Server Config |
|------|---------------|
| Super admin | 전체 편집 |
| Operator | 읽기 전용 |
| Custom | Dashboard Auth에서 설정 |

---

## 17. 워크플로 예시

**교대 시작:** Start Mobility.bat → Operations → 온라인 수 → Settings IP 확인.

**사건:** Pin → PTT → 필요 시 서버 녹화.

**SOS:** 배너 → 반경 설정 → **Acknowledge**(근처 체크 유지) 또는 **PTT team** → **PTT** 길게(전체 팀) → 로그 → Evidence **Create from SOS**.

**TV 월:** Command Wall 16 → Rotate 30초.

---

## 18. 문제 해결

| 증상 | 조치 |
|------|------|
| 전체 Offline | 구성 매뉴얼 — 네트워크·Type on BWC |
| 영상 없음 | 방화벽 3889, Pin 확인 |
| PTT 무음 | 버튼 길게 누르기 |
| SOS PTT 한 대만 | 팀 미구성 | Ack 시 helper 체크 또는 **PTT team**; **PTT team ON** 대기 |
| Ack 목록에 근처 없음 | GPS 없음/오프라인 | 위치 대기; 반경 확대 |
| VC 실패 | Docker 실행, Install-Mobility.bat |

---

## 문서 안내

| 필요 시 | 문서 |
|---------|------|
| 설치 | **빠른 시작 가이드** |
| 서버/BWC | **구성 매뉴얼** |
| 일상 운영 | **이 사용자 매뉴얼** |
