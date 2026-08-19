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

## 部署到 Hugging Face Spaces

1. 注册并登录 https://huggingface.co
2. 新建 Space → 选择 SDK 为 **Docker**，点 **Import from GitHub** 填入本仓库 `beautyUU/reverse-wish-pool`
3. 部署完成后，进入 Space 的 **Settings → Variables and secrets**，添加 secret：
   - 名称：`DEEPSEEK_API_KEY`
   - 值：你的 DeepSeek API Key
4. 保存后重启 Space 即可

> 密钥不会写进仓库，只通过环境变量注入。
