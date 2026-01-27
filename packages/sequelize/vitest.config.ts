import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Run tests sequentially, one at a time
    globals: true,
    coverage: {
      provider: "istanbul",
      reporter: ["text", "lcov", "html"],
      exclude: ["node_modules/", "test/", "dist/"],
    },
    maxConcurrency: 1,  // only one test at a time
    testTimeout: 60000, // 60 seconds per test
    typecheck: {
      tsconfig: "./tsconfig.vitest.json"
    },    
    poolOptions: {
      threads: {
        singleThread: true,
      },
      forks: {
        singleFork: true,
      },
    },    
  },
});
