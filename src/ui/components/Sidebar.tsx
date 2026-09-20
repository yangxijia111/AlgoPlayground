/**
 * 左侧导航：算法分类与算法列表（注册表驱动）。
 */
import { NavLink } from 'react-router-dom';
import { CATEGORIES, algorithmsByCategory } from '../../core/registry';

export function Sidebar() {
  return (
    <nav className="sidebar" aria-label="算法分类导航">
      <NavLink to="/" className={({ isActive }) => `sidebar-home${isActive ? ' is-active' : ''}`}>
        首页
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
