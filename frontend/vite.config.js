import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  base: "/reverse-wish-pool/",
  build: {
    outDir: "dist",
  },
  define: {
    // Vercel 上函数与页面同源，直接用相对路径即可
    __WORKER_URL__: JSON.stringify(process.env.WORKER_URL || "/api/wish"),
  },
});
