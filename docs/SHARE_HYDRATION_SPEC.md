# SHARE_HYDRATION_SPEC — 分享链接协议与还原（P11）

## 1. v1 遗留问题

| # | 问题 | 根因 |
|---|------|------|
| 1 | binary-search 分享恢复成 `variant:'linear'` | decode 硬编码，URL 无 variant 字段 |
| 2 | `s=<step>` 解析后被丢弃，不跳转、不 clamp | AlgorithmPage hydration 未消费 |
| 3 | `m=b`（Beginner）写入 URL 但解析丢弃 | DecodeResult 无 mode |
| 4 | 合法大图（12 节点 24 边）payload > 2000 被拒 | `strOf(g, 2000)` 与算法合法上限脱节 |
| 5 | 无版本号 | 协议演进无法兼容 |
| 6 | graph decode 无 schema 校验 | 直接 `as AlgorithmInput` |

## 2. Share 协议 v2

### 2.1 URL 形态

```
#/<category>/<algoId>?v=2&d=<base64url(payload)>
```

payload（UTF-8 JSON，紧凑字段）：

```ts
interface SharePayloadV2 {
  v: 2;
  algo: string;            // algorithmId，冗余校验用（须与路由一致）
  in: CompactInput;        // 紧凑输入
  s?: number;              // 初始步（0 基）
  m?: { b?: true };        // mode.beginner
}
```

`CompactInput` 按类型：
- `sort`: `{t:'sort', a:number[]}`
- `search`: `{t:'search', v:'linear'|'binary', a:number[], g:target}`
- `linear`: `{t:'linear', st, i, op}`（op 沿用 v1 文本格式）
- `linkedlist` / `bst` / `recursion` / `nqueens` / `dp`：同 v1 字段
- `graph`: `{t:'graph', al, n:[id,x,y][], e:[id,from,to,dir?1:0,w][], st, en}` —— 数组化紧凑编码，12 节点 24 边最大约 1.1KB base64

### 2.2 编码规则

- `d` = base64url(UTF-8 JSON)，上限 16KB（防御；真实规模由 entry.validate 限制）。
- `s` 仅在 >0 时写入；`m.b` 仅在开启时写入。
- **禁止**携带 Notes / Progress / Quiz / Predict / Challenge / 任何私人学习数据。

### 2.3 解码规则（版本分派）

```
parseShareQuery(type, search):
  if 参数含 v=2 且 d 非空 → 解码 v2 payload：
      - base64url/JSON 任何异常 → null
      - payload.algo 与路由条目不一致 → null
      - CompactInput → AlgorithmInput（逐字段严格校验：数量/范围/字符集）
  else → v1 兼容路径（现有 query params 逐类型解析）：
      - search：读可选 v=linear|binary 参数，缺省 binary-search 条目默认 binary，其余 linear（修复硬编码）
      - graph：strOf 上限 2000 → 16384（真实规模仍由 entry.validate 把关）
  之后统一：
      - entry.validate(input) 不通过 → null
      - step = intOf(s, 0, 1e5)；>0 保留
      - beginner = (v1: m==='b') | (v2: m.b===true)
```

`DecodeResult` 增加 `beginnerMode: boolean`（默认 false）。

### 2.4 Hydration 行为（AlgorithmPage）

挂载时（一次性，ref 防重入）：

1. 无 query → 默认输入，无提示。
2. 解码失败 / validate 失败 → 默认输入 + 提示「分享链接中的数据无效，已使用默认输入」。
3. 解码成功：
   - `setInput(input)`、`setSteps(collectSteps(entry.run(input)))`；
   - `setInputEpoch(+1)` → 编辑器重挂，shadow state 同步（见 STATE_CONSISTENCY_SPEC §2.3）；
   - **step 恢复**：记录 pendingSeek=step；新 steps 就绪后 `engine.seek(clamp(step, 0, steps.length-1))`；若发生 clamp（step ≥ steps.length）显示提示「已跳到第 N 步（分享中的步数超出范围）」；
   - **Beginner 恢复（方案 A：仅本次浏览生效）**：`beginnerOverride=true` 使本页 Beginner 详解开启，并在教学区显示「新手详解已由分享链接开启（仅本次浏览生效）」；**不写入** store 全局设置、不持久化。用户点击全局 Beginner 开关的行为不变（override 仅在挂载时由 share 设置一次；用户随后切换全局开关时，override 让位于用户显式选择——override 在用户手动切换后清除）。

### 2.5 测试要求

- 单元：每输入类型 random valid input → encode → decode → `deepEqual` 原输入（重点：search binary variant、graph 最大合法规模、bst、linkedlist、dp knapsack、recursion）。
- v1 链接回归：v1 格式 URL（含旧 binary-search 链接、graph 链接）仍可解。
- E2E：binary search 分享 → 新页打开仍是 binary 且 variant 正确；s=N 恢复（含超界 clamp）；m=b 开启 Beginner 且刷新本站其他页后全局设置未被污染；最大合法图 roundtrip。
