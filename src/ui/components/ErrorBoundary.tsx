/**
 * 全局错误边界：页面渲染抛出异常时展示友好的兜底 UI，
 * 避免公开 Demo 出现整页白屏。不在此处打印日志（保持零 console 约定）。
 */
import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo): void {
    // 兜底 UI 已向用户呈现；保持静默以遵守项目零 console 约定
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="page-missing" role="alert">
          <h2>页面出错了</h2>
          <p>算法可视化过程中发生了意外错误，其他页面仍可正常使用。</p>
          <button type="button" className="btn" onClick={this.handleReload}>
            重新加载页面
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
