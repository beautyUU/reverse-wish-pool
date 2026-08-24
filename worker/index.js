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

const RECORDS_KEY = "wish_records";
const DOWNLOAD_KEY = "download_count";

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
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Data-Key",
    "Access-Control-Max-Age": "86400",
  };
}

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(), ...extra },
  });
}

function csvEscape(v) {
  const s = String(v ?? "");
  return '"' + s.replace(/"/g, '""') + '"';
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    // ---- 数据下载 / 统计接口 ----
    if (request.method === "GET" && (url.pathname === "/api/data" || url.pathname === "/data")) {
      const provided = request.headers.get("X-Data-Key") || url.searchParams.get("key") || "";
      const dataKey = env.DATA_KEY || "";
      if (!dataKey || provided !== dataKey) {
        return json({ error: "无权限下载数据" }, 403);
      }

      const records = await env.KV.get(RECORDS_KEY, "json").catch(() => []);
      const list = Array.isArray(records) ? records : [];
      const dlCount = (parseInt(await env.KV.get(DOWNLOAD_KEY)) || 0);

      if (url.searchParams.get("format") === "csv") {
        const header = [
          "时间", "愿望", "李云龙", "佟湘玉", "甄嬛", "tokens_used",
        ];
        const lines = list.map((r) =>
          [
            csvEscape(r.time),
            csvEscape(r.wish),
            csvEscape(r.liyunlong),
            csvEscape(r.tongxiangyu),
            csvEscape(r.zhenhuan),
            csvEscape(r.tokens),
          ].join(",")
        );
        const csv = "\uFEFF" + header.join(",") + "\n" + lines.join("\n");

        // 递增下载次数
        await env.KV.put(DOWNLOAD_KEY, String(dlCount + 1)).catch(() => {});

        return new Response(csv, {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": 'attachment; filename="wishes.csv"',
            ...corsHeaders(),
          },
        });
      }

      return json({ count: list.length, downloadCount: dlCount, records: list });
    }

    // ---- 新增愿望 ----
    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const key = env.DEEPSEEK_API_KEY || "";
    if (!key) {
      return json({ error: "服务器未配置 DEEPSEEK_API_KEY" }, 500);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "请求体无效" }, 400);
    }

    const wish = String(body.wish || "").trim();
    if (!wish) return json({ error: "愿望不能为空" }, 400);
    if (wish.length > 50) return json({ error: "愿望不能超过50字" }, 400);

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
      return json({ error: `调用 DeepSeek 失败: ${e.message}` }, 502);
    }

    if (!resp.ok) {
      const t = await resp.text();
      return json({ error: `DeepSeek 错误(${resp.status}): ${t.slice(0, 300)}` }, 502);
    }

    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content || "";
    const totalTokens = data?.usage?.total_tokens || 0;

    let replies = parseReplies(content);
    const allPresent = ROLE_PREFIXES.every((p) => replies[p]);
    if (!allPresent) {
      replies = fallback();
    }

    // ---- 保存到 KV ----
    try {
      const prev = await env.KV.get(RECORDS_KEY, "json").catch(() => []);
      const list = Array.isArray(prev) ? prev : [];
      list.push({
        time: new Date().toISOString(),
        wish,
        liyunlong: replies[ROLE_PREFIXES[0]] || "",
        tongxiangyu: replies[ROLE_PREFIXES[1]] || "",
        zhenhuan: replies[ROLE_PREFIXES[2]] || "",
        tokens: totalTokens,
      });
      // KV 单 key 值上限 25MB，超量时裁剪最旧的
      while (list.length > 10000) list.shift();
      await env.KV.put(RECORDS_KEY, JSON.stringify(list));
    } catch (e) {
      // 保存失败不影响正常回复
    }

    return json({
      replies: [
        { role: "liyunlong", icon: "\u{1F52B}", name: "\u674E\u4E91\u9F99", text: replies[ROLE_PREFIXES[0]] },
        { role: "tongxiangyu", icon: "\u{1F4B0}", name: "\u4F5F\u6E58\u7389", text: replies[ROLE_PREFIXES[1]] },
        { role: "zhenhuan", icon: "\u{1F451}", name: "\u7504\u5B1B", text: replies[ROLE_PREFIXES[2]] },
      ],
      tokens: totalTokens,
    });
  },
};
