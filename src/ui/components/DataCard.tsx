/**
 * 数据管理：Export 学习数据 JSON / Import 校验导入（两步确认）/ Reset（两步确认）。
 * Import 绝不执行 JSON 中代码，只当纯数据处理；坏文件拒绝且不修改现有数据。
 * P11（STORAGE_RELIABILITY_SPEC §7）：导入前检查文件大小（1MB 上限）；
 * strict 校验（跨字段 invariant/真实日期/严格图校验），坏数据明确失败；
 * 显示持久化健康状态（write-failed / quota-exceeded 不再静默）。
 */
import { useRef, useState, useSyncExternalStore } from 'react';
import type { LearningProfile } from '../../core/learning/types';
import { STORAGE_VERSION } from '../../core/learning/types';
import { getLearningStore } from '../../core/storage/store';
import { strictValidateProfile, migrateRoot } from '../../core/storage/migrate';

/** 导入文件大小上限：超过直接拒绝，不读取内容 */
export const MAX_IMPORT_BYTES = 1_048_576; // 1MB

function download(profile: LearningProfile, revision: number): void {
  const root = { storageVersion: STORAGE_VERSION, revision, profile };
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
  const [pendingRevision, setPendingRevision] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const persistence = useSyncExternalStore(store.subscribeStatus, store.getPersistenceStatus);

  const onExport = () => {
    download(store.getProfile(), store.getRevision());
  };

  const onFileChosen = async (file: File) => {
    if (file.size > MAX_IMPORT_BYTES) {
      setNotice(`导入失败：文件超过 ${Math.floor(MAX_IMPORT_BYTES / 1024 / 1024)}MB 上限（实际 ${(file.size / 1024 / 1024).toFixed(1)}MB）。`);
      return;
    }
    try {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);
      if (typeof parsed !== 'object' || parsed === null) {
        setNotice('导入失败：文件不是有效的学习数据 JSON。');
        return;
      }
      const root = parsed as { storageVersion?: unknown; profile?: unknown; revision?: unknown };
      // v1 导出文件：先迁移到当前版本（内部 lenient 修复），再 strict 校验迁移结果
      let profileCandidate: unknown = root.profile;
      let remoteRevision = 0;
      if (root.storageVersion !== STORAGE_VERSION) {
        const migrated = migrateRoot(parsed);
        if (migrated.root === null) {
          setNotice(`导入失败：不支持的版本（${String(root.storageVersion)}）。`);
          return;
        }
        profileCandidate = migrated.root.profile;
        remoteRevision = migrated.root.revision;
      } else {
        if (typeof root.revision === 'number' && Number.isInteger(root.revision) && root.revision >= 0) {
          remoteRevision = root.revision;
        }
      }
      // strict：跨字段 invariant / 真实日期 / 严格图校验；坏数据明确失败
      const result = strictValidateProfile(profileCandidate);
      if (!result.ok) {
        setNotice(`导入失败：${result.error}`);
        return;
      }
      setPendingImport(result.profile);
      setPendingRevision(remoteRevision);
      setNotice(null);
    } catch {
      setNotice('导入失败：文件不是有效的学习数据 JSON。');
    }
  };

  const confirmImport = () => {
    if (!pendingImport) return;
    store.replaceProfile(pendingImport, pendingRevision);
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

  const persistenceBanner =
    persistence === 'memory-only'
      ? '浏览器存储不可用，本次学习记录仅保存在内存中。'
      : persistence === 'write-failed' || persistence === 'quota-exceeded'
        ? '保存失败：上次写入未持久化（可清理浏览器存储后重试）。'
        : null;

  return (
    <section className="card progress-section" aria-label="数据管理">
      <h2>数据管理</h2>
      <p className="data-hint">导出或导入你的学习数据（JSON 文件）；重置只清除 AlgoPlayground 自己的数据，不影响浏览器中其他内容。</p>
      {persistenceBanner ? (
        <p className="data-notice data-notice--warn" role="status" aria-live="polite">
          ⚠ {persistenceBanner}
        </p>
      ) : null}
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
    return parsed.storageVersion === STORAGE_VERSION || parsed.storageVersion === 1;
  } catch {
    return false;
  }
}
