# CHANGELOG.md

本文件记录 AlgoPlayground 的每个 Phase 交付。格式参考 Keep a Changelog；版本号语义：0.x 为开发期，1.0.0 为首个稳定版。

## [Unreleased]

### P0 — 基础设施与文档 ✅
- 新增 docs/ 文档体系：PRODUCT / REQUIREMENTS / ARCHITECTURE / ALGORITHM_SPEC / VISUALIZATION_SPEC / STATE_SPEC / TEST_PLAN / ROADMAP / CHANGELOG。
- 新增项目脚手架：Vite + React 18 + TypeScript(strict) + ESLint + Vitest(jsdom)。
- 新增 core 层：Frame/VizStep 类型体系、PlaybackEngine（headless 可测）、注册表骨架、输入校验工具。
- 新增 GitHub Actions 工作流（lint/typecheck/test/build 门禁）。

（后续 Phase 在完成时追加于此）
