/**
 * Share URL 编解码（docs/LEARNING_DATA_SPEC.md §6）：
 * - 只分享算法公开状态（输入数据），绝不含 Notes/Progress/学习记录。
 * - 编解码按输入类型分派；decode 结果必须再过 entry.validate（规模上限复用现有校验）。
 * - 任何异常返回 null（调用方回退默认输入并提示），绝不抛出、绝不崩溃。
 */
import type { AlgorithmInput, LinearOperation } from '../registry';

// ---------------------------------------------------------------------------
// 编码
// ---------------------------------------------------------------------------

function joinNums(arr: number[]): string {
  return arr.join(',');
}

/** 按输入类型编码为 query 参数串（不带 ?） */
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

// ---------------------------------------------------------------------------
// 解码（防御性：任何字段非法 → null）
// ---------------------------------------------------------------------------

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

/** 解码为候选输入（仍需调用方用 entry.validate 复核） */
export function decodeInput(type: AlgorithmInput['type'], query: URLSearchParams): AlgorithmInput | null {
  try {
    switch (type) {
      case 'sort': {
        const arr = parseNums(query.get('a'), 1, 60, -99, 999);
        return arr ? { type: 'sort', array: arr } : null;
      }
      case 'search': {
        const arr = parseNums(query.get('a'), 1, 60, -99, 999);
        const t = intOf(query.get('t'), -99, 999);
        return arr && t !== null ? { type: 'search', variant: 'linear', array: arr, target: t } : null;
      }
      case 'linear': {
        const st = strOf(query.get('st'), 10);
        if (st !== 'stack' && st !== 'queue') return null;
        const raw = strOf(query.get('i'), 200);
        const initial = raw ? raw.split(',').filter((x) => x !== '') : [];
        if (initial.length > 12) return null;
        const opRaw = strOf(query.get('op'), 60);
        if (!opRaw) return null;
        const [op, val] = opRaw.split(':') as [string, string?];
        let opObj: LinearOperation | null = null;
        if ((op === 'push' || op === 'enqueue') && val !== undefined) {
          const value = strOf(val, 20);
          if (value !== null) opObj = op === 'push' ? { op: 'push', value } : { op: 'enqueue', value };
        } else if (op === 'pop' || op === 'peek' || op === 'dequeue' || op === 'front') {
          opObj = { op };
        }
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
        const json = fromBase64Url(strOf(query.get('g'), 2000) ?? '');
        if (!json) return null;
        const parsed = JSON.parse(json) as AlgorithmInput;
        if (parsed.type !== 'graph') return null;
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

/** 构造分享链接的 query 部分 */
export function buildShareQuery(input: AlgorithmInput, opts: { step?: number; beginner?: boolean } = {}): string {
  const q = encodeInput(input);
  const extra = new URLSearchParams(q);
  if (opts.step !== undefined && opts.step > 0) extra.set('s', String(opts.step));
  if (opts.beginner) extra.set('m', 'b');
  return extra.toString();
}

export interface DecodeResult {
  input: AlgorithmInput;
  step: number | null;
}

/** 从 query 解码分享（type 由路由决定）；返回 null = 无效分享 */
export function parseShareQuery(type: AlgorithmInput['type'], search: string): DecodeResult | null {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  if (![...params.keys()].some((k) => k !== 's' && k !== 'm')) return null;
  const input = decodeInput(type, params);
  if (!input) return null;
  const step = intOf(params.get('s'), 0, 100000);
  return { input, step: step === null || step === 0 ? null : step };
}
