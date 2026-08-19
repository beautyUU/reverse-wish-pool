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

## 本地运行

```bash
pip install -r requirements.txt
export DEEPSEEK_API_KEY=你的Key
python app.py
```

打开 http://localhost:7860

## 说明

- 每次提交会调用 DeepSeek API 生成三句回复
- 结果追加写入同目录 `logs.csv`（含时间戳、愿望、三句回复、Token 数）

## 部署到 Render

1. 注册并登录 https://render.com（可用 GitHub 账号一键登录）
2. 点击 **New → Web Service**，选择 GitHub 仓库 `beautyUU/reverse-wish-pool`
3. 配置：
   - **Environment**：`Python`
   - **Build Command**：`pip install -r requirements.txt`
   - **Start Command**：`gunicorn app:app --workers 1 --threads 4 --timeout 60 --bind 0.0.0.0:$PORT`
4. 在 **Environment** 页面添加环境变量：
   - 名称：`DEEPSEEK_API_KEY`
   - 值：你的 DeepSeek API Key
5. 点击 **Create Web Service**，等待构建完成即可访问

## 代码部署 Cloudflare / Hugging Face

本仓库也随附：
- `Dockerfile`：可用于 Hugging Face Spaces（SDK 选 Docker）或任意 Docker 平台
- `render.yaml`：Render Blueprint（Dashboards 里 "+ New → Blueprint" 可直接导入）

> 密钥不会写进仓库，只通过环境变量注入。
