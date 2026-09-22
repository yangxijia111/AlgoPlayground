/**
 * 数据管理：Export 学习数据 JSON / Import 校验导入（两步确认）/ Reset（两步确认）。
 * Import 绝不执行 JSON 中代码，只当纯数据处理；坏文件拒绝且不修改现有数据。
 */
import { useRef, useState } from 'react';
import type { LearningProfile } from '../../core/learning/types';
import { STORAGE_VERSION } from '../../core/learning/types';
import { getLearningStore } from '../../core/storage/store';
import { validateProfile } from '../../core/storage/migrate';

function download(profile: LearningProfile): void {
  const root = { storageVersion: STORAGE_VERSION, profile };
  const blob = new Blob([JSON.stringify(root, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  a.href = url;
  a.download = `algoplayground-learning-${ymd}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function DataCard() {
  const store = getLearningStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<LearningProfile | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const onExport = () => {
    download(store.getProfile());
  };

  const onFileChosen = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as { storageVersion?: number; profile?: unknown };
      if (parsed?.storageVersion !== STORAGE_VERSION) {
        setNotice(`导入失败：不支持的版本（${String(parsed?.storageVersion)}）。`);
        return;
      }
      setPendingImport(validateProfile(parsed.profile));
      setNotice(null);
    } catch {
      setNotice('导入失败：文件不是有效的学习数据 JSON。');
    }
  };

  const confirmImport = () => {
    if (!pendingImport) return;
    store.replaceProfile(pendingImport);
    setPendingImport(null);
    setNotice('导入成功，学习数据已覆盖。');
  };

  const onReset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    store.resetLearningData();
    setConfirmReset(false);
    setNotice('学习数据已重置。');
  };

  return (
    <section className="card progress-section" aria-label="数据管理">
      <h2>数据管理</h2>
      <p className="data-hint">导出或导入你的学习数据（JSON 文件）；重置只清除 AlgoPlayground 自己的数据，不影响浏览器中其他内容。</p>
      <div className="data-actions">
        <button type="button" className="btn" onClick={onExport}>
          导出数据
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            setNotice(null);
            fileRef.current?.click();
          }}
        >
          导入数据
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          aria-label="选择要导入的 JSON 文件"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFileChosen(f);
            e.target.value = '';
          }}
        />
        <button type="button" className={`btn${confirmReset ? ' btn-danger' : ''}`} onClick={onReset}>
          {confirmReset ? '确认重置（不可恢复）' : '重置学习数据'}
        </button>
        {confirmReset ? (
          <button type="button" className="btn" onClick={() => setConfirmReset(false)}>
            取消
          </button>
        ) : null}
      </div>
      {notice ? (
        <p className="data-notice" role="status" aria-live="polite">
          {notice}
        </p>
      ) : null}
      {pendingImport ? (
        <div className="data-import-confirm" role="alert">
          <p>导入将覆盖当前全部学习数据（进度 / Quiz / 预测 / 挑战 / 笔记 / 收藏 / 图预设）。</p>
          <button type="button" className="btn btn-primary" onClick={confirmImport}>
            确认导入
          </button>
          <button type="button" className="btn" onClick={() => setPendingImport(null)}>
            取消
          </button>
        </div>
      ) : null}
    </section>
  );
}

/** 导入文件的最小结构检查（供测试复用） */
export function looksLikeLearningJson(text: string): boolean {
  try {
    const parsed = JSON.parse(text) as { storageVersion?: unknown };
    return parsed.storageVersion === STORAGE_VERSION;
  } catch {
    return false;
  }
}
