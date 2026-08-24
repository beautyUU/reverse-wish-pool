const wishInput = document.getElementById("wish");
const count = document.getElementById("count");
const submitBtn = document.getElementById("submit");
const loading = document.getElementById("loading");
const result = document.getElementById("result");
const errorEl = document.getElementById("error");

// 部署后改 vite.config.js 里的 WORKER_URL 并重新构建
const WORKER_URL = __WORKER_URL__;

wishInput.addEventListener("input", () => {
  count.textContent = wishInput.value.length;
});

function demoKw(wish) {
  // 从愿望里取关键片段（最长 6 字），用于生成各不相同但贴合输入的演示回复
  const w = wish.replace(/我喜欢|我希望|我想|我要|请让我|求求|拜托|想|要|能/g, " ").trim();
  const kw = (w.split(/\s+/).pop() || w).slice(0, 6);
  return kw || wish.slice(0, 6);
}

function demoReplies(wish) {
  const kw = demoKw(wish);
  const liyunlong = `他娘的，就冲你这句"${kw}"，老子都要笑了，代价你扛得住？`;
  const tongxiangyu = `额滴神啊，"${kw}"？这笔买卖划不划算，你仔细算算。`;
  const zhenhuan = `姐姐的"${kw}"，怕是要拿旁的东西去换，罢了。`;
  return [
    { role: "liyunlong", icon: "🔫", name: "李云龙", text: liyunlong },
    { role: "tongxiangyu", icon: "💰", name: "佟湘玉", text: tongxiangyu },
    { role: "zhenhuan", icon: "👑", name: "甄嬛", text: zhenhuan },
  ];
}

async function run() {
  const wish = wishInput.value.trim();
  if (!wish) return showError("先许个愿再扔下去~");
  if (wish.length > 50) return showError("愿望不能超过50字哦");

  result.classList.add("hidden");
  errorEl.classList.add("hidden");
  loading.classList.remove("hidden");
  submitBtn.disabled = true;

  let replies = null;
  let tokens = 0;

  try {
    const res = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wish }),
    });
    const data = await res.json();
    if (res.ok && data.replies && data.replies.length === 3) {
      replies = data.replies;
      tokens = data.tokens || 0;
    } else {
      throw new Error("后端未返回有效回复");
    }
  } catch (e) {
    // 后端不可用时，本地生成演示回复，保证页面始终可点可用
    replies = demoReplies(wish);
  } finally {
    loading.classList.add("hidden");
    submitBtn.disabled = false;
  }

  renderReplies(replies, tokens);
}

function renderReplies(replies, tokens) {
  result.innerHTML = "";
  replies.forEach((r, i) => {
    const card = document.createElement("div");
    card.className = "card";
    card.style.setProperty("animation-delay", `${i * 0.1}s`);
    card.innerHTML = `
      <div class="head"><span>${r.icon}</span><strong>${r.name}</strong></div>
      <p>${escapeHtml(r.text)}</p>
    `;
    result.appendChild(card);
  });
  const tokenEl = document.createElement("div");
  tokenEl.className = "tokens";
  tokenEl.textContent = `本次消耗 ${tokens} tokens`;
  result.appendChild(tokenEl);
  result.classList.remove("hidden");
  result.scrollIntoView({ behavior: "smooth", block: "start" });
}

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.classList.remove("hidden");
}

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

submitBtn.addEventListener("click", run);
wishInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    run();
  }
});
