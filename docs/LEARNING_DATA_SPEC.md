# LEARNING_DATA_SPEC.md — 学习数据模型、存储与迁移

所有学习数据的单一事实来源（Single Source of Truth）是内存中的 `LearningStore`，持久化到 `localStorage`。无账号、无后端、不上传任何数据。

## 1. 存储位置与键名

| 键 | 内容 | 引入版本 |
| --- | --- | --- |
| `algoplayground-theme` | 主题（v1.0 已有，保持不动） | v1.0 |
| `algoplayground-learning` | 学习数据根对象（本 spec） | v1.1.0 |

禁止调用 `localStorage.clear()`（会清除同域其他应用数据）；Reset 只移除自己的键。

## 2. 根 schema（storageVersion = 1）

```ts
/** localStorage 根对象；storageVersion 供未来迁移 */
interface LearningStorageRoot {
  storageVersion: 1;
  profile: LearningProfile;
}

interface LearningProfile {
  /** algorithmId → 学习进度 */
  progress: Record<string, AlgorithmProgress>;
  /** 收藏（算法或概念课） */
  bookmarks: BookmarkEntry[];
  /** algorithmId → 学习笔记 */
  notes: Record<string, NoteEntry>;
  /** 图编辑器保存的预设 */
  savedGraphs: SavedGraph[];
  /** 全局学习设置 */
  settings: LearningSettings;
  /** 有学习活动的日期（本地时区 YYYY-MM-DD，升序去重） */
  activityDays: string[];
}

interface LearningSettings {
  /** Beginner Mode 全局开关 */
  beginnerMode: boolean;
  /** 首次使用引导已完成 */
  welcomeDone: boolean;
}

interface AlgorithmProgress {
  animationWatched: boolean;      // 曾播放到最后一播步
  viewCount: number;              // 进入算法页次数
  lastViewedAt: string | null;    // ISO 8601
  quiz: Record<string, QuizRecord>;       // questionId → 记录
  predict: PredictSummary;                // 聚合 + 明细（设上限）
  challenge: Record<string, ChallengeRecord>; // challengeId → 记录
}

interface QuizRecord {
  attemptCount: number;
  correctCount: number;
  lastCorrect: boolean;
  lastAnsweredAt: string;         // ISO 8601
}

interface PredictSummary {
  total: number;
  correct: number;
  /** 最近明细，上限 50 条（FIFO 裁剪），供展示 */
  recent: PredictAttempt[];
}

interface PredictAttempt {
  at: string;                     // ISO 8601
  stepIndex: number;
  stepType: string;               // deriveStepKind 结果
  correct: boolean;
}

interface ChallengeRecord {
  completed: boolean;
  bestMistakes: number;           // 最少错误次数
  attempts: number;
  lastCompletedAt: string | null;
}

interface BookmarkEntry { targetId: string; addedAt: string; }  // targetId = algorithmId 或 conceptId

interface NoteEntry { content: string; updatedAt: string; }

interface SavedGraph {
  id: string;
  name: string;
  graph: GraphModel;              // 复用 registry 的图模型
  createdAt: string;
}
```

规模保护（防止 localStorage 无限增长）：
- `predict.recent` 上限 50 条，超出裁剪最旧；聚合计数不裁剪。
- `savedGraphs` 上限 20 个。
- 单条 note ≤ 5000 字符，超出写入时截断。
- 其余字段天然有界（progress 键数 = 算法数）。

## 3. 时间约定

一律 ISO 8601 字符串（`new Date().toISOString()`）；活动日期用本地时区 `YYYY-MM-DD`（用于学习天数统计）。禁止混用时间戳数字或 Date 对象入库。

## 4. LearningStore（单一事实来源）

`src/core/storage/store.ts`，纯 TS 可订阅单例（与 PlaybackEngine 同风格，React 侧经 `useSyncExternalStore` 绑定）：

