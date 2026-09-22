/**
 * BST 纯数据模型：结构与基本操作（不含可视化），供生成器与校验复用。
 * id 由插入序号决定，保证同一输入序列的构建结果确定。
 */

export interface BstNode {
  id: number;
  value: number;
  left: BstNode | null;
  right: BstNode | null;
}

/** 按插入序构建 BST（重复值：首次生效，后续忽略），返回根与实际插入数 */
export function buildTree(values: number[]): { root: BstNode | null; inserted: number } {
  let root: BstNode | null = null;
  let nextId = 1;
  let inserted = 0;
  for (const v of values) {
    if (findNode(root, v) !== null) continue;
    root = insertNode(root, v, nextId++);
    inserted++;
  }
  return { root, inserted };
}

/** 插入新节点（调用方保证值不存在），返回新根 */
export function insertNode(root: BstNode | null, value: number, id: number): BstNode {
  if (root === null) return { id, value, left: null, right: null };
  if (value < root.value) {
    return { ...root, left: insertNode(root.left, value, id) };
  }
  return { ...root, right: insertNode(root.right, value, id) };
}

/** 查找值为 value 的节点，未找到返回 null */
export function findNode(root: BstNode | null, value: number): BstNode | null {
  let curr = root;
  while (curr !== null) {
    if (value === curr.value) return curr;
    curr = value < curr.value ? curr.left : curr.right;
  }
  return null;
}

/** 从根到值为 value 的节点路径（含目标）；不存在时返回到目前为止的路径 */
export function findPath(root: BstNode | null, value: number): BstNode[] {
  const path: BstNode[] = [];
  let curr = root;
  while (curr !== null) {
    path.push(curr);
    if (value === curr.value) break;
    curr = value < curr.value ? curr.left : curr.right;
  }
  return path;
}

/** 子树中的最小节点 */
export function findMin(node: BstNode): BstNode {
  let curr = node;
  while (curr.left !== null) curr = curr.left;
  return curr;
}

/** 从根到最小节点的路径 */
export function pathToMin(node: BstNode): BstNode[] {
  const path: BstNode[] = [];
  let curr: BstNode | null = node;
  while (curr !== null) {
    path.push(curr);
    curr = curr.left;
  }
  return path;
}

/** 删除值为 value 的节点（调用方保证存在），返回新根 */
export function removeNode(root: BstNode | null, value: number): BstNode | null {
  if (root === null) return null;
  if (value < root.value) {
    return { ...root, left: removeNode(root.left, value) };
  }
  if (value > root.value) {
    return { ...root, right: removeNode(root.right, value) };
  }
  // 命中：三情形
  if (root.left === null) return root.right;
  if (root.right === null) return root.left;
  // 双子：用中序后继的值替换，再从右子树删除后继
  const successor = findMin(root.right);
  return {
    id: root.id,
    value: successor.value,
    left: root.left,
    right: removeNode(root.right, successor.value),
  };
}

/** 中序遍历值序列（升序） */
export function inOrderValues(root: BstNode | null): number[] {
  const out: number[] = [];
  const walk = (node: BstNode | null) => {
    if (!node) return;
    walk(node.left);
    out.push(node.value);
    walk(node.right);
  };
  walk(root);
  return out;
}

/** 先序遍历值序列。BST 的先序序列作为插入序列可唯一重建同构树（P11 状态一致性依据） */
export function preOrderValues(root: BstNode | null): number[] {
  const out: number[] = [];
  const walk = (node: BstNode | null) => {
    if (!node) return;
    out.push(node.value);
    walk(node.left);
    walk(node.right);
  };
  walk(root);
  return out;
}

/** 节点总数 */
export function countNodes(root: BstNode | null): number {
  if (!root) return 0;
  return 1 + countNodes(root.left) + countNodes(root.right);
}
