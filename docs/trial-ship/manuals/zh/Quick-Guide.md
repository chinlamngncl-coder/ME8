# Mobility Axiom — 快速指南

## 本机需要准备

| 项目 | 是否必须 | 说明 |
|------|----------|------|
| Windows 10/11（64 位） | 是 | 安装 Docker 需管理员权限 |
| **Node.js** | **否** | **已内置**于 `Mobility-Axiom\tools\node\` |
| **Docker Desktop** | 是（仅视频会议） | [下载](https://www.docker.com/products/docker-desktop/) |
| 外网 | 仅首次安装 | 拉取 Docker 镜像；**地图瓦片为离线** |

## 安装（一次）

1. **解压**完整 **CN Trial Mobility** 文件夹（如 `C:\CN-Trial\`）。
2. 安装并启动 **Docker Desktop** — 等待托盘鲸鱼图标稳定。
3. 在包根目录双击 **`Install-Mobility.bat`**。
4. 每次使用双击 **`Start Mobility.bat`**。

**请勿**运行 `npm install` — 依赖库已预装在包内。

## 首次登录
| 项目 | 值 |
|------|-----|
| 地址 | http://<服务器IP>:3888 |
| 用户名 | global |
| 密码 | global123 |

语言：登录页可选 **English** 或 **中文（简体）**。

## 地图
本包含 **离线地图瓦片**（北京区域），底图无需外网。

## 执法记录仪上线（概要）
1. **设置 → 服务器配置 → 网络** — 填写服务器 IPv4。
2. **设置 → 服务器配置 → BWC** — 添加设备 ID 与警员姓名。
3. 在 BWC SIP 界面填写 **Type on BWC** 中的值（仅 IPv4）。

## 视频会议
在 Android 安装 **MobilityConference-1.5.6.apk**。Docker 须保持运行。
