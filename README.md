# ⚔️ 海克斯大乱斗 · 分队器

朋友开黑 4v4/5v5 随机分队小工具。纯前端分组 + FastAPI 单文件存数据，自部署。

## 功能

- **三种模式**：纯随机 / 实力均衡(蛇形+暴力优化) / 轮换拆散(上局同队优先拆，蒙特卡洛)
- **点名必拆**：指定两人永不同队(硬约束)
- **规模**：2v2 ~ 5v5；奇数自动 5v4 说明；超员自动进替补席
- **实力分**：每人 1-10 分，均衡模式保证两队总分差 ≤1
- **种子可验证**：每局展示种子号，同名单+种子 100% 复现(防"房主黑箱")
- **中途加减人**：+1 进较弱队 / -1 自动借人补位 / 替补上场
- **手动微调**：结果页 ⇄ 换边(标记"已手动调整")
- **历史记录**：最近 50 局，轮换模式的依据

## 开发

```bash
npm install
npm test              # 19 个单测(分组逻辑全覆盖)
npm run dev           # 前端开发服务器
```

## 部署(到家机器)

```bash
# 1. 构建
npm install && npm run build        # 产出 dist/

# 2. 后端依赖
pip install fastapi uvicorn

# 3. 启动(双击 start.bat 或)
cd server && python -m uvicorn app:app --host 0.0.0.0 --port 8600
```

访问 `http://机器IP:8600`。数据存 `server/data.json`，备份就拷这个文件。

### 外网访问(手机在外面上用)

家是内网宽带的话装 **Tailscale**(免费)：家里机器和手机都装、登同一账号，手机任何地方访问 `http://tailscale机器IP:8600`。也可配开机自启(任务计划程序 → start.bat)。

### 口令(可选)

页面底部 ⚙️ 设置口令后，别人改名单需要口令(防止链接外泄被乱改)。

## 结构

```
src/core/       分组核心(纯逻辑, 可单测)
  ├ random.ts   种子随机(mulberry32) — 可复现
  ├ assign.ts   人数边界(奇数/替补/加减人/重名)
  ├ modes.ts    三模式实现
  └ index.ts    generateTeams 主入口
src/            Vue3 前端(App.vue + ResultBoard + HistoryList)
server/app.py   FastAPI 单文件(GET/PUT data.json + 静态托管)
tests/          vitest 19 用例
```
