/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/test/setup.ts'],
    css: false,
    // 仅收集 src 下的单测（e2e/ 中的 Playwright 用例由 test:e2e 单独执行）
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      // 重点统计 core 层（算法/播放器/类型/校验/注册表）；UI 组件测试为辅
      include: ['src/core/**'],
      exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
      reporter: ['text', 'html'],
      // 阈值依据 v1.0.1 真实结果（98.99/92.10/99.29/98.99）设定，留少量回归余量
      thresholds: {
        statements: 98,
        branches: 90,
        functions: 98,
        lines: 98,
      },
    },
  },
});
