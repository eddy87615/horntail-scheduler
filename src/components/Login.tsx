import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { store, userKey, hashPw } from '../lib/store';
import { JOBS, jobById } from '../lib/jobs';
import type { UserRecord } from '../lib/types';
import './Login.css';

interface LoginProps {
  onLogin: (name: string) => void;
}

type Mode = 'login' | 'register';

// identity shown everywhere is "暱稱-職業"
const fullName = (rec: Pick<UserRecord, 'name' | 'jobId'>) => {
  const job = jobById(rec.jobId);
  return job ? `${rec.name}-${job.name}` : rec.name;
};

// load every account (password is the login key, so we look accounts up by hash)
async function allUsers(): Promise<UserRecord[]> {
  const keys = await store.list('user:');
  const recs = await Promise.all(keys.map((k) => store.get<UserRecord>(k)));
  return recs.filter(Boolean) as UserRecord[];
}

export function Login({ onLogin }: LoginProps) {
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [jobId, setJobId] = useState(JOBS[0].id);
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const login = async () => {
    if (!pw) {
      setErr('請輸入密碼');
      return;
    }
    setBusy(true);
    setErr('');
    const h = await hashPw(pw);
    const match = (await allUsers()).find((u) => u.hash === h);
    setBusy(false);
    if (!match) {
      setErr('密碼錯誤,或尚未註冊');
      return;
    }
    onLogin(fullName(match));
  };

  const register = async () => {
    const nick = name.trim();
    if (!nick || !pw) {
      setErr('請輸入暱稱與密碼');
      return;
    }
    setBusy(true);
    setErr('');
    const h = await hashPw(pw);
    const users = await allUsers();
    if (users.some((u) => u.name === nick)) {
      setErr('此暱稱已被註冊');
      setBusy(false);
      return;
    }
    if (users.some((u) => u.hash === h)) {
      // password is the login key, so it must be unique
      setErr('此密碼已被使用,請換一個');
      setBusy(false);
      return;
    }
    const rec: UserRecord = { name: nick, jobId, hash: h, createdAt: Date.now() };
    await store.set(userKey(nick), rec);
    setBusy(false);
    onLogin(fullName(rec));
  };

  const submit = () => (mode === 'login' ? login() : register());

  const switchMode = (m: Mode) => {
    setMode(m);
    setErr('');
  };

  return (
    <div className="login">
      <div className="login-card">
        <div className="login-heading">
          <KeyRound className="icon-4" strokeWidth={1.5} />
          <h2 className="login-heading-text">龍王遠征隊</h2>
        </div>

        <div className="login-tabs">
          <button
            className={`login-tab${mode === 'login' ? ' is-active' : ''}`}
            onClick={() => switchMode('login')}
          >
            登入
          </button>
          <button
            className={`login-tab${mode === 'register' ? ' is-active' : ''}`}
            onClick={() => switchMode('register')}
          >
            註冊
          </button>
        </div>

        <p className="login-hint">
          {mode === 'login'
            ? '只要輸入你的密碼即可登入。'
            : '設定暱稱、職業與密碼。密碼是你的登入鑰匙,請設一個不會跟別人重複的。'}
        </p>

        <div className="login-form">
          {mode === 'register' && (
            <>
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
            </>
          )}
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="密碼"
            className="input"
          />
          {err && <p className="login-error">{err}</p>}
          <button
            disabled={busy}
            onClick={submit}
            className="btn btn-amber login-submit"
          >
            {busy ? '處理中…' : mode === 'login' ? '登入' : '註冊並進入'}
          </button>
        </div>
        <p className="login-note">密碼僅作資料區別使用,請勿使用重要密碼。</p>
      </div>
    </div>
  );
}
