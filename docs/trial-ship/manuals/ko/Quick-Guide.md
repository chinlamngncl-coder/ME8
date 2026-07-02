# Mobility Axiom — 빠른 시작 가이드

## 이 PC에 필요한 것

| 항목 | 필수? | 설명 |
|------|-------|------|
| Windows 10/11 (64비트) | 예 | Docker 설치 시 관리자 권한 |
| **Node.js** | **아니오** | 패키지에 포함 (`Mobility-Axiom\tools\node\`) |
| **Docker Desktop** | 예 (화상회의) | [다운로드](https://www.docker.com/products/docker-desktop/) |
| 인터넷 | 최초 설치 시 | 화상회의용 Docker 이미지 다운로드 |

## 설치 (한 번)

1. 배송 폴더 전체를 **압축 해제** (예: `C:\Mobility-Trial\`).
2. 위 링크에서 **Docker Desktop** 설치 후 실행 — 고래 아이콘이 안정될 때까지 대기.
3. **`Install-Mobility.bat`** 더블클릭 (패키지 루트).
   - 번들 Node 및 라이브러리 확인
   - LAN IP로 `.env` 생성
   - LiveKit(화상회의) 시작
4. 사용할 때마다 **`Start Mobility.bat`** 더블클릭.

**`npm install`을 실행하지 마세요** — 의존성은 패키지에 포함되어 있습니다.

## 첫 로그인
| Field | Value |
|-------|-------|
| URL | http://<서버-IP>:3888 |
| 사용자명 | global |
| 비밀번호 | global123 |

## BWC 온라인 (요약)
1. **Settings → Server Config → Network** — set server IPv4 → **Save server settings**.
2. **Settings → Server Config → BWCs** — add Device ID + officer name → **Save BWC list**.
3. On each BWC SIP screen — enter values from **Type on BWC** (IPv4 only).
4. Wait ~30s — device shows **Online** in fleet list.

## 화상 회의 (휴대폰)
1. Install **MobilityConference-1.5.6.apk** on Android.
2. Server URL = same as dashboard (http://<server-ip>:3888).
3. Sign in → open room → Join with camera.

## 체험 라이선스
5 BWC · 10 dashboard users · 1 year.

Full steps: **Configuration Manual** in this folder.
