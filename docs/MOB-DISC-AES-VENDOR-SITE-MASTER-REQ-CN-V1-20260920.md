# MOB DISC — AES 站点主密钥 · 厂家需求（中文）— 2026-09-20

**APPLY:** `AES-VENDOR-SITE-MASTER-REQ-CN-V1`  
**Status:** paper lock — 发给厂家的需求稿；本 MOB **不改产品代码**  
**Depends on:** Type A Play PASS（现网固定主密钥可播）  
**Not this MOB:** 在客户 zip 里放生成器；把 AES 主密钥写进公开说明书

---

## 1. 背景（给厂家）

当前 Type A 文件 AES（`AES加密格式说明.md`）使用 **产品线固定主密钥**（UTF-8 字符串再 pad 到 16 字节）。  
Axiom 侧已能按该主密钥解锁 `*-AES.*` 并播放。

客户侧希望升级为 **Option B：一站点一主密钥**（每卖一套 / 每个客户站点不同），由平台生成站点主密钥，**摄像机加密上传的文件必须使用同一站点主密钥**，平台用同一密钥解锁。

---

## 2. 需求目标（必须实现）

| 编号 | 需求 | 说明 |
|------|------|------|
| R1 | **站点主密钥可配置进 BWC** | 支持将 16 字节有效主密钥（与现格式 pad16(utf8) 规则兼容，或厂家给出明确字节规则）写入摄像机，使后续开启 AES 后生成的 `*-AES.*` 文件使用 **该站点密钥**，不再仅使用出厂固定密钥。 |
| R2 | **配置通道** | 至少提供一种可现场实施的方式，例如：平台 SIP/配置报文、坞站/USB 工具、或厂家提供的配置工具。需书面说明步骤与报文/接口。 |
| R3 | **确认与回读** | 配置成功后，设备侧有明确成功/失败反馈；可选回读“已配置站点 AES（不回显明文密钥）”。 |
| R4 | **兼容** | 未配置站点密钥时，行为与现网固定主密钥一致（或厂家标明默认策略）。 |
| R5 | **文档** | 提供中文接口说明：密钥长度、编码、写入命令、错误码；**不得**要求客户在资源管理器中手改密钥文件。 |

---

## 3. 不在本需求内（平台侧，供对齐）

- 站点主密钥的 **生成与保管**：由 **Ubitron 内部发证/发钥台** 完成（与 license 签发同级桌面工具），**不得**放入客户安装包。  
- 客户机 Axiom：仅 **超级管理员** 在「证据 → 存储 → AES File Unlock」粘贴一次 → Ready。  
- 普通操作员：只登录、只 Play，不接触主密钥。

---

## 4. 现场 SOP（厂家实现 R1–R5 之后）

1. Ubitron 为该站点生成站点 AES 解锁码（内部工具）。  
2. 写入 **密封安装单**（不进客户公开 zip）。  
3. 安装：Install / Start → 超级管理员粘贴到 Axiom → Ready。  
4. **同时** 按厂家文档把 **同一** 主密钥配置进该站点全部 BWC。  
5. 抽测：AES 开 → FTP `*-AES` → Evidence Play。

---

## 5. 请厂家书面回复

1. 是否支持站点主密钥写入？计划版本 / 时间。  
2. 推荐配置通道（SIP / 坞站 / 专用工具）。  
3. 密钥字节规则是否与现 `pad16(utf8)` 一致；若否，给出精确规则。  
4. 样机联调计划。

---

## 6. Generator 放哪里（Ubitron 内部锁定 — 与厂家无关但必须写清）

**行业做法（license 同类）：** 生成器在 **厂家/发行商侧**（Producer portal / 内部签发台），**从不**放进客户安装包。

| 位置 | 做不做 |
|------|--------|
| 客户 ship zip / Install 包 | **禁止** — 无人该在客户机上“生成主密钥” |
| Ubitron **license 签发台 / ME8-INTERNAL ship-desk**（与签 `.lic` 同级） | **是** — 每单生成站点 AES 解锁码 + 打印安装单 |
| 客户机 Axiom | **只粘贴**（已有 Super Admin UI），不生成 |

后续代码 MOB（厂家确认后再做）：`AES-SITE-MASTER-GENERATOR-LICENSE-DESK-V1`（内部工具，非客户包）。

---

## English one-liner (for agent)

Vendor must accept a **per-site file AES master** into the BWC; Ubitron generates that master only on the **internal license desk**, never in the customer pack; install engineer pastes into Axiom Storage after setup and provisions cameras per vendor doc.
