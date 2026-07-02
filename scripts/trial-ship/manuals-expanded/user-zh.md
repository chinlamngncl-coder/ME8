# Mobility Axiom — 用户手册（操作员指南）

**适用：** 调度员、主管、证据人员、中控室操作员。  
**相关文档：** **快速指南**（安装）· **配置手册**（服务器/BWC）· **README.txt**

本指南说明控制台 **每个标签页**、**主要按钮** 及 **分步操作流程**。界面文字与所选语言一致。

---

## 目录

1. [系统功能](#1-系统功能)
2. [登录、语言、退出](#2-登录语言退出)
3. [顶栏](#3-顶栏)
4. [Operations 标签布局](#4-operations-标签布局)
5. [Device Summary（设备表）](#5-device-summary设备表)
6. [SOS](#6-sos)
7. [PTT 组与消息](#7-ptt-组与消息)
8. [地图](#8-地图)
9. [电子围栏](#9-电子围栏)
10. [视频墙（6 画面）](#10-视频墙6-画面)
11. [Evidence & Docking](#11-evidence--docking)
12. [Command Wall](#12-command-wall)
13. [Centre Summary](#13-centre-summary)
14. [Video Conference](#14-video-conference)
15. [Settings 与 Audit Trail](#15-settings-与-audit-trail)
16. [用户角色](#16-用户角色)
17. [工作流程示例](#17-工作流程示例)
18. [故障排除](#18-故障排除)

---

## 1. 系统功能

| 功能 | 界面位置 | 可执行操作 |
|------|----------|------------|
| 实时 GPS 地图 | Operations → 地图 | 查看警员位置、SOS、录制状态 |
| BWC 实时视频 | 图钉面板、视频墙、Command Wall | 多路视频（Operations 默认 6 路） |
| 语音/PTT | 设备表、图钉、PTT 组 | 一对一或组对讲 |
| SOS | 顶栏横幅、SOS 日志、地图 | 告警、报告、导出文件夹 |
| 文本下发 BWC | Operations → Messages | 向在线设备发文字 |
| 证据库 | Evidence 标签 | 检索采集站上传、服务器录像、案件卷宗 |
| 视频会议 | Video Conference | 手机、PC、BWC 实时共享 |
| 管理 | Settings → Server Config | 网络、BWC 列表、操作员 |

---

## 2. 登录、语言、退出

### 2.1 首次登录

1. 打开浏览器（建议 Chrome 或 Edge）。
2. 访问 `http://<服务器IP>:3888`（本机试用：`http://localhost:3888`）。
3. 输入 **用户名**、**密码**（试用默认：`global` / `global123`）。
4. 点击 **Sign in**。

### 2.2 切换语言

登录页或顶栏 **Language** 下拉 — 中国区试用：**English**、**中文（简体）**；APAC 含更多语言。

### 2.3 修改密码（超级管理员）

**Settings** → **Server Config** → **Dashboard Auth** → 修改密码 → 该行 **Save**。

### 2.4 退出登录

**Settings** → **Sign out**。共用电脑务必退出。

---

## 3. 顶栏

| 控件 | 作用 |
|------|------|
| 🔊 Voice mute | SOS/语音告警静音 |
| Repeat | 重复上一条语音告警 |
| Language | 切换界面语言 |
| SOS 横幅 | SOS 激活时红色提示条 |

---

## 4. Operations 标签布局

| 区域 | 内容 |
|------|------|
| 左侧栏 | Device Summary、SOS 日志、PTT 组、Messages、Storage |
| 中央 | 地图 + 工具栏 |
| 右侧 | 6 路实时视频墙 |

点击 **◀** 折叠/展开侧栏。Operations 时顶栏有 **Auto-rotate**、**Popout Matrix**、**Config**。

---

## 5. Device Summary（设备表）

| 列 | 操作 |
|----|------|
| Pin | 切换地图图钉 + 浮动视频面板 |
| PTT | **按住** 对该 BWC 一对一语音 |
| Call | 语音呼叫 |
| GPS | 轨迹/路线 |
| Status | Online / Offline |

**Open All (Up to 6)** · **Clear map pins**。流程：确认 **Online** → **Pin** → **PTT**。

---

## 6. SOS

红色顶栏横幅 → 设置 **radius**（200–1000 m）查看地图附近单位 → **Acknowledge**（附近在线单位**默认勾选**）或 **PTT team** → 等待 **PTT team ON** 提示 → 在告警警员墙画面或图钉上**长按 PTT** 向**全队**通话 → **SOS 日志** 点击行 → **Open incident files** · **Download CSV**。敏感报告需 PIN **Unlock**。

---

## 7. PTT 组与消息

选地图组或勾选 2 台以上在线设备 → **Join group PTT** → **Ungroup all**。Messages：点姓名 → **Send**。

---

## 8. 地图

拖拽平移、滚轮缩放。图钉面板：实时视频、**PTT**。工具栏：**Wall Map**、**Snapshot**、SD/服务器录制、围栏。

---

## 9. 电子围栏

输入半径（米）→ **Set geofencing** → 地图上放置 → **Save geofence**。**Clear geofencing** 清除。

---

## 10. 视频墙（6 画面）

**Auto-rotate**、**Popout Matrix**、**Config**（每路指定 BWC/组/CSV）、单路 **Stop**。

---

## 11. Evidence & Docking

子标签：Overview · Docking Stations · Evidence Library · Case Files · Route & GPS · Storage

Library：**Refresh**、搜索、**Detail** 预览、**Download**。Case：**New case file**、**Create from SOS**。Storage（管理员）：**Save storage**、**Scan FTP**。

---

## 12. Command Wall

从 Roster **拖拽** 到面板 → 布局 1/4/9/16/32 → **Rotate** → **Spotlight** → **Clear wall**。Display room：多显示器预设。

---

## 13. Centre Summary

KPI、SOS 图表、存储、系统健康、**AI 助手** → **Ask**。**Refresh** 刷新。

---

## 14. Video Conference

需 Docker。**Join Room**。布局 Gallery/Speaker 等。**Share screen**。BWC **Add to Room**。APK：MobilityConference-1.5.6.apk。

---

## 15. Settings 与 Audit Trail

**Server Config**、生命周期卡片、**Audit Trail**（日期筛选 → **Apply** → **Export CSV**）、**Sign out**。

---

## 16. 用户角色

超级管理员可编辑 Server Config；操作员只读；自定义权限在 Dashboard Auth。

---

## 17. 工作流程示例

开班：Start Mobility.bat → Operations 查在线数。处警：Pin+PTT。SOS：横幅→日志→PTT→Evidence 建案。电视墙：Command Wall 16 画面 Rotate。

---

## 18. 故障排除

| 现象 | 处理 |
|------|------|
| 全部 Offline | 配置手册 — 网络与 Type on BWC |
| 无视频 | 防火墙 3889；Pin |
| PTT 无声 | 按住不放 |
| VC 失败 | 启动 Docker；Install-Mobility.bat |
| 地图灰白 | CN 包为离线瓦片；APAC 需外网底图 |

---

## 文档索引

| 需求 | 阅读 |
|------|------|
| 安装 | **快速指南** |
| 服务器/BWC | **配置手册** |
| 日常操作 | **本手册** |
