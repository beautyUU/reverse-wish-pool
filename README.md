---
title: 反向许愿池
emoji: 🕳️
colorFrom: indigo
colorTo: pink
pinned: false
---

# 反向许愿池

用户许下愿望，由三位经典角色（李云龙 / 佟湘玉 / 甄嬛）说出"愿望成真的代价"。

🕳️ **在线访问**：[https://beautyuu.github.io/reverse-wish-pool/](https://beautyuu.github.io/reverse-wish-pool/)

## 架构

**Vite 前端 + Cloudflare Worker 代理**，完全免费、免服务器、可长期在线。

```
反向许愿池/
├── frontend/          # Vite 前端（HTML/CSS/JS），支持演示模式
├── worker/index.js    # Cloudflare Worker 代理（藏密钥、调 DeepSeek、存数据）
├── worker/wrangler.toml
└── app.py             # （旧）Flask 本地版本，可忽略
```

前端**演示模式**：当后端未部署或不可用时，会自动用本地生成的三角色回复演示，保证页面随时可点可用。接上后端后自动切换为真实 DeepSeek 回复。

## 部署前端到 GitHub Pages

1. 前往仓库 **Settings → Pages**
2. **Build and deployment → Source** 选择 **GitHub Actions**
3. 稍等片刻，Actions 运行完成后访问上方在线链接即可
4. 之后每次 `push` 到 `main` 分支都会自动重新构建发布

## 部署后端接入真实回复（Cloudflare Worker）

当前页面能点能用，但默认走本地演示回复。要让它调用 **DeepSeek** 生成真实回复：

### 1. 部署 Worker
```bash
cd worker
npx wrangler login                  # 登录 Cloudflare
npx wrangler kv namespace create WISHES   # 创建 KV，把输出 ID 填进 wrangler.toml
echo "你的DeepSeekKey" | npx wrangler secret put DEEPSEEK_API_KEY
echo "一个随机的下载接口密钥" | npx wrangler secret put DATA_KEY
npx wrangler deploy
```

### 2. 前端指向 Worker
编辑 `frontend/vite.config.js`，把 `WORKER_URL` 改成你的 Worker 域名（如 `https://xxx.workers.dev`），重新构建并推送，页面即开始使用真实回复。

## 数据与下载

Worker 将每次愿望、三角色回复、Token 数存入 Cloudflare KV。访问以下接口（需带 `DATA_KEY`）：

- JSON 数据：`GET <worker域名>/api/data`，请求头带 `X-Data-Key: 你的DATA_KEY`
- CSV 导出：`GET <worker域名>/api/data?format=csv`，同样带 `X-Data-Key`，可下载 `wishes.csv`
- JSON 数据同时返回 `count`（总条数）和 `downloadCount`（下载次数）

> CSV 导出每次会累加 `downloadCount`，用于统计下载次数。

## 本地开发

```bash
cd frontend
npm install
WORKER_URL=https://你的worker域名 npm run dev
```

## 说明

- 密钥 `DEEPSEEK_API_KEY`、`DATA_KEY` 只存 Cloudflare 机密变量，不进仓库、不暴露给浏览器
- 该方案无后端服务器，任何 Cloudflare 免费账号均可，无需绑卡

## 旧方案（可选）

仓库保留 `app.py`（Flask）+ `Dockerfile` + `render.yaml`，如需在 Render / Hugging Face 部署 Flask 版本仍可参考。
