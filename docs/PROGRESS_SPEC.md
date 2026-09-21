# PROGRESS_SPEC.md — 掌握度与进度

## 1. 掌握度（Mastery）

**不是 AI，是可解释的确定性规则**（`src/core/progress/mastery.ts` 纯函数）。每个算法计算 0–100 分：

| 信号 | 条件 | 得分 |
| --- | --- | --- |
| 看完动画 | `animationWatched` | +25 |
| Quiz | answered ≥ 3 | + round(正确率 × 25) |
| Quiz | answered 1–2 | + answered × 5 |
| Predict | attempts ≥ 5 | + round(正确率 × 25) |
| Predict | attempts 1–4 | + attempts × 4 |
| Challenge | 完成任一挑战 | +20 |
| 复习 | viewCount ≥ 3 | +5 |

总分上限 100（各项天然封顶：25+25+25+20+5 = 100）。

等级映射：

| 分数 | 等级 | 显示 |
| --- | --- | --- |
| 无任何记录 | not-started | 未开始（灰） |
| 1–44 | learning | 学习中（蓝） |
| 45–64 | practicing | 练习中（青） |
| 65–84 | almost | 接近掌握（黄） |
| 85–100 | mastered | 已掌握（绿） |

「有任何记录」= viewCount ≥ 1 或 quiz/predict/challenge 任一非空或 animationWatched。**有记录但分数低于 45 也归为 learning**（例如仅浏览过：score=0，level=learning）。

标准组合示例（用于测试锚定）：
- 只看动画：25 → learning。
- 看动画 + Quiz 5 题全对：25+25=50 → practicing。
- 再加 Predict 10 题对 8：50+20=70 → almost。
- 再加完成任一 Challenge：70+20=90 → mastered（≥85）。
- 若复习充分（viewCount ≥ 3）：再 +5。逐行锚定表见 §4。

## 2. 章节完成度

章节小节完成 = 对应算法 `viewCount ≥ 1`（去过即算「已学」）或概念课被访问（概念课记录为特殊 algorithmId `concept:<id>` 的 viewCount）。章节完成度 = 已完成小节 / 总小节。概念课访问记入 `progress['concept:<conceptId>'].viewCount`，不参与掌握度评分（掌握度仅对真实算法显示）。

## 3. Progress 页（/progress）

- 顶部统计卡：学习天数（`activityDays.length`）、总练习次数（quiz attempts + predict total + challenge attempts）、已学算法数（viewCount ≥ 1）、已掌握数（level === mastered）。
- 分类掌握：按 CATEGORIES 聚合每个分类的平均分/掌握数（简单条形，不做复杂图表）。
- 算法明细表：算法 / 等级 / Quiz 正确率 / Predict 正确率 / Challenge / 最近学习（相对日期）。
- 最近学习：按 lastViewedAt 倒序前 5。
- Bookmarks 区：收藏列表（可取消、可跳转）。
- 数据管理区：Export / Import / Reset（见 LEARNING_DATA_SPEC §7）。
- 渲染性能：聚合经 useMemo 派生；明细表不展示全量 attempt 历史，只展示聚合值。

## 4. 掌握度锚定表（测试金标准）

| 场景 | 分数 | 等级 |
| --- | --- | --- |
| 零记录 | 0 | not-started |
| 仅 viewCount=1 | 0（有记录） | learning |
| 仅看完动画 | 25 | learning |
| 动画 + Quiz 3 题对 2（25+17*） | 42 | learning |
| 动画 + Quiz 5 全对 | 50 | practicing |
| 动画 + Quiz 5 全对 + Predict 5 对 4 | 70 | almost |
| 动画 + Quiz 5 全对 + Predict 10 对 8 + Challenge | 90 | mastered |
| 动画 + Quiz 全对 + Predict 全对 + Challenge + viewCount ≥ 3 | 100 | mastered |

*round(2/3×25)=17。规则实现与锚定表逐行对齐单测。

## 5. 记录时机

- `recordAlgorithmView`：算法页挂载时（同一页面会话内重复挂载不重复计数——用 ref 防抖，仅路由变化时计数）。
- `markAnimationWatched`：播放到达最后一步（finished）时置 true。
- `activityDays`：任何一次领域方法调用时按本地日期并入（去重）。
- 时间一律 ISO 8601；`activityDays` 用本地 YYYY-MM-DD。
