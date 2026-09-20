# CHANGELOG.md

本文件记录 AlgoPlayground 的每个 Phase 交付。格式参考 Keep a Changelog；版本号语义：0.x 为开发期，1.0.0 为首个稳定版。

## [Unreleased]

### P0 — 基础设施与文档 ✅
- 新增 docs/ 文档体系：PRODUCT / REQUIREMENTS / ARCHITECTURE / ALGORITHM_SPEC / VISUALIZATION_SPEC / STATE_SPEC / TEST_PLAN / ROADMAP / CHANGELOG。
- 新增项目脚手架：Vite + React 18 + TypeScript(strict) + ESLint + Vitest(jsdom)。
- 新增 core 层：Frame/VizStep 类型体系、PlaybackEngine（headless 可测）、注册表骨架、输入校验工具。
- 新增 GitHub Actions 工作流（lint/typecheck/test/build 门禁）。

（后续 Phase 在完成时追加于此）

### P1 — 排序模块 ✅
- 新增 6 种排序算法 Generator：冒泡（早停）、选择、插入、归并（辅助副本写回）、快速（Lomuto）、堆排序；全部纯逻辑、零 UI 依赖。
- 新增带种子数据生成器：随机 / 几乎有序 / 逆序 / 大量重复值。
- 新增 UI：三栏布局（左导航 / 中可视化+编辑器+播放器 / 右教学面板）；数组柱状图渲染器（比较/交换/已排序/pivot/区间/指针）；伪代码当前行高亮；中文步骤解说；比较/交换/写入计数与步数显示。
- 新增统一播放器：播放/暂停/上一步/下一步/重播/0.25x–4x 速度/时间轴拖动/键盘快捷键（空格、←/→、R）。
- 排序输入编辑器：模式生成 + 大小调节（4–60）+ 自定义数组（校验：整数、-99–999、≤60 个）。
- 测试：排序正确性（6 算法 × 11 输入集）、已知计数金标准、步骤完整性、播放器引擎、组件交互、输入校验、数据生成器，共 159 项。

