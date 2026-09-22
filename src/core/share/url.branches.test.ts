/**
 * Share URL 补充分支测试：linkedlist/bst 各操作、linear 缺字段、graph JSON 结构等防御路径。
 */
import { describe, expect, it } from 'vitest';
import type { AlgorithmInput } from '../registry';
import { decodeInput, encodeInput } from './url';

describe('linkedlist 分支', () => {
  it('create / traverse / delete / search / 非法 op', () => {
    const create: AlgorithmInput = { type: 'linkedlist', initial: ['a'], operation: { op: 'create' } };
    expect(decodeInput('linkedlist', new URLSearchParams(encodeInput(create)))).toEqual(create);
    const trav: AlgorithmInput = { type: 'linkedlist', initial: ['a'], operation: { op: 'traverse' } };
    expect(decodeInput('linkedlist', new URLSearchParams(encodeInput(trav)))).toEqual(trav);
    const del: AlgorithmInput = { type: 'linkedlist', initial: ['a', 'b'], operation: { op: 'delete', position: 1 } };
    expect(decodeInput('linkedlist', new URLSearchParams(encodeInput(del)))).toEqual(del);
    const search: AlgorithmInput = { type: 'linkedlist', initial: ['a', 'b'], operation: { op: 'search', value: 'b' } };
    expect(decodeInput('linkedlist', new URLSearchParams(encodeInput(search)))).toEqual(search);
    // 未知 op
    expect(decodeInput('linkedlist', new URLSearchParams('i=a&op=destroy'))).toBeNull();
    // 缺 op
    expect(decodeInput('linkedlist', new URLSearchParams('i=a'))).toBeNull();
    // 初始元素超限
    const many = Array.from({ length: 13 }, (_, i) => `n${i}`).join(',');
    expect(decodeInput('linkedlist', new URLSearchParams(`i=${many}&op=create`))).toBeNull();
  });
});

describe('bst 分支', () => {
  it('build / insert / delete / 非法 order / 缺 tree', () => {
    const build: AlgorithmInput = { type: 'bst', startTree: [5, 3], operation: { op: 'build', values: [5, 3] } };
    expect(decodeInput('bst', new URLSearchParams(encodeInput(build)))).toEqual(build);
    const ins: AlgorithmInput = { type: 'bst', startTree: [5], operation: { op: 'insert', value: 7 } };
    expect(decodeInput('bst', new URLSearchParams(encodeInput(ins)))).toEqual(ins);
    const del: AlgorithmInput = { type: 'bst', startTree: [5, 3], operation: { op: 'delete', value: 3 } };
    expect(decodeInput('bst', new URLSearchParams(encodeInput(del)))).toEqual(del);
    // 非法 order
    expect(decodeInput('bst', new URLSearchParams('tree=5&op=traverse:sideways'))).toBeNull();
    // insert 缺 tree
    expect(decodeInput('bst', new URLSearchParams('op=insert:5'))).toBeNull();
    // 缺 op
    expect(decodeInput('bst', new URLSearchParams('tree=5'))).toBeNull();
  });
});

describe('linear 分支', () => {
  it('peek/front 通过；缺 value 的 push 拒绝；非法 structure 拒绝', () => {
    expect(decodeInput('linear', new URLSearchParams('st=stack&i=a&op=peek'))).toEqual({
      type: 'linear', structure: 'stack', initial: ['a'], operation: { op: 'peek' },
    });
    expect(decodeInput('linear', new URLSearchParams('st=queue&i=&op=front'))).toEqual({
      type: 'linear', structure: 'queue', initial: [], operation: { op: 'front' },
    });
    expect(decodeInput('linear', new URLSearchParams('st=stack&i=a&op=push'))).toBeNull();
    expect(decodeInput('linear', new URLSearchParams('st=heap&i=a&op=pop'))).toBeNull();
    // 缺 initial 视为空栈（合法）
    expect(decodeInput('linear', new URLSearchParams('st=stack&op=pop'))).toEqual({
      type: 'linear', structure: 'stack', initial: [], operation: { op: 'pop' },
    });
  });
});

describe('graph / dp 分支', () => {
  it('graph JSON 非对象字段缺失时拒绝', () => {
    const fake = btoa(JSON.stringify({ hello: 1 }));
    const b64 = fake.replace(/\+/g, '-').replace(/\//g, '_');
    expect(decodeInput('graph', new URLSearchParams(`g=${b64}`))).toBeNull();
  });

  it('dp 未知 kind / knapsack 缺字段', () => {
    expect(decodeInput('dp', new URLSearchParams('k=word&n=5'))).toBeNull();
    expect(decodeInput('dp', new URLSearchParams('k=knapsack&cap=5'))).toBeNull();
    expect(decodeInput('dp', new URLSearchParams('k=knapsack&it=A:2:3'))).toBeNull();
    expect(decodeInput('dp', new URLSearchParams('k=knapsack&it=A:2:3,B:1&cap=5'))).toBeNull();
    expect(decodeInput('dp', new URLSearchParams('k=fibonacci'))).toBeNull();
  });

  it('recursion 非法 kind', () => {
    expect(decodeInput('recursion', new URLSearchParams('k=ackermann&n=3'))).toBeNull();
    expect(decodeInput('recursion', new URLSearchParams('k=factorial'))).toBeNull();
  });

  it('search 缺 target / sort 缺数组', () => {
    expect(decodeInput('search', new URLSearchParams('a=1,2'))).toBeNull();
    expect(decodeInput('sort', new URLSearchParams('a='))).toBeNull();
  });
});

describe('base64url unicode 安全', () => {
  it('链表值含中文可往返', () => {
    const input: AlgorithmInput = { type: 'linkedlist', initial: ['甲', '乙'], operation: { op: 'insert', position: 1, value: '丙' } };
    const q = encodeInput(input);
    expect(decodeInput('linkedlist', new URLSearchParams(q))).toEqual(input);
  });
});
