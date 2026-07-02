# Mobility Axiom — 配置手册

**适用：** IT、超级管理员、安装人员。  
**配合阅读：** **快速指南** · **用户手册**

分步说明服务器设置、BWC 注册、操作员、存储、防火墙及视频会议。

---

## 目录

1. [开始之前](#1-开始之前)
2. [打开 Server Config](#2-打开-server-config)
3. [Network & deployment](#3-network--deployment)
4. [注册 BWC](#4-注册-bwc)
5. [Map groups](#5-map-groups)
6. [Dashboard Auth](#6-dashboard-auth)
7. [证据存储路径](#7-证据存储路径)
8. [Video Conference](#8-video-conference)
9. [Centre Summary AI](#9-centre-summary-ai)
10. [防火墙与端口](#10-防火墙与端口)
11. [试用许可证](#11-试用许可证)
12. [密码与审计](#12-密码与审计)
13. [验收检查表](#13-验收检查表)

---

## 1. 开始之前

| 项目 | 要求 |
|------|------|
| 服务器 PC | Windows 10/11 64 位，建议固定 LAN IP |
| 交付包 | 解压后运行一次 `Install-Mobility.bat` |
| Docker Desktop | 已安装并运行（仅视频会议） |
| BWC | 已开机、可访问 SIP 界面 |
| 网络 | 同 LAN；摄像机键盘仅 **IPv4** |

无需单独安装 Node — 包内含 `Mobility-Axiom\tools\node\`。

---

## 2. 打开 Server Config

1. 超级管理员登录（试用：`global`）。
2. **Settings** → **Server Config**。
3. 左侧：**Network & deployment** | **BWCs** | **Map groups** | **Dashboard Auth**。

操作员账户为 **只读**。

---

## 3. Network & deployment

### 3.1 Deployment

选择 **LAN server** → **Save server settings**。

### 3.2 LAN network（重要）

1. **BWC SIP server IP** = 本机 **IPv4**（如 `192.168.1.10`）— 勿用主机名。
2. 记下 HTTP 端口 `3888` 与视频 WS `3889`。
3. **Save server settings**。

### 3.3 BWC camera register

设置 Platform ID、Realm、Password → 将 **Type on BWC** 抄到每台摄像机 SIP 界面。

---

## 4. 注册 BWC

**标签：** **BWCs**

1. **Add row** → **Device ID**（与摄像机一致）→ **Officer** → **Map group**（可选）。
2. **Save BWC list**。

**摄像机 SIP 界面：**

| 字段 | 填写 |
|------|------|
| SIP 服务器 | 服务器 IPv4 |
| 端口 | 5060 |
| Platform ID / Realm / Password | 与 Server Config 一致 |
| Device ID | 与 BWC 列表行一致 |

约 30 秒后在 **Operations** 显示 **Online**。

试用包 `FM_SEED_BWC_ID=` 为空 — 无演示设备。

---

## 5. Map groups

创建组名与颜色 → 在 BWCs 标签分配 → 用于图钉颜色、视频墙、PTT。

---

## 6. Dashboard Auth

**Operator：** 允许 Operations/Evidence/Command Wall/VC — 禁止编辑 Server Config → 行内 **Save**。

**Super admin：** 添加行 → **Save**。

---

## 7. 证据存储路径

FTP 文件夹、现场录制、证据索引 → **Save storage** → **Scan FTP for evidence**。

NAS 须先在 Windows 挂载。

可选：**Auto-record server video on SOS alarm**。

---

## 8. Video Conference

1. Docker Desktop。
2. `Install-Mobility.bat` — 启动 LiveKit。
3. **Video Conference → Settings** — 手机 WebSocket（如 `ws://192.168.1.10:7880`）。

分发 `MobilityConference-1.5.6.apk`。

---

## 9. Centre Summary AI

模型位于 `Mobility-Axiom\vendor\llm\`（约 2 GB），现场无需下载。首次 **Ask** 加载 1–2 分钟。

---

## 10. 防火墙与端口

| 端口 | 服务 |
|------|------|
| 3888 | 控制台 HTTP |
| 3889 | 实时视频 WebSocket |
| 5060 | SIP |
| 7880 | LiveKit |
| 40130+ UDP | RTP |

---

## 11. 试用许可证

5 台 BWC · 10 个控制台用户 · 1 年（以许可证文件为准）。

---

## 12. 密码与审计

**Dashboard Auth** → 新密码 → **Save**。**Audit Trail** → 筛选 → **Export CSV**。

---

## 13. 验收检查表

| 步骤 | 通过 |
|------|------|
| Install-Mobility.bat 无错误 | ☐ |
| Docker 运行中 | ☐ |
| `http://localhost:3888` 可打开 | ☐ |
| LAN IP = 本机 IPv4 | ☐ |
| BWC 已保存 | ☐ |
| 摄像机 SIP 一致 | ☐ |
| 60 秒内 Online | ☐ |
| 图钉有实时视频 | ☐ |
| PTT 有声音 | ☐ |
| FTP 扫描 OK | ☐ |
| VC Join Room OK | ☐ |
| 操作员只读测试 | ☐ |

失败请参阅用户手册 §18 与 `VIEW-LOG.bat`。

---

## 离线地图（CN 包）

瓦片路径 `data/gis/offline/tiles/` 请勿删除。扩展区域请联系供应商。
