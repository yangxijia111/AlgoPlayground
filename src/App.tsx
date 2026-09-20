/**
 * 应用根组件：全局布局（顶栏 + 左侧导航 + 主区）与路由。
 */
import { HashRouter, Route, Routes } from 'react-router-dom';
import { Sidebar } from './ui/components/Sidebar';
import AlgorithmPage from './ui/pages/AlgorithmPage';
import Home from './ui/pages/Home';

export default function App() {
  return (
    <HashRouter>
      <div className="app-shell">
        <header className="app-header">
          <a className="app-brand" href="#/">
            <span className="app-brand-mark">▶</span> AlgoPlayground
          </a>
          <span className="app-tagline">交互式算法可视化学习平台</span>
        </header>
        <div className="app-body">
          <Sidebar />
          <main className="app-main" id="main">
            <Routes>
              <Route path="/" element={<Home />} />
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
          </main>
        </div>
      </div>
    </HashRouter>
  );
}
