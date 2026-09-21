/**
 * 概念课富文本：把段落中的 [[term:id]] / [[term:id|显示文本]] 标记解析为术语弹窗引用。
 * 解析纯文本确定性；未知名词原样保留（内容校验测试保证 id 合法）。
 */
import type { ReactNode } from 'react';
import { TermTip } from './TermTip';

const MARK_RE = /\[\[term:([a-z0-9-]+)(?:\|([^\]]+))?\]\]/g;

export function renderRichText(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const m of text.matchAll(MARK_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) nodes.push(text.slice(last, idx));
    nodes.push(
      <TermTip key={key++} termId={m[1]}>
        {m[2]}
      </TermTip>,
    );
    last = idx + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/** 段落是否包含术语标记（内容测试用） */
export function hasTermMarks(text: string): boolean {
  return [...text.matchAll(MARK_RE)].length > 0;
}
