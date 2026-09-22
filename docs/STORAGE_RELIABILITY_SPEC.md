# STORAGE_RELIABILITY_SPEC — 学习数据可靠性（P11）

## 1. 范围

localStorage 方案保留（无后端、无账号）。强化四个维度：Schema Integrity、Persistence Health、Cross-tab Consistency、Import Safety。

## 2. Schema v2 与迁移

`STORAGE_VERSION: 1 → 2`。v2 根对象：

```ts
interface LearningStorageRoot {
  storageVersion: 2;
  revision: number;        // 每次成功写入 +1；跨标签页合并依据
  profile: LearningProfile; // 字段与 v1 相同
}
```

- 迁移：`MIGRATIONS[1] = (raw) => ({ storageVersion: 2, revision: 0, profile: raw.profile })`；v1 数据自动升级（profile 字段经 lenient 修复）。
- v1 导出文件（`{storageVersion:1, profile}`）仍可导入（Import 路径走迁移）。
- 迁移测试：v1 根 → migrateRoot → v2 根且 profile 保真。

## 3. Persistence Health

```ts
export type PersistenceStatus = 'persistent' | 'memory-only' | 'write-failed' | 'quota-exceeded' | 'unavailable';
```

- `LearningStore` 增加 `getPersistenceStatus()` + 并入现有订阅（状态变化时 emit）。
- 语义：
  - `persistent`：storage 可用且最近一次 flush 成功；
  - `memory-only`：构造时 storage 不可用（隐私模式等）；
  - `write-failed`：flush 抛出（非配额）；
  - `quota-exceeded`：flush 抛 QuotaExceededError（含 `e.name === 'QuotaExceededError'` 或 code 22/1014 判定）；
  - `unavailable`：flush 中发现 storage 抛访问异常（被禁用）。
- **flush 不再静默**：失败记录状态并 emit；下一次成功写回恢复 `persistent`。
- UI：NoteEditor / ProgressPage（DataCard）显示状态——
  - memory-only：「浏览器存储不可用，本次学习记录仅保存在内存中。」
  - write-failed/quota-exceeded：「保存失败：上次写入未持久化（可清理浏览器存储后重试）。」
- NoteEditor 的「已保存 ✓」仅在 `persistent` 时显示；否则显示对应失败文案（区分内存保存与持久化成功）。

## 4. 跨字段 invariant（加载修复 + Import 拒绝）

| 数据 | invariant |
|------|-----------|
| QuizRecord | `0 ≤ correctCount ≤ attemptCount`，`attemptCount ≥ 0` |
| PredictSummary | `0 ≤ correct ≤ total` |
| ChallengeRecord | `attempts ≥ 0`，`bestMistakes ≥ 0`，`completed === false → lastCompletedAt === null` |
| activityDays | 每项是**真实存在的日期**（YYYY-MM-DD 且 `new Date(y,m-1,d)` round-trip 一致），去重、升序 |
| savedGraphs | 严格图校验（§6） |

两条路径：
- **lenient local recovery**（`validateProfile`，localStorage 加载）：违反 invariant 的字段修复（clamp correctCount≤attemptCount、丢非法日期、去重、completed=false 时清 lastCompletedAt），尽量保数据。
- **strict import validation**（新 `strictValidateProfile(raw)`，用户导入文件）：返回 `{ok:false, error}` 明确失败——用户导坏文件应当知道，而不是静默吞字段。DataCard 使用 strict；错误消息指出第一个不可修复的字段路径。

## 5. 跨标签页一致性（核心：域合并，拒绝整包覆盖丢数据）

### 5.1 传输抽象（可测）

```ts
export interface SyncTransport {
  subscribe(cb: (key: string, value: string | null) => void): () => void;
}
```

生产实现 `WindowStorageTransport`：监听 `window` 的 `storage` 事件（同源其他 tab 写入本 key 时触发；本 tab 自身写入不触发）。测试用 fake transport。

### 5.2 合并协议

- 本地每次成功 flush：`revision++` 后写入。
- 收到远端写入通知（key=LEARNING_STORAGE_KEY）：
  - 解析远端根；解析失败 → 忽略（远端坏了不传染）；
  - `远端.revision ≤ 本地.revision` → 忽略（旧回声）；
  - 否则执行**域级合并**，合并结果 `revision = max(本地,远端)+1`，本地采纳并 flush：
    - `progress`：按 algorithmId 并集；域内 quiz 按 questionId 取「信息量更大」者（attemptCount 更大；相等取 correctCount 更大；再相等取本地）；predict：total/correct 取大、recent 按 `at` 合并去重截尾 50；challenge：attempts 取大、completed 取或、bestMistakes 取小、lastCompletedAt 取非空且较新；animationWatched 取或；viewCount 取大；lastViewedAt 取新。
    - `notes`：按 algorithmId 取 updatedAt 较新者。
    - `bookmarks`：按 targetId 并集，冲突取 addedAt 新。
    - `savedGraphs`：按 id 并集，冲突取 createdAt 新，截尾 20。
    - `settings`：本地 dirty 则保留本地，否则取远端。
    - `activityDays`：并集去重升序。
- 合并期间 UI 快照更新（emit），React 订阅者自动重渲染。

### 5.3 保证

Tab A 只答 Quiz、Tab B 只写 Note、两 tab 都曾各自 flush 的最坏时序下：merge 后 Quiz 记录与 Note 内容**都**保留。单测用两个 Store 实例 + 同一内存 storage + fake transport 驱动双向通知验证。

## 6. SavedGraph 严格校验

`strictValidateGraphModel(raw): { ok, graph } | { ok:false, error }`（同时用于 strict import 与 share graph decode 的前置校验，规则与 `validateGraphInput` 对齐）：

- nodes：数组、1–12 个；每项 id 非空字符串 ≤16 字符且唯一；x/y 有限数且 ∈ [0,1]。
- edges：0–24 条；id 非空且唯一；from/to 必须引用存在的节点；weight 整数 ∈ [1,99]；directed 为 boolean。
- 无自环；无重复边（有向按 `from>to`，无向按排序对）。

lenient 加载路径：不合法的 savedGraph 条目**丢弃**（保其余）。

## 7. Import 安全

- `MAX_IMPORT_BYTES = 1_048_576`（1MB）。DataCard 在读取前检查 `file.size`，超限直接拒绝并提示。
- Import 走 `strictValidateProfile`；版本非 2 时先 migrateRoot（v1 文件迁移后校验）。
- Import 只经 `replaceProfile`（整体替换 + revision 重置为远端文件的 revision+1）；JSON 仅当数据处理，不执行任何代码。

## 8. 测试清单

1. v1→v2 迁移（含损坏/未来版本回归）。
2. flush 失败 → status 变化 → 恢复。
3. invariant 修复（lenient）与拒绝（strict）各一组，含 `2026-99-99`、`2026-02-31`、correct>total、completed=false+时间戳。
4. 日期去重升序、合法闰日 `2024-02-29` 通过。
5. 双 Store 跨标签页：A 答题 B 记笔记 → 双向同步后两域均保留。
6. 同域竞争：双方改同一 quiz 条目取信息量大者，不出现 attempt 丢失。
7. strict graph 校验全部拒绝分支 + 1MB 限制。
