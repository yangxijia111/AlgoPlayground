/**
 * 应用根组件：全局布局（顶栏 + 左侧导航 + 主区）与路由。
 */
import { HashRouter, Route, Routes } from 'react-router-dom';
import { Sidebar } from './ui/components/Sidebar';
import { ErrorBoundary } from './ui/components/ErrorBoundary';
import AlgorithmPage from './ui/pages/AlgorithmPage';
import ComparePage from './ui/pages/ComparePage';
import Home from './ui/pages/Home';
import { useTheme } from './ui/hooks/useTheme';

export default function App() {
  const { theme, toggle } = useTheme();
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
