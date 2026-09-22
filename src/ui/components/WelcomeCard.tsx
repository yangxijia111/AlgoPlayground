/**
 * First Run Welcome：单屏欢迎卡片，仅首次访问显示（settings.welcomeDone）。
 * 可 Skip、可键盘操作（Esc 关闭）；不做多屏强制 Tutorial。
 */
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getLearningStore } from '../../core/storage/store';
import { useLearningProfile } from '../hooks/useLearningProfile';

export function WelcomeCard() {
  const store = getLearningStore();
  const profile = useLearningProfile();
  const open = !profile.settings.welcomeDone;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') store.markWelcomeDone();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, store]);

  if (!open) return null;

  const dismiss = () => store.markWelcomeDone();

  return (
    <div className="welcome-overlay" role="dialog" aria-modal="true" aria-label="欢迎使用 AlgoPlayground">
      <div className="welcome-card card">
        <h1>
          <span aria-hidden="true">▶</span> 欢迎来到 AlgoPlayground
        </h1>
        <p className="welcome-lead">
          把数据结构与算法的执行过程变成<strong>可播放、可暂停、可逐步回看</strong>的动画教材。
          全部学习数据只保存在你的浏览器本地，无需注册。
        </p>
        <ul className="welcome-points">
          <li>
            🎓 <strong>学习路线</strong>：为初学者编排的 13 章路线，从「算法是什么」一路到动态规划。
          </li>
          <li>
            🤔 <strong>主动学习</strong>：开启新手模式看逐步详解；用「预测模式」猜算法的下一步；做随堂小测和挑战。
          </li>
          <li>
            📈 <strong>进度与复习</strong>：掌握度、笔记、收藏自动保存在本地，随时回来看。
          </li>
        </ul>
        <div className="welcome-actions">
          <Link className="btn btn-primary" to="/learn" onClick={dismiss}>
            从学习路线开始
          </Link>
          <Link className="btn" to="/sorting/bubble-sort" onClick={dismiss}>
            直接看冒泡排序
          </Link>
          <button type="button" className="btn" onClick={dismiss}>
            跳过
          </button>
        </div>
      </div>
    </div>
  );
}
