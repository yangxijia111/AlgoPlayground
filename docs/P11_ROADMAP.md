# P11 Roadmap — Deep Architecture & Correctness Hardening

> 基线 v1.1.0 → 目标 v1.1.1。原则：不重写框架、不加功能数量；只做正确性与一致性强化。
> 详细问题清单见 `P11_ARCHITECTURE_AUDIT.md`；各领域设计见对应 SPEC。

## 阶段计划

| 阶段 | 内容 | 关键交付 | 验收 |
|------|------|----------|------|
| P11-0 | 审计与文档 | 6 份 SPEC + ROADMAP 更新 | 本文档 |
| P11-1 | 编辑器状态一致性 | `core/editors/structureState.ts` pure reducer；LinearInputEditor stack pop 修复；BST delete 先序表示；AlgorithmPage inputEpoch 重挂机制 | 状态契约单测（含 Stack [A,B,C] pop→[A,B] 反例、BST 双子删除反例） |
| P11-2 | Semantic Step Protocol | `StepSemantic` 判别联合 + `semanticOf` 工具；VizStep.semantic 可选字段 | 类型 exhaustive switch 编译通过 |
| P11-3 | 算法迁移 A–F | 排序→搜索→线性→树→图→递归/回溯/DP 全部 Generator 产出 semantic | 每类迁移后 lint/typecheck/test/build 全绿 |
| P11-4 | 学习系统 semantic-first | Beginner（修 swap 泛化/BST 平衡误述/relax 猜测）、Predict、Challenge 全部优先 semantic | 教学正确性测试（§6 of CROSS_LAYER_TEST_SPEC） |
| P11-5 | Share v2 + hydration | 协议 v2、v1 兼容、variant/step/beginner 恢复、graph 紧凑编码与上限修复 | roundtrip property + 4 项 share E2E |
| P11-6 | Storage 可靠性 | schema v2+revision+migration、PersistenceStatus、跨标签页域合并、strict import、1MB 限制、严格图校验 | STORAGE_RELIABILITY_SPEC §8 测试清单 |
| P11-7 | 测试体系 | fast-check 属性测试、跨层契约、metamorphic、semantic coverage、8 项 E2E | 全部通过且原 587+66 不回归 |
| P11-8 | 全量审计与门禁 | 15 项审计清单复核；npm ci→e2e 全绿 | CI/E2E/Security/Pages 全绿 |
| P11-9 | 发布 | 1.1.1、CHANGELOG、README、P11_FINAL_REPORT、tag、Release | tag 创建后不移动 |

## 提交策略

```
docs: P11 architecture audit and specifications
fix: repair linear editor state consistency (stack pop, bst preorder, remount)
refactor: add semantic step protocol
refactor: migrate learning systems to semantic steps
fix: harden share hydration and versioned state (v2)
fix: harden learning data validation and persistence (v2)
test: add cross-layer and property-based contracts
chore: release v1.1.1
```

## 禁止事项（全程有效）

force push；改 tag；降 strict；删测试；skip 大批量；`any` 滥用；关 lint；AI API/后端/账号。

## 完成标准

见任务书第五十六节，全部满足后才 tag v1.1.1。
