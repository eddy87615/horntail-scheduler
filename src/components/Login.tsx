import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { store, userKey, hashPw } from '../lib/store';
import { JOBS } from '../lib/jobs';
import type { UserRecord } from '../lib/types';
import './Login.css';

interface LoginProps {
  onLogin: (name: string) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [name, setName] = useState('');
  const [jobId, setJobId] = useState(JOBS[0].id);
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const nick = name.trim();
    if (!nick || !pw) {
      setErr('請輸入名字與密碼');
      return;
    }
    const job = JOBS.find((j) => j.id === jobId);
    // identity shown everywhere is "暱稱-職業"
    const fullName = job ? `${nick}-${job.name}` : nick;
    setBusy(true);
    setErr('');
    const rec = await store.get<UserRecord>(userKey(fullName));
    const h = await hashPw(pw);
    if (rec) {
      if (rec.hash !== h) {
        setErr('密碼錯誤');
        setBusy(false);
        return;
      }
    } else {
      await store.set(userKey(fullName), {
        name: fullName,
        hash: h,
        createdAt: Date.now(),
      });
    }
    setBusy(false);
    onLogin(fullName);
  };

  return (
    <div className="login">
      <div className="login-card">
        <div className="login-heading">
          <KeyRound className="icon-4" strokeWidth={1.5} />
          <h2 className="login-heading-text">登入 / 註冊</h2>
        </div>
        <p className="login-hint">
          設定名字與密碼,之後這台裝置免再輸入。新名字會自動建立。
        </p>
        <div className="login-form">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="角色名 / 暱稱"
            className="input"
          />
          <select
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
            className="input login-select"
          >
            {JOBS.map((j) => (
              <option key={j.id} value={j.id}>
                {j.name}
              </option>
            ))}
          </select>
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="簡單密碼"
            className="input"
          />
          {err && <p className="login-error">{err}</p>}
          <button
            disabled={busy}
            onClick={submit}
            className="btn btn-amber login-submit"
          >
            {busy ? '處理中…' : '進入'}
          </button>
        </div>
        <p className="login-note">密碼僅作資料區別使用,請勿使用重要密碼。</p>
      </div>
    </div>
  );
}
