import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  build: {
    outDir: "dist",
  },
  define: {
    // 部署后请换成你的 Cloudflare Worker 地址，例如 https://reverse-wish-pool.xxx.workers.dev
    __WORKER_URL__: JSON.stringify(process.env.WORKER_URL || "/api/wish"),
  },
});
