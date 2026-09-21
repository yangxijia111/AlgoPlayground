/**
 * 左侧导航：顶部页面入口 + 算法分类与列表（注册表驱动）。
 * 算法条目旁显示学习状态圆点（已访问=实心绿点；P10-6 起升级为掌握度等级色）。
 */
import { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { CATEGORIES, algorithmsByCategory } from '../../core/registry';
import { useLearningProfile } from '../hooks/useLearningProfile';

export function Sidebar() {
  const profile = useLearningProfile();
  const viewed = useMemo(() => {
    const out = new Set<string>();
    for (const [k, v] of Object.entries(profile.progress)) {
      if (v.viewCount >= 1) out.add(k);
    }
    return out;
  }, [profile]);

  return (
    <nav className="sidebar" aria-label="站点导航">
      <NavLink to="/" className={({ isActive }) => `sidebar-home${isActive ? ' is-active' : ''}`}>
        首页
      </NavLink>
      <NavLink to="/learn" className={({ isActive }) => `sidebar-link sidebar-feature${isActive ? ' is-active' : ''}`}>
        🎓 学习路线
      </NavLink>
      <NavLink to="/compare" className={({ isActive }) => `sidebar-link sidebar-compare${isActive ? ' is-active' : ''}`}>
        ⚔ 排序比较模式
      </NavLink>
      {CATEGORIES.map((cat) => {
        const algos = algorithmsByCategory(cat.id);
        if (algos.length === 0) return null;
        return (
          <div key={cat.id} className="sidebar-group">
            <div className="sidebar-group-title">{cat.name}</div>
            <ul>
              {algos.map((a) => (
                <li key={a.meta.id}>
                  <NavLink to={`/${cat.id}/${a.meta.id}`} className={({ isActive }) => `sidebar-link${isActive ? ' is-active' : ''}`}>
                    <span
                      className={`sidebar-state-dot${viewed.has(a.meta.id) ? ' is-started' : ''}`}
                      aria-label={viewed.has(a.meta.id) ? '学习中' : '未开始'}
                    />
                    {a.meta.name}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
