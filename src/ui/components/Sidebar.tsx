/**
 * 左侧导航：顶部页面入口 + 算法分类与列表（注册表驱动）。
 * 算法条目旁显示掌握度状态点（学习中蓝 / 接近掌握黄 / 已掌握绿 / 未开始灰）。
 */
import { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { CATEGORIES, algorithmsByCategory } from '../../core/registry';
import { useLearningProfile } from '../hooks/useLearningProfile';
import { computeMastery } from '../../core/progress/mastery';
import type { MasteryLevel } from '../../core/progress/mastery';

const DOT_CLASS: Partial<Record<MasteryLevel, string>> = {
  learning: 'is-started',
  practicing: 'is-started',
  almost: 'is-started is-almost',
  mastered: 'is-started is-mastered',
};

const LEVEL_LABEL: Record<MasteryLevel, string> = {
  'not-started': '未开始',
  learning: '学习中',
  practicing: '练习中',
  almost: '接近掌握',
  mastered: '已掌握',
};

export function Sidebar() {
  const profile = useLearningProfile();
  const levels = useMemo(() => {
    const out = new Map<string, MasteryLevel>();
    for (const cat of CATEGORIES) {
      for (const entry of algorithmsByCategory(cat.id)) {
        const p = profile.progress[entry.meta.id];
        out.set(entry.meta.id, p ? computeMastery(p).level : 'not-started');
      }
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
      <NavLink to="/challenges" className={({ isActive }) => `sidebar-link${isActive ? ' is-active' : ''}`}>
        ⚡ 挑战
      </NavLink>
      <NavLink to="/progress" className={({ isActive }) => `sidebar-link${isActive ? ' is-active' : ''}`}>
        📈 进度
      </NavLink>
      <NavLink to="/glossary" className={({ isActive }) => `sidebar-link${isActive ? ' is-active' : ''}`}>
        📖 术语表
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
              {algos.map((a) => {
                const level = levels.get(a.meta.id) ?? 'not-started';
                return (
                  <li key={a.meta.id}>
                    <NavLink to={`/${cat.id}/${a.meta.id}`} className={({ isActive }) => `sidebar-link${isActive ? ' is-active' : ''}`}>
                      <span
                        className={`sidebar-state-dot${DOT_CLASS[level] ? ` ${DOT_CLASS[level]}` : ''}`}
                        aria-label={LEVEL_LABEL[level]}
                      />
                      {a.meta.name}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
