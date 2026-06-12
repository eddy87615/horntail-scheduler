import type { ReactNode } from 'react';
import { LogOut } from 'lucide-react';
import { CalendarDays } from 'lucide-react';
import type { User } from '../lib/types';
import './Shell.css';

interface ShellProps {
  children: ReactNode;
  user?: User | null;
  onHome?: () => void;
  onLogout?: () => void;
}

export function Shell({ children, user, onHome, onLogout }: ShellProps) {
  return (
    <div className="shell">
      <div className="shell-container">
        <div className="shell-header">
          <button onClick={onHome} className="shell-brand">
            <div className="shell-logo">
              <CalendarDays
                className="icon-5"
                strokeWidth={1.5}
                stroke="#111111"
              />
            </div>
            <div className="shell-brand-text">
              <h1 className="shell-title">Artale遠征隊・出征排程</h1>
              <p className="shell-subtitle">菜雞工程師只敢改css。</p>
            </div>
          </button>
          {user && (
            <div className="shell-user">
              <span className="shell-username hide-sm">{user.name}</span>
              <button onClick={onLogout} className="shell-logout">
                <LogOut className="icon-4" />
                <span className="hide-sm">登出</span>
              </button>
            </div>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
