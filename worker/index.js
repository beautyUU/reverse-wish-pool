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

const ROLE_PREFIXES = ["\u{1F52B} \u674E\u4E91\u9F99", "\u{1F4B0} \u4F5F\u6E58\u7389", "\u{1F451} \u7504\u5B1B"];

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
    "\u{1F52B} \u674E\u4E91\u9F99": "他娘的，说成真得拿命去换，老子可不想看你送死。",
    "\u{1F4B0} \u4F5F\u6E58\u7389": "额滴神啊，这笔账算下来，划不划算你心里没数？",
    "\u{1F451} \u7504\u5B1B": "姐姐倒显得性急，罢了，代价你未必担得起。",
  };
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders() },
      });
    }

    const key = env.DEEPSEEK_API_KEY || "";
    if (!key) {
      return new Response(
        JSON.stringify({ error: "服务器未配置 DEEPSEEK_API_KEY" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders() } }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "请求体无效" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders() },
      });
    }

    const wish = String(body.wish || "").trim();
    if (!wish) {
      return new Response(JSON.stringify({ error: "愿望不能为空" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders() },
      });
    }
    if (wish.length > 50) {
      return new Response(JSON.stringify({ error: "愿望不能超过50字" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders() },
      });
    }

    const payload = {
      model: "deepseek-chat",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: wish },
      ],
      temperature: 0.8,
    };

    let resp;
    try {
      resp = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: `调用 DeepSeek 失败: ${e.message}` }), {
        status: 502,
        headers: { "Content-Type": "application/json", ...corsHeaders() },
      });
    }

    if (!resp.ok) {
      const t = await resp.text();
      return new Response(JSON.stringify({ error: `DeepSeek 错误(${resp.status}): ${t.slice(0, 300)}` }), {
        status: 502,
        headers: { "Content-Type": "application/json", ...corsHeaders() },
      });
    }

    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content || "";
    const totalTokens = data?.usage?.total_tokens || 0;

    let replies = parseReplies(content);
    const allPresent = ROLE_PREFIXES.every((p) => replies[p]);
    if (!allPresent) {
      replies = fallback();
    }

    return new Response(
      JSON.stringify({
        replies: [
          { role: "liyunlong", icon: "\u{1F52B}", name: "\u674E\u4E91\u9F99", text: replies[ROLE_PREFIXES[0]] },
          { role: "tongxiangyu", icon: "\u{1F4B0}", name: "\u4F5F\u6E58\u7389", text: replies[ROLE_PREFIXES[1]] },
          { role: "zhenhuan", icon: "\u{1F451}", name: "\u7504\u5B1B", text: replies[ROLE_PREFIXES[2]] },
        ],
        tokens: totalTokens,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders() },
      }
    );
  },
};
