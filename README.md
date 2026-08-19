---
title: 反向许愿池
emoji: 🕳️
colorFrom: indigo
colorTo: pink
sdk: docker
pinned: false
---

# 反向许愿池

用户许下愿望，由三位经典角色（李云龙 / 佟湘玉 / 甄嬛）说出"愿望成真的代价"。

新版本采用 **Vite 前端 + Cloudflare Worker 代理**，完全免费、免服务器、可长期在线。

```
反向许愿池/
├── frontend/          # Vite 前端（HTML/CSS/JS）
├── worker/index.js    # Cloudflare Worker 代理（藏密钥、调 DeepSeek）
├── worker/wrangler.toml
└── app.py             # （旧）Flask 本地版本，可忽略
```

## 部署到 Cloudflare（免费）

### 1. 部署 Worker
1. 去 https://dash.cloudflare.com 注册登录（可用 GitHub/Google 账号）
2. 左侧 **Workers & Pages → 创建 → Worker → 快速编辑**
3. 把 `worker/index.js` 的内容**全部粘贴**进去，保存
4. 打开 Worker 的 **设置 → 变量和机密 → 添加**：
   - 名称：`DEEPSEEK_API_KEY`
   - 值：你的 DeepSeek API Key（机密）
5. 回到 Worker 页面，记下它给你分配的域名，形如 `https://<你的名字>.workers.dev`

### 2. 部署前端到 Pages
1. 左侧 **Workers & Pages → 创建 → Pages**
2. 选 **直接上传** 或 **Git 连接**（上传方式）：把 `frontend/dist` 目录内容拖进去
   - 或用 CLI：`npm run build` 后在 `frontend/dist` 执行 `npx wrangler pages deploy dist`
3. 部署完成后会得到 `https://<项目名>.pages.dev`

### 3. 接线
前端里请求的地址是编译期变量。部署后可二选一：
- **方式 A**：编辑 `frontend/vite.config.js` 的 `WORKER_URL` 为你的 Worker 域名 `https://xxx.workers.dev`，重新 build 上传
- **方式 B（推荐）**：在 Pages 项目里设环境变量，或用 Worker 作为 Pages 的代理路由（同一域名下 `/api/wish`）

## 本地开发

```bash
cd frontend
npm install
WORKER_URL=https://你的worker域名 npm run dev
```

## 说明

- 密钥 `DEEPSEEK_API_KEY` 只存 Cloudflare Workers 的机密变量，不进仓库、不暴露给浏览器
- 该方案无后端服务器，任何 Cloudflare 免费账号均可，无需绑卡

## 旧方案（可选）

仓库保留 `app.py`（Flask）+ `Dockerfile` + `render.yaml`，如需在 Render / Hugging Face 部署 Flask 版本仍可参考。
