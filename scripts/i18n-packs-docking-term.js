'use strict';

/**
 * Non-English translations for "Docking" (English UI keeps "Docking").
 * Meaning guided by 采集站 — BWC evidence collection / ingest station.
 */
module.exports = {
  ko: {
    'nav.evidenceDocking': '증거·수집 스테이션',
    'server.tab.docking': '수집 스테이션',
    'storage.ftpHint': '서버 설정 → 수집 스테이션에서 폴더 설정',
    'firmware.dock.title': '수집 스테이션 업그레이드',
    'firmware.dock.note': '펌웨어는 교대 종료 시 벤더 수집 스테이션에서도 업데이트할 수 있습니다. 스테이션 증거 업로드는 Server 탭의 FTP 설정을 사용합니다.',
    'server.dock.hint': '수집 스테이션과 BWC가 FTP로 이 서버에 영상을 업로드합니다. 각 장치에 설정한 것과 동일한 서버 IP와 FTP 비밀번호를 사용하세요.',
    'server.dock.host': 'FTP 호스트 (수집 스테이션용)',
    'evidence.dockFtpTarget': '수집 스테이션 FTP 대상 (IT 참고)',
    'evidence.pathsHint': '수집 스테이션 FTP 및 서버 라이브 캡처 파일 저장 위치를 설정하세요. NAS 경로는 IT 팀이 이 서버에 마운트합니다 — Mobility는 여기서 지정한 폴더에만 기록합니다.',
    'server.onvif.rtspUrl': 'RTSP 라이브 URL (수집 스테이션 / VMS)',
    'server.users.permHint': '아래에서 운영자 권한을 설정한 뒤 해당 행에서 Save를 클릭하세요. Sign-in from/until은 대시보드 사용 가능 기간을 제어합니다. Geofencing은 지도에서 설정/해제를 허용합니다. Evidence until은 수집 스테이션 내보내기만 제한합니다. Super admin은 설치 계정입니다.',
  },
  th: {
    'nav.evidenceDocking': 'หลักฐานและสถานีเก็บรวบรวม',
    'server.tab.docking': 'สถานีเก็บรวบรวม',
    'storage.ftpHint': 'ตั้งโฟลเดอร์ที่ ตั้งค่าเซิร์ฟเวอร์ → สถานีเก็บรวบรวม',
    'firmware.dock.title': 'อัปเกรดสถานีเก็บรวบรวม',
    'firmware.dock.note': 'อัปเดตเฟิร์มแวร์ได้ที่สถานีเก็บรวบรวมของ vendor เมื่อคืนกล้องหลังกะ อัปโหลดหลักฐานจากสถานีใช้การตั้งค่า FTP ที่แท็บ Server',
    'server.dock.hint': 'สถานีเก็บรวบรวมและ BWC อัปโหลดวิดีโอผ่าน FTP มายังเซิร์ฟเวอร์นี้ ใช้ IP เซิร์ฟเวอร์และรหัส FTP เดียวกับที่ตั้งบนอุปกรณ์',
    'server.dock.host': 'โฮสต์ FTP (สำหรับสถานีเก็บรวบรวม)',
    'evidence.dockFtpTarget': 'Dock FTP Target (IT Reference)',
    'evidence.pathsHint': 'ตั้งที่เก็บไฟล์ FTP จากสถานีเก็บรวบรวมและ live capture บนเซิร์ฟเวอร์ ทีม IT mount NAS บนเซิร์ฟเวอร์นี้ — Mobility เขียนเฉพาะโฟลเดอร์ที่ตั้งที่นี่',
    'server.onvif.rtspUrl': 'URL live RTSP (จากสถานีเก็บรวบรวม / VMS)',
    'server.users.permHint': 'ตั้งสิทธิ์ผู้ปฏิบัติการด้านล่าง แล้วกด Save ที่แถว Sign-in from/until ควบคุมช่วงใช้แดชบอร์ด Geofencing อนุญาตตั้ง/ล้างบนแผนที่ Evidence until จำกัดเฉพาะ export จากสถานีเก็บรวบรวม Super admin คือบัญชีติดตั้ง',
  },
  id: {
    'nav.evidenceDocking': 'Bukti & stasiun pengumpulan',
    'server.tab.docking': 'Stasiun pengumpulan',
    'storage.ftpHint': 'Setel folder di Konfigurasi server → Stasiun pengumpulan',
    'firmware.dock.title': 'Upgrade stasiun pengumpulan',
    'firmware.dock.note': 'Firmware juga bisa diperbarui di stasiun pengumpulan vendor saat petugas mengembalikan kamera akhir shift. Upload bukti dari stasiun memakai pengaturan FTP di tab Server.',
    'server.dock.hint': 'Stasiun pengumpulan dan BWC mengunggah video via FTP ke server ini. Gunakan IP server dan kata sandi FTP yang sama seperti dikonfigurasi di setiap perangkat.',
    'server.dock.host': 'Host FTP (untuk stasiun pengumpulan)',
    'evidence.dockFtpTarget': 'Dock FTP Target (Referensi IT)',
    'evidence.pathsHint': 'Konfigurasi lokasi penyimpanan file FTP stasiun pengumpulan dan live capture server. Path NAS dipasang oleh tim IT di server ini — Mobility hanya menulis ke folder yang Anda setel di sini.',
    'server.onvif.rtspUrl': 'URL live RTSP (dari stasiun pengumpulan / VMS)',
    'server.users.permHint': 'Setel wewenang setiap operator di bawah, lalu klik Save pada baris itu. Sign-in from/until mengontrol kapan mereka boleh memakai dashboard. Geofencing mengizinkan set/clear di peta. Evidence until membatasi export stasiun pengumpulan saja. Super admin adalah akun instalasi.',
  },
  fil: {
    'nav.evidenceDocking': 'Ebidensya at istasyon ng pagkolekta',
    'server.tab.docking': 'Istasyon ng pagkolekta',
    'storage.ftpHint': 'I-set ang folder sa Setting ng Server → Istasyon ng pagkolekta',
    'firmware.dock.title': 'Mga upgrade ng istasyon ng pagkolekta',
    'firmware.dock.note': 'Maaari ring i-update ang firmware sa istasyon ng pagkolekta ng vendor kapag ibinabalik ng mga opisyal ang camera pagkatapos ng shift. Ang evidence upload mula sa istasyon ay gumagamit ng FTP settings sa Server tab.',
    'server.dock.hint': 'Ang mga istasyon ng pagkolekta at BWC ay nag-a-upload ng video via FTP sa server na ito. Gamitin ang parehong server IP at FTP password na naka-configure sa bawat device.',
    'server.dock.host': 'FTP host (para sa istasyon ng pagkolekta)',
    'evidence.dockFtpTarget': 'Dock FTP Target (IT Reference)',
    'evidence.pathsHint': 'I-configure kung saan naka-store ang FTP ng istasyon ng pagkolekta at live capture ng server. I-mount ng IT team ang NAS sa server na ito — sa folder lang na itinakda dito magsusulat ang Mobility.',
    'server.onvif.rtspUrl': 'RTSP live URL (mula sa istasyon ng pagkolekta / VMS)',
    'server.users.permHint': 'I-set ang awtoridad ng bawat operator sa ibaba, pagkatapos i-click ang Save sa row na iyon. Sign-in from/until ang nagkokontrol kung kailan maaaring gamitin ang dashboard. Geofencing — set/clear sa mapa. Evidence until — limitado sa export mula sa istasyon ng pagkolekta. Super admin ang install account.',
  },
};
