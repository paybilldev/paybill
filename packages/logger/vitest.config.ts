import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    coverage: {
      provider: "istanbul", // <--- use 'istanbul' or 'v8'
      reporter: ["text", "lcov", "html"],
      exclude: ["node_modules/", "test/", "dist/"],
    },
    maxConcurrency: 1,       // only one test at a time
    testTimeout: 60000,      // 10 seconds per test
    poolOptions: {
      forks: {
        execArgv: ["--expose-gc"],
      },
    },
  },
});
