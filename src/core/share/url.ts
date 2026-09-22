/**
 * Share URL 编解码（SHARE_HYDRATION_SPEC，P11 协议 v2）：
 * - v2：`v=2&d=<base64url(JSON)>` 单 payload，含 algorithmId/input/step/mode，
 *   graph 用数组化紧凑编码（合法上限 12 节点 24 边 ≈ 1.1KB base64）。
 * - v1 兼容：旧 query params 链接继续可解（search variant 缺省取条目默认、
 *   graph 上限放宽到 16KB 防御值）；真实规模一律再经 entry.validate 把关。
 * - 只分享算法公开状态（输入数据），绝不含 Notes/Progress/学习记录。
 * - 任何异常返回 null（调用方回退默认输入并提示），绝不抛出、绝不崩溃。
 */
import type { AlgorithmInput, GraphAlgorithm, LinearOperation, RecursionKind } from '../registry';

// ---------------------------------------------------------------------------
// base64url 工具
// ---------------------------------------------------------------------------

function toBase64Url(s: string): string {
  return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): string | null {
  try {
    let t = s.replace(/-/g, '+').replace(/_/g, '/');
    while (t.length % 4 !== 0) t += '=';
    return decodeURIComponent(escape(atob(t)));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// v1 编解码（兼容路径；修 search variant 与 graph 上限）
// ---------------------------------------------------------------------------

function joinNums(arr: number[]): string {
  return arr.join(',');
}

/** v1：按输入类型编码为 query 参数串（不带 ?）。保留用于兼容测试与降级 */
export function encodeInput(input: AlgorithmInput): string {
  const p = new URLSearchParams();
  switch (input.type) {
    case 'sort':
      p.set('a', joinNums(input.array));
      break;
    case 'search':
      p.set('a', joinNums(input.array));
      p.set('t', String(input.target));
      break;
    case 'linear':
      p.set('st', input.structure);
      p.set('i', input.initial.join(','));
      switch (input.operation.op) {
        case 'push':
          p.set('op', `push:${input.operation.value}`);
          break;
        case 'enqueue':
          p.set('op', `enqueue:${input.operation.value}`);
          break;
        default:
          p.set('op', input.operation.op);
      }
      break;
    case 'linkedlist':
      p.set('i', input.initial.join(','));
      switch (input.operation.op) {
        case 'insert':
          p.set('op', `insert:${input.operation.position}:${input.operation.value}`);
          break;
        case 'delete':
          p.set('op', `delete:${input.operation.position}`);
          break;
        case 'search':
          p.set('op', `search:${input.operation.value}`);
          break;
        default:
          p.set('op', input.operation.op);
      }
      break;
    case 'bst':
      p.set('tree', joinNums(input.startTree));
      switch (input.operation.op) {
        case 'insert':
          p.set('op', `insert:${input.operation.value}`);
          break;
        case 'search':
          p.set('op', `search:${input.operation.value}`);
          break;
        case 'delete':
          p.set('op', `delete:${input.operation.value}`);
          break;
        case 'traverse':
          p.set('op', `traverse:${input.operation.order}`);
          break;
        case 'build':
          p.set('op', `build:${joinNums(input.operation.values)}`);
          break;
      }
      break;
    case 'graph':
      p.set('g', toBase64Url(JSON.stringify(input)));
      break;
    case 'recursion':
      p.set('k', input.kind);
      p.set('n', String(input.n));
      break;
    case 'nqueens':
      p.set('n', String(input.n));
      break;
    case 'dp':
      if (input.kind === 'fibonacci') {
        p.set('k', 'fibonacci');
        p.set('n', String(input.n));
      } else {
        p.set('k', 'knapsack');
        p.set('it', input.items.map((it) => `${it.name}:${it.weight}:${it.value}`).join(','));
        p.set('cap', String(input.capacity));
      }
      break;
  }
  return p.toString();
}

function parseNums(s: string | null, minLen: number, maxLen: number, min: number, max: number): number[] | null {
  if (!s) return null;
  const parts = s.split(',').filter((x) => x !== '');
  if (parts.length < minLen || parts.length > maxLen) return null;
  const out: number[] = [];
  for (const part of parts) {
    const n = Number(part);
    if (!Number.isInteger(n) || n < min || n > max) return null;
    out.push(n);
  }
  return out;
}

function intOf(s: string | null, min: number, max: number): number | null {
  if (!s) return null;
  const n = Number(s);
  if (!Number.isInteger(n) || n < min || n > max) return null;
  return n;
}

function strOf(s: string | null, maxLen: number): string | null {
  if (s === null || s === '' || s.length > maxLen) return null;
  return s;
}

/** v1 graph payload 防御上限：真实规模由 entry.validate（12 节点/24 边）把关 */
const V1_GRAPH_MAX_CHARS = 16384;

interface V1DecodeOptions {
  /** search variant 缺省值（v1 URL 无 variant 字段时，按路由条目默认恢复） */
  defaultSearchVariant?: 'linear' | 'binary';
}

/** v1：解码为候选输入（仍需调用方用 entry.validate 复核） */
export function decodeInput(
  type: AlgorithmInput['type'],
  query: URLSearchParams,
  opts: V1DecodeOptions = {},
): AlgorithmInput | null {
  try {
    switch (type) {
      case 'sort': {
        const arr = parseNums(query.get('a'), 1, 60, -99, 999);
        return arr ? { type: 'sort', array: arr } : null;
      }
      case 'search': {
        const arr = parseNums(query.get('a'), 1, 60, -99, 999);
        const t = intOf(query.get('t'), -99, 999);
        // P11 修复：不再硬编码 'linear'。显式参数优先，缺省按条目默认
        const vParam = strOf(query.get('v'), 10);
        const variant = vParam === 'linear' || vParam === 'binary' ? vParam : (opts.defaultSearchVariant ?? 'linear');
        return arr && t !== null ? { type: 'search', variant, array: arr, target: t } : null;
      }
      case 'linear': {
        const st = strOf(query.get('st'), 10);
        if (st !== 'stack' && st !== 'queue') return null;
        const raw = strOf(query.get('i'), 200);
        const initial = raw ? raw.split(',').filter((x) => x !== '') : [];
        if (initial.length > 12) return null;
        const opRaw = strOf(query.get('op'), 60);
        if (!opRaw) return null;
        const opObj = decodeLinearOpText(opRaw);
        return opObj ? { type: 'linear', structure: st, initial, operation: opObj } : null;
      }
      case 'linkedlist': {
        const raw = strOf(query.get('i'), 200);
        const initial = raw ? raw.split(',').filter((x) => x !== '') : [];
        if (initial.length > 12) return null;
        const opRaw = strOf(query.get('op'), 80);
        if (!opRaw) return null;
        const seg = opRaw.split(':');
        switch (seg[0]) {
          case 'create':
            return { type: 'linkedlist', initial, operation: { op: 'create' } };
          case 'traverse':
            return { type: 'linkedlist', initial, operation: { op: 'traverse' } };
          case 'insert': {
            const pos = intOf(seg[1] ?? null, 0, 12);
            const value = strOf(seg[2] ?? null, 20);
            return pos !== null && value ? { type: 'linkedlist', initial, operation: { op: 'insert', position: pos, value } } : null;
          }
          case 'delete': {
            const pos = intOf(seg[1] ?? null, 0, 12);
            return pos !== null ? { type: 'linkedlist', initial, operation: { op: 'delete', position: pos } } : null;
          }
          case 'search': {
            const value = strOf(seg[1] ?? null, 20);
            return value ? { type: 'linkedlist', initial, operation: { op: 'search', value } } : null;
          }
          default:
            return null;
        }
      }
      case 'bst': {
        const tree = parseNums(query.get('tree'), 0, 31, -999, 999);
        const opRaw = strOf(query.get('op'), 80);
        if (!opRaw) return null;
        const seg = opRaw.split(':');
        switch (seg[0]) {
          case 'build': {
            const vals = parseNums(seg[1] ?? null, 0, 31, -999, 999);
            return vals ? { type: 'bst', startTree: vals, operation: { op: 'build', values: vals } } : null;
          }
          case 'insert':
          case 'search':
          case 'delete': {
            const v = intOf(seg[1] ?? null, -999, 999);
            return v !== null && tree ? { type: 'bst', startTree: tree, operation: { op: seg[0] as 'insert', value: v } } : null;
          }
          case 'traverse': {
            const order = strOf(seg[1] ?? null, 10);
            if (order !== 'pre' && order !== 'in' && order !== 'post' && order !== 'level') return null;
            return { type: 'bst', startTree: tree ?? [], operation: { op: 'traverse', order } };
          }
          default:
            return null;
        }
      }
      case 'graph': {
        const gParam = query.get('g');
        if (gParam === null || gParam.length > V1_GRAPH_MAX_CHARS) return null;
        const json = fromBase64Url(gParam);
        if (!json) return null;
        const parsed: unknown = JSON.parse(json);
        if (!isGraphShaped(parsed)) return null;
        return parsed;
      }
      case 'recursion': {
        const k = strOf(query.get('k'), 20);
        const n = intOf(query.get('n'), 1, 12);
        if (k !== 'factorial' && k !== 'fibonacci' && k !== 'hanoi') return null;
        if (n === null) return null;
        return { type: 'recursion', kind: k, n };
      }
      case 'nqueens': {
        const n = intOf(query.get('n'), 4, 8);
        return n !== null ? { type: 'nqueens', n } : null;
      }
      case 'dp': {
        const k = strOf(query.get('k'), 20);
        if (k === 'fibonacci') {
          const n = intOf(query.get('n'), 1, 12);
          return n !== null ? { type: 'dp', kind: 'fibonacci', n } : null;
        }
        if (k === 'knapsack') {
          const raw = strOf(query.get('it'), 300);
          const cap = intOf(query.get('cap'), 1, 20);
          if (!raw || cap === null) return null;
          const items = raw.split(',').filter((x) => x !== '').map((seg) => {
            const [name, w, v] = seg.split(':');
            return { name: String(name ?? '').slice(0, 10), weight: Number(w), value: Number(v) };
          });
          if (items.length === 0 || items.length > 8) return null;
          for (const it of items) {
            if (!Number.isInteger(it.weight) || it.weight < 1 || it.weight > 99) return null;
            if (!Number.isInteger(it.value) || it.value < 1 || it.value > 99) return null;
            if (it.name === '') return null;
          }
          return { type: 'dp', kind: 'knapsack', items, capacity: cap };
        }
        return null;
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

/** v1 linear op 文本（"push:x" 等）→ LinearOperation */
function decodeLinearOpText(opRaw: string): LinearOperation | null {
  const [op, val] = opRaw.split(':') as [string, string?];
  if ((op === 'push' || op === 'enqueue') && val !== undefined) {
    const value = strOf(val, 20);
    if (value === null) return null;
    return op === 'push' ? { op: 'push', value } : { op: 'enqueue', value };
  }
  if (op === 'pop' || op === 'peek' || op === 'dequeue' || op === 'front') return { op };
  return null;
}

/** graph JSON 的形态校验（字段级；规模与边合法性由 entry.validate 复核） */
function isGraphShaped(v: unknown): v is AlgorithmInput {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  if (o.type !== 'graph') return false;
  if (o.algorithm !== 'bfs' && o.algorithm !== 'dfs' && o.algorithm !== 'dijkstra') return false;
  // v1 payload 结构：{ type, algorithm, graph: { nodes, edges }, start, end }
  const g = o.graph;
  if (typeof g !== 'object' || g === null) return false;
  const gg = g as Record<string, unknown>;
  if (!Array.isArray(gg.nodes) || !Array.isArray(gg.edges)) return false;
  for (const n of gg.nodes) {
    if (typeof n !== 'object' || n === null) return false;
    const nn = n as Record<string, unknown>;
    if (typeof nn.id !== 'string' || nn.id === '') return false;
    if (typeof nn.x !== 'number' || !Number.isFinite(nn.x) || nn.x < 0 || nn.x > 1) return false;
    if (typeof nn.y !== 'number' || !Number.isFinite(nn.y) || nn.y < 0 || nn.y > 1) return false;
  }
  for (const e of gg.edges) {
    if (typeof e !== 'object' || e === null) return false;
    const ee = e as Record<string, unknown>;
    if (typeof ee.id !== 'string' || ee.id === '') return false;
    if (typeof ee.from !== 'string' || typeof ee.to !== 'string') return false;
    if (typeof ee.directed !== 'boolean') return false;
    if (typeof ee.weight !== 'number' || !Number.isInteger(ee.weight)) return false;
  }
  if (typeof o.start !== 'string' && o.start !== null) return false;
  if (typeof o.end !== 'string' && o.end !== null) return false;
  return true;
}

// ---------------------------------------------------------------------------
// v2：单 payload 紧凑协议
// ---------------------------------------------------------------------------

type CompactInput =
  | { t: 'sort'; a: number[] }
  | { t: 'search'; v: 'linear' | 'binary'; a: number[]; g: number }
  | { t: 'linear'; st: 'stack' | 'queue'; i: string[]; op: string }
  | { t: 'linkedlist'; i: string[]; op: string }
  | { t: 'bst'; tree: number[]; op: string }
  | { t: 'graph'; al: GraphAlgorithm; n: [string, number, number][]; e: [string, string, string, 0 | 1, number][]; st: string; en: string | null }
  | { t: 'recursion'; k: RecursionKind; n: number }
  | { t: 'nqueens'; n: number }
  | { t: 'dpf'; n: number }
  | { t: 'dpk'; it: [string, number, number][]; cap: number };

interface SharePayloadV2 {
  v: 2;
  algo: string;
  in: CompactInput;
  s?: number;
  m?: { b?: true };
}

/** AlgorithmInput → 紧凑输入（graph 数组化） */
function toCompact(input: AlgorithmInput): CompactInput {
  switch (input.type) {
    case 'sort':
      return { t: 'sort', a: input.array };
    case 'search':
      return { t: 'search', v: input.variant, a: input.array, g: input.target };
    case 'linear':
      return { t: 'linear', st: input.structure, i: input.initial, op: linearOpText(input.operation) };
    case 'linkedlist':
      return { t: 'linkedlist', i: input.initial, op: linkedListOpText(input) };
    case 'bst':
      return { t: 'bst', tree: input.startTree, op: bstOpText(input) };
    case 'graph':
      return {
        t: 'graph',
        al: input.algorithm,
        n: input.graph.nodes.map((n) => [n.id, n.x, n.y] as [string, number, number]),
        e: input.graph.edges.map((e) => [e.id, e.from, e.to, e.directed ? 1 : 0, e.weight] as [string, string, string, 0 | 1, number]),
        st: input.start ?? '',
        en: input.end,
      };
    case 'recursion':
      return { t: 'recursion', k: input.kind, n: input.n };
    case 'nqueens':
      return { t: 'nqueens', n: input.n };
    case 'dp':
      return input.kind === 'fibonacci'
        ? { t: 'dpf', n: input.n }
        : { t: 'dpk', it: input.items.map((i) => [i.name, i.weight, i.value] as [string, number, number]), cap: input.capacity };
  }
}

function linearOpText(op: LinearOperation): string {
  switch (op.op) {
    case 'push':
      return `push:${op.value}`;
    case 'enqueue':
      return `enqueue:${op.value}`;
    default:
      return op.op;
  }
}

function linkedListOpText(input: Extract<AlgorithmInput, { type: 'linkedlist' }>): string {
  const op = input.operation;
  switch (op.op) {
    case 'insert':
      return `insert:${op.position}:${op.value}`;
    case 'delete':
      return `delete:${op.position}`;
    case 'search':
      return `search:${op.value}`;
    default:
      return op.op;
  }
}

function bstOpText(input: Extract<AlgorithmInput, { type: 'bst' }>): string {
  const op = input.operation;
  switch (op.op) {
    case 'insert':
      return `insert:${op.value}`;
    case 'search':
      return `search:${op.value}`;
    case 'delete':
      return `delete:${op.value}`;
    case 'traverse':
      return `traverse:${op.order}`;
    case 'build':
      return `build:${op.values.join(',')}`;
  }
}

/** 紧凑输入 → AlgorithmInput；任何字段非法返回 null */
function fromCompact(c: unknown): AlgorithmInput | null {
  if (typeof c !== 'object' || c === null) return null;
  const o = c as Record<string, unknown>;
  switch (o.t) {
    case 'sort': {
      const a = parseNums(Array.isArray(o.a) ? o.a.join(',') : null, 1, 60, -99, 999);
      return a ? { type: 'sort', array: a } : null;
    }
    case 'search': {
      const a = parseNums(Array.isArray(o.a) ? o.a.join(',') : null, 1, 60, -99, 999);
      const g = typeof o.g === 'number' && Number.isInteger(o.g) && o.g >= -99 && o.g <= 999 ? o.g : null;
      const v = o.v === 'linear' || o.v === 'binary' ? o.v : null;
      return a && g !== null && v ? { type: 'search', variant: v, array: a, target: g } : null;
    }
    case 'linear': {
      if (o.st !== 'stack' && o.st !== 'queue') return null;
      if (!Array.isArray(o.i) || o.i.length > 12 || !o.i.every((x) => typeof x === 'string' && x.length <= 20)) return null;
      if (typeof o.op !== 'string' || o.op.length > 60) return null;
      const opObj = decodeLinearOpText(o.op);
      return opObj ? { type: 'linear', structure: o.st, initial: o.i as string[], operation: opObj } : null;
    }
    case 'linkedlist': {
      if (!Array.isArray(o.i) || o.i.length > 12 || !o.i.every((x) => typeof x === 'string' && x.length <= 20)) return null;
      if (typeof o.op !== 'string' || o.op.length > 80) return null;
      const seg = o.op.split(':');
      switch (seg[0]) {
        case 'create':
          return { type: 'linkedlist', initial: o.i as string[], operation: { op: 'create' } };
        case 'traverse':
          return { type: 'linkedlist', initial: o.i as string[], operation: { op: 'traverse' } };
        case 'insert': {
          const pos = intOf(seg[1] ?? null, 0, 12);
          const value = strOf(seg[2] ?? null, 20);
          return pos !== null && value ? { type: 'linkedlist', initial: o.i as string[], operation: { op: 'insert', position: pos, value } } : null;
        }
        case 'delete': {
          const pos = intOf(seg[1] ?? null, 0, 12);
          return pos !== null ? { type: 'linkedlist', initial: o.i as string[], operation: { op: 'delete', position: pos } } : null;
        }
        case 'search': {
          const value = strOf(seg[1] ?? null, 20);
          return value ? { type: 'linkedlist', initial: o.i as string[], operation: { op: 'search', value } } : null;
        }
        default:
          return null;
      }
    }
    case 'bst': {
      // 空树（startTree: []）是合法输入：join 后为空串，parseNums 会拒——特判空数组
      const tree = Array.isArray(o.tree) && o.tree.length === 0 ? [] : parseNums(Array.isArray(o.tree) ? o.tree.join(',') : null, 0, 31, -999, 999);
      if (tree === null) return null;
      if (typeof o.op !== 'string' || o.op.length > 200) return null;
      const seg = o.op.split(':');
      switch (seg[0]) {
        case 'build': {
          const vals = parseNums(seg[1] ?? null, 0, 31, -999, 999);
          return vals ? { type: 'bst', startTree: vals, operation: { op: 'build', values: vals } } : null;
        }
        case 'insert':
        case 'search':
        case 'delete': {
          const v = intOf(seg[1] ?? null, -999, 999);
          return v !== null ? { type: 'bst', startTree: tree, operation: { op: seg[0], value: v } } : null;
        }
        case 'traverse': {
          const order = seg[1];
          if (order !== 'pre' && order !== 'in' && order !== 'post' && order !== 'level') return null;
          return { type: 'bst', startTree: tree, operation: { op: 'traverse', order } };
        }
        default:
          return null;
      }
    }
    case 'graph': {
      if (o.al !== 'bfs' && o.al !== 'dfs' && o.al !== 'dijkstra') return null;
      if (!Array.isArray(o.n) || o.n.length < 1 || o.n.length > 12) return null;
      if (!Array.isArray(o.e) || o.e.length > 24) return null;
      const nodes: { id: string; x: number; y: number }[] = [];
      const seenIds = new Set<string>();
      for (const n of o.n) {
        if (!Array.isArray(n) || n.length !== 3) return null;
        const [id, x, y] = n as [unknown, unknown, unknown];
        if (typeof id !== 'string' || id === '' || id.length > 16 || seenIds.has(id)) return null;
        if (typeof x !== 'number' || !Number.isFinite(x) || x < 0 || x > 1) return null;
        if (typeof y !== 'number' || !Number.isFinite(y) || y < 0 || y > 1) return null;
        seenIds.add(id);
        nodes.push({ id, x, y });
      }
      const edges: { id: string; from: string; to: string; directed: boolean; weight: number }[] = [];
      const seenEdgeIds = new Set<string>();
      const seenPairs = new Set<string>();
      for (const e of o.e) {
        if (!Array.isArray(e) || e.length !== 5) return null;
        const [id, from, to, dir, w] = e as [unknown, unknown, unknown, unknown, unknown];
        if (typeof id !== 'string' || id === '' || id.length > 32) return null;
        if (seenEdgeIds.has(id)) return null; // 边 id 唯一
        seenEdgeIds.add(id);
        if (typeof from !== 'string' || typeof to !== 'string' || !seenIds.has(from) || !seenIds.has(to)) return null;
        if (from === to) return null; // 自环
        const pairKey = dir === 1 ? `${from}>${to}` : [from, to].sort().join('-');
        if (seenPairs.has(pairKey)) return null; // 重复边
        seenPairs.add(pairKey);
        if (dir !== 0 && dir !== 1) return null;
        if (typeof w !== 'number' || !Number.isInteger(w) || w < 1 || w > 99) return null;
        edges.push({ id, from, to, directed: dir === 1, weight: w });
      }
      if (typeof o.st !== 'string' || !seenIds.has(o.st)) return null;
      if (o.en !== null && typeof o.en !== 'string') return null;
      if (o.en !== null && !seenIds.has(o.en)) return null;
      return { type: 'graph', algorithm: o.al, graph: { nodes, edges }, start: o.st, end: o.en };
    }
    case 'recursion': {
      if (o.k !== 'factorial' && o.k !== 'fibonacci' && o.k !== 'hanoi') return null;
      const n = intOf(typeof o.n === 'number' ? String(o.n) : null, 1, 12);
      return n !== null ? { type: 'recursion', kind: o.k, n } : null;
    }
    case 'nqueens': {
      const n = intOf(typeof o.n === 'number' ? String(o.n) : null, 4, 8);
      return n !== null ? { type: 'nqueens', n } : null;
    }
    case 'dpf': {
      const n = intOf(typeof o.n === 'number' ? String(o.n) : null, 1, 12);
      return n !== null ? { type: 'dp', kind: 'fibonacci', n } : null;
    }
    case 'dpk': {
      if (!Array.isArray(o.it) || o.it.length < 1 || o.it.length > 8) return null;
      const items: { name: string; weight: number; value: number }[] = [];
      for (const it of o.it) {
        if (!Array.isArray(it) || it.length !== 3) return null;
        const [name, w, v] = it as [unknown, unknown, unknown];
        if (typeof name !== 'string' || name === '' || name.length > 10) return null;
        if (typeof w !== 'number' || !Number.isInteger(w) || w < 1 || w > 99) return null;
        if (typeof v !== 'number' || !Number.isInteger(v) || v < 1 || v > 99) return null;
        items.push({ name, weight: w, value: v });
      }
      const cap = intOf(typeof o.cap === 'number' ? String(o.cap) : null, 1, 20);
      return cap !== null ? { type: 'dp', kind: 'knapsack', items, capacity: cap } : null;
    }
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// 对外接口
// ---------------------------------------------------------------------------

export interface ShareLink {
  query: string;
  /** 可选：初始步下标 */
  step?: number;
  /** 可选：附带 Beginner 开启 */
  beginner?: boolean;
}

export interface BuildShareOptions {
  algorithmId: string;
  step?: number;
  beginner?: boolean;
}

/** 构造分享链接的 query 部分（v2 单 payload） */
export function buildShareQuery(input: AlgorithmInput, opts: BuildShareOptions): string {
  const payload: SharePayloadV2 = {
    v: 2,
    algo: opts.algorithmId,
    in: toCompact(input),
    ...(opts.step !== undefined && opts.step > 0 ? { s: opts.step } : {}),
    ...(opts.beginner ? { m: { b: true as const } } : {}),
  };
  const p = new URLSearchParams();
  p.set('v', '2');
  p.set('d', toBase64Url(JSON.stringify(payload)));
  return p.toString();
}

export interface DecodeResult {
  input: AlgorithmInput;
  step: number | null;
  /** 分享链接请求开启 Beginner Mode（session 生效，不污染全局设置） */
  beginnerMode: boolean;
}

export interface ParseShareOptions {
  /** 路由条目 id（v2 payload.algo 与路由不一致 → null） */
  algorithmId?: string;
  /** v1 search 链接缺省 variant（按条目默认恢复，修复 binary-search 丢 variant） */
  defaultSearchVariant?: 'linear' | 'binary';
}

/** 从 query 解码分享（type 由路由决定）；返回 null = 无效分享 */
export function parseShareQuery(type: AlgorithmInput['type'], search: string, opts: ParseShareOptions = {}): DecodeResult | null {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);

  // v2：单 payload
  if (params.get('v') === '2') {
    const d = params.get('d');
    if (d === null || d.length === 0 || d.length > 16384) return null;
    const json = fromBase64Url(d);
    if (json === null) return null;
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      return null;
    }
    if (typeof parsed !== 'object' || parsed === null) return null;
    const p = parsed as Record<string, unknown>;
    if (p.v !== 2) return null;
    if (typeof p.algo !== 'string' || (opts.algorithmId !== undefined && p.algo !== opts.algorithmId)) return null;
    const input = fromCompact(p.in);
    if (input === null || input.type !== type) return null;
    const step = typeof p.s === 'number' && Number.isInteger(p.s) && p.s >= 0 && p.s <= 100000 ? p.s : null;
    const beginner =
      typeof p.m === 'object' && p.m !== null && (p.m as Record<string, unknown>).b === true;
    return { input, step: step === null || step === 0 ? null : step, beginnerMode: beginner };
  }

  // v1 兼容路径
  if (![...params.keys()].some((k) => k !== 's' && k !== 'm')) return null;
  const input = decodeInput(type, params, { defaultSearchVariant: opts.defaultSearchVariant });
  if (!input) return null;
  const step = intOf(params.get('s'), 0, 100000);
  return {
    input,
    step: step === null || step === 0 ? null : step,
    beginnerMode: params.get('m') === 'b',
  };
}
