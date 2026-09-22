/**
 * 首页：平台介绍 + 分类入口卡片。
 */
import { Link } from 'react-router-dom';
import { CATEGORIES, algorithmsByCategory } from '../../core/registry';
import { WelcomeCard } from '../components/WelcomeCard';

export default function Home() {
  return (
    <div className="home">
      <WelcomeCard />
      <section className="home-hero">
        <h1>AlgoPlayground</h1>
        <p className="home-tagline">
          把数据结构与算法的执行过程变成可播放、可暂停、可逐步回看的动画教材。
          选择左侧任意算法开始探索，或从下面的分类进入。
        </p>
        <p className="home-hints">
          快捷键：<kbd>空格</kbd> 播放/暂停 · <kbd>←</kbd>/<kbd>→</kbd> 单步 · <kbd>R</kbd> 重播
        </p>
      </section>

      <div className="home-grid">
        <section className="card home-card home-card--compare">
          <h2>比较模式</h2>
          <ul>
            <li>
              <Link to="/compare">
                排序比较模式
                <span className="home-card-sub">Compare Sorting</span>
              </Link>
            </li>
          </ul>
          <p className="home-card-note">同一组数据，最多 3 种排序算法同步播放对比。</p>
        </section>
        {CATEGORIES.map((cat) => {
          const algos = algorithmsByCategory(cat.id);
          if (algos.length === 0) return null;
          return (
            <section key={cat.id} className="card home-card">
              <h2>{cat.name}</h2>
              <ul>
                {algos.map((a) => (
                  <li key={a.meta.id}>
                    <Link to={`/${cat.id}/${a.meta.id}`}>
                      {a.meta.name}
                      <span className="home-card-sub">{a.meta.enName}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
