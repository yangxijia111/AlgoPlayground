/**
 * 应用根组件：全局布局（顶栏 + 左侧导航 + 主区）与路由。
 */
import { useEffect } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { Sidebar } from './ui/components/Sidebar';
import { ErrorBoundary } from './ui/components/ErrorBoundary';
import AlgorithmPage from './ui/pages/AlgorithmPage';
import ComparePage from './ui/pages/ComparePage';
import Home from './ui/pages/Home';
import LearnPage from './ui/pages/LearnPage';
import ConceptPage from './ui/pages/ConceptPage';
import GlossaryPage from './ui/pages/GlossaryPage';
import { useTheme } from './ui/hooks/useTheme';
import { useLearningProfile } from './ui/hooks/useLearningProfile';
import { getLearningStore } from './core/storage/store';

export default function App() {
  const { theme, toggle } = useTheme();
  const profile = useLearningProfile();
  const store = getLearningStore();
  const beginnerMode = profile.settings.beginnerMode;

  // 学习数据：页面隐藏/关闭前立即持久化（平时 300ms 防抖写盘）
  useEffect(() => {
    const store = getLearningStore();
    const flush = () => store.flush();
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', flush);
    return () => {
      window.removeEventListener('beforeunload', flush);
      document.removeEventListener('visibilitychange', flush);
      store.flush();
    };
  }, []);

  return (
    <HashRouter>
      <div className="app-shell">
        <header className="app-header">
          <a className="app-brand" href="#/">
            <span className="app-brand-mark">▶</span> AlgoPlayground
          </a>
          <span className="app-tagline">交互式算法可视化学习平台</span>
          <button
            type="button"
            className={`btn btn-icon beginner-toggle${beginnerMode ? ' is-on' : ''}`}
            onClick={() => store.setBeginnerMode(!beginnerMode)}
            aria-pressed={beginnerMode}
            aria-label={beginnerMode ? '切换到标准模式' : '切换到新手模式（Beginner Mode）'}
            title={beginnerMode ? '新手模式：已开启（每步显示详细解释）' : '新手模式：关闭'}
          >
            🎓 新手
          </button>
          <button
            type="button"
            className="btn btn-icon theme-toggle"
            onClick={toggle}
            aria-label={theme === 'dark' ? '切换到浅色主题' : '切换到深色主题'}
            title="切换主题"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </header>
        <div className="app-body">
          <Sidebar />
          <main className="app-main" id="main">
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/learn" element={<LearnPage />} />
                <Route path="/learn/concept/:conceptId" element={<ConceptPage />} />
                <Route path="/glossary" element={<GlossaryPage />} />
                <Route path="/compare" element={<ComparePage />} />
                <Route path="/:category/:algoId" element={<AlgorithmPage />} />
                <Route
                  path="*"
                  element={
                    <div className="page-missing">
                      <h2>页面不存在</h2>
                      <p>请从左侧选择一个算法。</p>
                    </div>
                  }
                />
              </Routes>
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </HashRouter>
  );
}
