import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    environmentOptions: { jsdom: { url: "https://lab.legendstudy.com" } },
    include: ["src/**/*.test.{ts,tsx}", "cloudflare/**/*.test.ts"],
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
  },
});
