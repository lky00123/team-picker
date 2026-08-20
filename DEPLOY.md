# 🏠 到家部署方案（team-picker）

> 目标：家里机器双击一次完成部署，手机/电脑随时访问，开机自启，外网可达。
> 全程预计 **20 分钟**（含软件下载时间）。

---

## 方案总览

```
家里 Windows 机器
├── team-picker/            ← 项目代码（从公司拷回/网盘/U盘）
│   ├── deploy.bat          ← 双击它：装依赖+构建+启动，一次到位
│   ├── restart.bat         ← 日常重启用
│   └── server/data.json    ← 名单/历史/胜负数据（备份就拷它）
│
├── 开机自启（计划任务，配置一次）
└── Tailscale（可选，手机在外网访问）

访问入口：
  家里电脑    http://localhost:8600
  家里手机    http://家里电脑IP:8600        （同一WiFi）
  外网手机    http://TailscaleIP:8600      （装Tailscale后任何地方）
```

---

## 第 0 步：把代码带回家（三选一）

| 方式 | 操作 |
|------|------|
| **网盘/U盘**（最简单） | 拷整个 `team-picker` 文件夹（含 node_modules 可省到家重装，约 200MB；不带则到家 deploy.bat 会自动装） |
| **微信传输** | 项目打了 zip 的话发自己微信 |
| **GitHub 私有仓库** | `git remote add origin <你的私有仓库>` → push；到家 `git clone` |

> ⚠️ 不需要拷 `dist/`（构建产物）和 `server/data.json`（公司测试数据），到家重新生成。

## 第 1 步：装基础软件（家里机器没有的话）

- **Node.js LTS**：https://nodejs.org → 下载 LTS → 一路下一步
- **Python 3.10+**：https://python.org → 安装时**勾选 Add to PATH**

验证：开 cmd 输 `node -v` 和 `python --version`，都有版本号即可。

## 第 2 步：一键部署

```
双击 deploy.bat
```

自动完成：npm install → 前端构建 → pip 装 fastapi/uvicorn → 启动服务。
看到 `DONE! Open http://localhost:8600` 即成功，浏览器打开验证。

## 第 3 步：家里手机访问

1. 手机 WiFi 设置里看电脑 IP：cmd 输 `ipconfig` → 找 IPv4（如 `192.168.1.100`）
2. 手机浏览器输入 `http://192.168.1.100:8600`
3. 手机浏览器菜单 →「添加到主屏幕」→ 以后桌面一点就开

> 家里路由器一般没有 AP 隔离，都能通。若通不了：手机开热点让电脑连，电脑 `ipconfig` 查热点网卡 IP（`192.168.43.x`），手机访问它。

## 第 4 步：开机自启（推荐，一次配置）

cmd 里跑两行（**路径按实际改**）：

```cmd
schtasks /create /tn "TeamPicker" /tr "cmd /c cd /d D:\team-picker\server && python -m uvicorn app:app --host 0.0.0.0 --port 8600" /sc onlogon /rl highest /f
```

或者图形化：Win+R → `taskschd.msc` → 创建任务 → 触发器"登录时" → 操作"启动程序" cmd，参数同上。
（项目里附了 `autostart.xml` 模板可参考，路径要改成实际安装位置。）

## 第 5 步：外网访问（Tailscale，推荐）

让手机在任何地方（公司/路上/4G）都能访问家里：

1. https://tailscale.com 注册（免费，可用 Google/GitHub 账号）
2. **家里电脑**：下载安装 Tailscale → 登录
3. **手机**：应用商店装 Tailscale（或官网下 APK）→ 登录**同一账号**
4. Tailscale 后台（https://login.tailscale.com/admin/machines）能看到家里机器的 Tailscale IP（形如 `100.x.x.x`）
5. 手机浏览器输入 `http://100.x.x.x:8600` → 收工

特点：免费额度 3 用户 100 设备够用、不暴露公网端口（P2P 加密直连）、家里宽带无需公网 IP。

## 第 6 步：数据备份（可选）

所有数据就一个文件：`server/data.json`（名单+历史+胜负+口令）。

- 想备份：定期拷走这个文件即可
- 换机器/重装：拷回同位置，数据全恢复

---

## 日常使用速查

| 场景 | 操作 |
|------|------|
| 服务没起来/改了后端 | 双击 `restart.bat` |
| 改了前端代码 | 项目目录 cmd 跑 `npm run build` → 浏览器强刷 |
| 换视频背景 | 替换 `public/bg.mp4` → `npm run build` |
| 端口想换 | `start.bat` 和计划任务里把 8600 改掉 |

## 常见问题

| 问题 | 处理 |
|------|------|
| 双击 start.bat 闪退 | cmd 里手动跑 `cd server && python -m uvicorn app:app --port 8600` 看报错 |
| 端口被占 | `netstat -ano | findstr :8600` 找 PID → 任务管理器结束，或换端口 |
| 手机打不开 | 电脑防火墙放行：设置→防火墙→允许应用→勾 Python（专用+公用网络都勾） |
| Tailscale 连不上 | 两端都重启 Tailscale；家里路由器 UPnP 关了的话登录后台开 |
