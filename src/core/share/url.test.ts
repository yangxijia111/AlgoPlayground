/**
 * Share URL 编解码测试：各输入类型往返一致 + 非法输入防御。
 */
import { describe, expect, it } from 'vitest';
import { allEntries } from '../algorithms';
import { registerAll, type AlgorithmInput } from '../registry';
import { buildShareQuery, decodeInput, encodeInput, parseShareQuery } from './url';

registerAll(allEntries);

describe('encode/decode 往返', () => {
  it('sort', () => {
    const input: AlgorithmInput = { type: 'sort', array: [5, 3, 2, 1] };
    expect(encodeInput(input)).toBe('a=5%2C3%2C2%2C1');
    const decoded = decodeInput('sort', new URLSearchParams('a=5,3,2,1'));
    expect(decoded).toEqual({ type: 'sort', array: [5, 3, 2, 1] });
  });

  it('search', () => {
    const input: AlgorithmInput = { type: 'search', variant: 'linear', array: [1, 3, 5], target: 5 };
    const decoded = decodeInput('search', new URLSearchParams(encodeInput(input)));
    expect(decoded).toEqual(input);
  });

  it('linear（stack push / queue dequeue）', () => {
    const push: AlgorithmInput = { type: 'linear', structure: 'stack', initial: ['a', 'b'], operation: { op: 'push', value: 'c' } };
    expect(decodeInput('linear', new URLSearchParams(encodeInput(push)))).toEqual(push);
    const deq: AlgorithmInput = { type: 'linear', structure: 'queue', initial: ['p'], operation: { op: 'dequeue' } };
    expect(decodeInput('linear', new URLSearchParams(encodeInput(deq)))).toEqual(deq);
  });

  it('linkedlist（insert 带位置与值）', () => {
    const input: AlgorithmInput = { type: 'linkedlist', initial: ['a', 'b'], operation: { op: 'insert', position: 1, value: 'x' } };
    expect(decodeInput('linkedlist', new URLSearchParams(encodeInput(input)))).toEqual(input);
  });

  it('bst（search / traverse）', () => {
    const search: AlgorithmInput = { type: 'bst', startTree: [8, 3, 10], operation: { op: 'search', value: 6 } };
    expect(decodeInput('bst', new URLSearchParams(encodeInput(search)))).toEqual(search);
    const trav: AlgorithmInput = { type: 'bst', startTree: [8, 3, 10], operation: { op: 'traverse', order: 'level' } };
    expect(decodeInput('bst', new URLSearchParams(encodeInput(trav)))).toEqual(trav);
  });

  it('graph（base64url JSON 往返）', () => {
    const input: AlgorithmInput = {
      type: 'graph',
      algorithm: 'dijkstra',
      graph: {
        nodes: [
          { id: 'A', x: 0.1, y: 0.2 },
          { id: 'B', x: 0.8, y: 0.7 },
        ],
        edges: [{ id: 'e1', from: 'A', to: 'B', directed: false, weight: 4 }],
      },
      start: 'A',
      end: null,
    };
    expect(decodeInput('graph', new URLSearchParams(encodeInput(input)))).toEqual(input);
  });

  it('recursion / nqueens / dp', () => {
    const rec: AlgorithmInput = { type: 'recursion', kind: 'hanoi', n: 4 };
    expect(decodeInput('recursion', new URLSearchParams(encodeInput(rec)))).toEqual(rec);
    const nq: AlgorithmInput = { type: 'nqueens', n: 6 };
    expect(decodeInput('nqueens', new URLSearchParams(encodeInput(nq)))).toEqual(nq);
    const fib: AlgorithmInput = { type: 'dp', kind: 'fibonacci', n: 8 };
    expect(decodeInput('dp', new URLSearchParams(encodeInput(fib)))).toEqual(fib);
    const knap: AlgorithmInput = { type: 'dp', kind: 'knapsack', items: [{ name: 'A', weight: 2, value: 3 }], capacity: 5 };
    expect(decodeInput('dp', new URLSearchParams(encodeInput(knap)))).toEqual(knap);
  });

  it('全部注册条目的默认输入都能无损往返并通过自身校验', () => {
    for (const entry of allEntries) {
      const query = encodeInput(entry.defaultInput);
      const decoded = decodeInput(entry.defaultInput.type, new URLSearchParams(query));
      expect(decoded, entry.meta.id).not.toBeNull();
      const err = entry.validate(decoded!);
      expect(err, `${entry.meta.id}: ${err ?? ''}`).toBeNull();
    }
  });
});

describe('非法输入防御', () => {
  it('超长数组 / 非整数 / 越界值返回 null', () => {
    expect(decodeInput('sort', new URLSearchParams('a=' + '1,'.repeat(70) + '1'))).toBeNull();
    expect(decodeInput('sort', new URLSearchParams('a=1.5,2'))).toBeNull();
    expect(decodeInput('sort', new URLSearchParams('a=x'))).toBeNull();
    expect(decodeInput('recursion', new URLSearchParams('k=factorial&n=99'))).toBeNull();
    expect(decodeInput('nqueens', new URLSearchParams('n=3'))).toBeNull();
    expect(decodeInput('graph', new URLSearchParams('g=!!!not-base64'))).toBeNull();
    expect(decodeInput('dp', new URLSearchParams('k=knapsack&it=A:0:3&cap=5'))).toBeNull();
  });

  it('base64 的 graph JSON 类型不符返回 null', () => {
    const fake = btoa(JSON.stringify({ type: 'sort', array: [1] }));
    const b64 = fake.replace(/\+/g, '-').replace(/\//g, '_');
    expect(decodeInput('graph', new URLSearchParams(`g=${b64}`))).toBeNull();
  });
});

describe('buildShareQuery / parseShareQuery', () => {
  it('附带步数与 beginner 标记并可解析回来', () => {
    const input: AlgorithmInput = { type: 'sort', array: [3, 1, 2] };
    const q = buildShareQuery(input, { step: 4, beginner: true });
    expect(q).toContain('s=4');
    expect(q).toContain('m=b');
    const parsed = parseShareQuery('sort', q);
    expect(parsed).not.toBeNull();
    expect(parsed!.input).toEqual(input);
    expect(parsed!.step).toBe(4);
  });

  it('纯参数串（无 s/m）可解析；只有 s/m 无数据返回 null', () => {
    expect(parseShareQuery('sort', 'a=1,2,3')).not.toBeNull();
    expect(parseShareQuery('sort', 's=2&m=b')).toBeNull();
    expect(parseShareQuery('sort', '')).toBeNull();
  });

  it('含 m=b 的完整链接往返（Beginner 分享场景）', () => {
    const input: AlgorithmInput = { type: 'linear', structure: 'stack', initial: [], operation: { op: 'push', value: 'x' } };
    const q = buildShareQuery(input, { beginner: true });
    const parsed = parseShareQuery('linear', q);
    expect(parsed).not.toBeNull();
  });
});