```ts
class LearningStore {
  getProfile(): LearningProfile;
  subscribe(cb): () => void;
  // 领域方法（全部经此修改，禁止组件直写 localStorage）：
  recordAlgorithmView(algorithmId): void;
  markAnimationWatched(algorithmId): void;
  recordQuizAnswer(algorithmId, questionId, correct): void;
  recordPredictAttempt(algorithmId, attempt): void;
  recordChallengeResult(algorithmId, challengeId, completed, mistakes): void;
  toggleBookmark(targetId): void;
  isBookmarked(targetId): boolean;
  saveNote(algorithmId, content): void;
  saveGraphPreset(name, graph): void;      // 返回 id 或错误
  deleteGraphPreset(id): void;
  setBeginnerMode(on): void;
  markWelcomeDone(): void;
  replaceProfile(p: LearningProfile): void;   // Import
  resetLearningData(): void;                  // 仅清学习数据
  flush(): void;                              // 立即持久化（beforeunload 调用）
}
```

写入策略：内存立即更新并通知；持久化防抖 300ms；`flush()` 在 `beforeunload`/页面隐藏时触发。localStorage 不可用（隐私模式等）时静默降级为内存模式。

## 5. 加载与迁移

`src/core/storage/migrate.ts`：`loadLearningProfile(storage: StorageLike): { profile, notice }`。

规则（按顺序）：
1. 键不存在 / 空串 → 全新默认 profile（`notice: 'fresh'`）。
2. JSON 解析失败（损坏）→ 默认 profile + `notice: 'corrupted'`（UI 提示一次；**不立即覆盖写**，下次成功保存时自然替换）。
3. `storageVersion` 缺失或非数字 → 视为损坏。
4. `storageVersion === 1` → 逐字段防御性校验（`validateProfile`）：字段类型错误/缺项一律修复为默认值（不整体拒绝，尽量保留可用数据）。
5. `storageVersion > 1`（未来版本）→ **拒绝加载且不写入**：使用内存默认 profile，`notice: 'newer-version'`，避免旧代码破坏新数据。

迁移框架预留：`MIGRATIONS: Record<number, (raw) => raw>`（键 = 起始版本），未来 v1→v2 时在 v2 处注册转换函数并提升 `storageVersion` 常量；测试用 v1 样本验证迁移通路。

## 6. Share URL 格式

基于现有 HashRouter，参数放在路由 path 之后的 query：

```
#/{category}/{algoId}?q=<payload>&s=<stepIndex>&m=b
```

- `q`：算法输入编码，按输入类型分派（encodeInput/decodeInput）：
  - sort: `a=5,3,2,1`
  - search: `a=1,3,5,7,9&t=7`（variant 由算法 id 决定）
  - linear: `st=stack&i=a,b,c&op=push:x`
  - linkedlist: `i=a,b,c&op=insert:2:x`
  - bst: `tree=5,3,8&op=search:7`
  - graph: `g=<base64url(JSON GraphInput)>`（规模大，用编码）
  - recursion / dp: `k=fibonacci&n=10`；`k=knapsack&it=A:2:3,B:1:5&cap=5`
  - nqueens: `n=6`
- `s`：可选，初始 step 下标（0 ≤ s < 步数，越界忽略）。
- `m=b`：可选，分享时附带 Beginner 开启。

校验（decode 阶段，全部强制）：
- 数组长度/元素范围/结构规模**复用现有 entry.validate 与既有规模上限**（数组≤60、图≤12/24、BST≤31…）。
- 任何解析/校验失败 → 回退该算法 `defaultInput`，顶部显示一次性友好提示「分享链接中的数据无效，已使用默认输入」。
- 分享 URL 不包含 Notes / Progress / 学习历史 / 隐私数据（仅算法公开状态）。

## 7. Import / Export

- Export：`replaceProfile` 的反向——导出 `{ storageVersion, profile }` JSON 文件，文件名 `algoplayground-learning-<YYYYMMDD>.json`。
- Import：读取文本 → `JSON.parse`（try/catch）→ `storageVersion === 1` 且 `validateProfile` 通过 → 弹确认（将覆盖现有数据）→ `replaceProfile`。坏文件/未来版本：拒绝并提示，不修改现有数据。
- 绝不执行 JSON 中的任何代码（无 eval/Function，仅数据读取）。

## 8. Graph Presets 校验

保存时校验（复用图编辑器现有规则）：节点 2–12、边 1–24、权重 1–99、不允许自环、不允许重复边（无向图 (a,b) 与 (b,a) 视为重复）。非法拒绝并提示。
