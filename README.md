# 反向许愿池

用户许下愿望，由三位经典角色（李云龙 / 佟湘玉 / 甄嬛）说出"愿望成真的代价"。

## 运行

```bash
pip install -r requirements.txt
export DEEPSEEK_API_KEY=你的Key
python app.py
```

打开 http://localhost:5000

## 说明

- 每次提交会调用 DeepSeek API 生成三句回复
- 结果追加写入同目录 `logs.csv`（含时间戳、愿望、三句回复、Token 数）
