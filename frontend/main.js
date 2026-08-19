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

async function run() {
  const wish = wishInput.value.trim();
  if (!wish) return showError("先许个愿再扔下去~");
  if (wish.length > 50) return showError("愿望不能超过50字哦");

  result.classList.add("hidden");
  errorEl.classList.add("hidden");
  loading.classList.remove("hidden");
  submitBtn.disabled = true;

  try {
    const res = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wish }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "请求失败");

    renderReplies(data.replies, data.tokens);
  } catch (e) {
    showError(e.message);
  } finally {
    loading.classList.add("hidden");
    submitBtn.disabled = false;
  }
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
