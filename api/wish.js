const SYSTEM_PROMPT = `你是「反向许愿池」。用户会输入一个TA特别想要的愿望。你不会帮TA实现愿望，而是用三位经典角色的口吻，分别说出一句"如果愿望成真，代价是什么"。不是劝退，是让用户笑着清醒。


🔫 李云龙 · 亮剑
- 气质：糙汉硬核，不绕弯子。说话像拍桌子，句句在理。
- 风格：用打仗、行军、兄弟作比。语气冲，但内核是"为你好"。
- 口头禅方向：他娘的、你小子、老子
- 禁令：禁止长篇大论。禁止掉书袋。


💰 佟湘玉 · 同福客栈
- 气质：抠门老板娘，算盘打得精。
- 风格：用算账、银子、客栈作比。碎碎念但精准。
- 口头禅方向：额滴神啊、四不四撒、划不划算
- 禁令：禁止煽情。必须落在"划不划算"上。


👑 甄嬛 · 深宫
- 气质：深宫清醒者，见过太多起落。
- 风格：用月色、炉火、茶凉作比。话软刀快。
- 口头禅方向：姐姐、倒显得、罢了
- 禁令：禁止堆砌"本宫""皇上""臣妾"。禁止煽情。


输出格式（严格执行，总字数不超过150字）：
🔫 李云龙：（一句话，不超过25字）
💰 佟湘玉：（一句话，不超过25字）
👑 甄嬛：（一句话，不超过25字）


全局禁令：
1. 禁止输出"我认为""或许"等评价词。
2. 禁止重复用户输入中的原词。
3. 禁止超过字数。
4. 只看用户最新一条消息。
`;

const ROLE_PREFIXES = ["🔫 李云龙", "💰 佟湘玉", "👑 甄嬛"];

function parseReplies(content) {
  const results = {};
  for (const line of String(content).split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    for (const prefix of ROLE_PREFIXES) {
      if (trimmed.startsWith(prefix)) {
        let reply = trimmed.slice(prefix.length).trimStart();
        reply = reply.replace(/^[:：]\s*/, "").trim();
        results[prefix] = reply;
        break;
      }
    }
  }
  return results;
}

function fallback() {
  return {
    "🔫 李云龙": "他娘的，说成真得拿命去换，老子可不想看你送死。",
    "💰 佟湘玉": "额滴神啊，这笔账算下来，划不划算你心里没数？",
    "👑 甄嬛": "姐姐倒显得性急，罢了，代价你未必担得起。",
  };
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const key = process.env.DEEPSEEK_API_KEY || "";
  if (!key) {
    return res.status(500).json({ error: "服务器未配置 DEEPSEEK_API_KEY" });
  }

  const { wish } = req.body || {};
  const text = String(wish || "").trim();
  if (!text) return res.status(400).json({ error: "愿望不能为空" });
  if (text.length > 50) return res.status(400).json({ error: "愿望不能超过50字" });

  let resp;
  try {
    resp = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text },
        ],
        temperature: 0.8,
      }),
    });
  } catch (e) {
    return res.status(502).json({ error: `调用 DeepSeek 失败: ${e.message}` });
  }

  if (!resp.ok) {
    const t = await resp.text();
    return res.status(502).json({ error: `DeepSeek 错误(${resp.status}): ${t.slice(0, 300)}` });
  }

  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content || "";
  const totalTokens = data?.usage?.total_tokens || 0;

  let replies = parseReplies(content);
  if (!ROLE_PREFIXES.every((p) => replies[p])) {
    replies = fallback();
  }

  res.status(200).json({
    replies: [
      { role: "liyunlong", icon: "🔫", name: "李云龙", text: replies["🔫 李云龙"] },
      { role: "tongxiangyu", icon: "💰", name: "佟湘玉", text: replies["💰 佟湘玉"] },
      { role: "zhenhuan", icon: "👑", name: "甄嬛", text: replies["👑 甄嬛"] },
    ],
    tokens: totalTokens,
  });
}
