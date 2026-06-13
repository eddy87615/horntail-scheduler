import { useState } from 'react';
import { Calendar, Plus, Users, Clock, Trash2 } from 'lucide-react';
import { hasStore } from '../lib/store';
import { bossById } from '../lib/bosses';
import { pad, timeLabel, fmtDateShort, isoDate } from '../lib/date';
import type { RaidEvent } from '../lib/types';
import type { AuditEntry, AuditAction } from '../lib/audit';
import './Home.css';

const ACTION_LABEL: Record<AuditAction, string> = {
  create: '建立',
  delete: '刪除',
  restore: '還原',
  purge: '永久刪除',
  unlock: '解除鎖定',
  relock: '重新鎖定',
};

interface HomeProps {
  loading: boolean;
  events: RaidEvent[];
  logs: AuditEntry[];
  userName: string;
  onCreate: () => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
  onPurge: (id: string) => void;
}

export function Home({
  loading,
  events,
  logs,
  userName,
  onCreate,
  onOpen,
  onDelete,
  onRestore,
  onPurge,
}: HomeProps) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [purgeId, setPurgeId] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [code, setCode] = useState('');
  const [codeErr, setCodeErr] = useState('');

  const active = events.filter((e) => !e.deleted);
  const trashed = events.filter((e) => e.deleted);
  const canManage = (ev: RaidEvent) => !ev.ownerName || ev.ownerName === userName;

  const joinByCode = () => {
    const c = code.trim();
    if (events.some((e) => e.id === c)) {
      onOpen(c);
      return;
    }
    setCodeErr('找不到這組代碼的遠征');
  };

  return (
    <div>
      <div className="home-toolbar">
        <h2 className="home-toolbar-title">
          <Calendar className="icon-4" strokeWidth={1.5} /> 遠征列表 / 歷史紀錄
        </h2>
        <div className="home-toolbar-actions">
          <div className="home-join">
            <input
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setCodeErr('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && joinByCode()}
              placeholder="貼上遠征代碼"
              className="home-join-input"
            />
            <button onClick={joinByCode} className="home-join-btn">
              加入
            </button>
          </div>
          <button onClick={onCreate} className="btn btn-amber home-create">
            <Plus className="icon-4" strokeWidth={2.5} /> 開新遠征
          </button>
        </div>
      </div>
      {codeErr && <p className="home-code-err">{codeErr}</p>}

      {loading ? (
        <p className="home-loading">載入中…</p>
      ) : active.length === 0 ? (
        <div className="home-empty">
          <p className="home-empty-text">還沒有任何遠征。</p>
          <button onClick={onCreate} className="home-empty-link">
            開第一場 →
          </button>
        </div>
      ) : (
        <div className="home-grid">
          {active.map((ev) => (
            <div key={ev.id} className="home-card">
              <button onClick={() => onOpen(ev.id)} className="home-card-open">
                <div className="home-card-head">
                  {bossById(ev.bossId) && (
                    <img
                      src={bossById(ev.bossId)!.img}
                      alt={bossById(ev.bossId)!.name}
                      className="home-card-boss-img"
                    />
                  )}
                  <div className="home-card-headtext">
                    <h3 className="home-card-title">{ev.title}</h3>
                    {bossById(ev.bossId) && (
                      <span className="home-card-boss-name">
                        {bossById(ev.bossId)!.name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="home-card-meta">
                  <span className="home-card-meta-item">
                    <Calendar className="icon-3-5" strokeWidth={1.5} />
                    {ev.dates.length} 天
                  </span>
                  <span className="home-card-meta-item">
                    <Clock className="icon-3-5" strokeWidth={1.5} />
                    {pad(ev.startH % 24)}:00–{timeLabel(pad(ev.endH) + ':00')}
                  </span>
                  <span className="home-card-meta-item">
                    <Users className="icon-3-5" strokeWidth={1.5} />
                    {(ev.participants || []).length} 人
                  </span>
                  {ev.deadline &&
                    (isoDate(new Date()) > ev.deadline && !ev.unlocked ? (
                      <span className="home-card-meta-item is-closed">
                        已截止
                      </span>
                    ) : (
                      <span className="home-card-meta-item">
                        截止 {fmtDateShort(ev.deadline)}
                      </span>
                    ))}
                </div>
              </button>
              {canManage(ev) &&
                (confirmId === ev.id ? (
                  <div className="home-card-confirm">
                    <button
                      onClick={() => {
                        onDelete(ev.id);
                        setConfirmId(null);
                      }}
                      className="home-card-confirm-del"
                    >
                      刪除
                    </button>
                    <button
                      onClick={() => setConfirmId(null)}
                      className="home-card-confirm-cancel"
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmId(ev.id)}
                    className="home-card-trash"
                  >
                    <Trash2 className="icon-4" />
                  </button>
                ))}
            </div>
          ))}
        </div>
      )}

      {trashed.length > 0 && (
        <div className="home-trash">
          <h2 className="home-trash-title">
            <Trash2 className="icon-4" strokeWidth={1.5} /> 已刪除（{trashed.length}）
          </h2>
          <div className="home-trash-list">
            {trashed.map((ev) => (
              <div key={ev.id} className="home-trash-item">
                <span className="home-trash-name">{ev.title}</span>
                {canManage(ev) && (
                  <span className="home-trash-actions">
                    <button
                      onClick={() => onRestore(ev.id)}
                      className="home-trash-restore"
                    >
                      還原
                    </button>
                    {purgeId === ev.id ? (
                      <>
                        <button
                          onClick={() => {
                            onPurge(ev.id);
                            setPurgeId(null);
                          }}
                          className="home-card-confirm-del"
                        >
                          確定永久刪除
                        </button>
                        <button
                          onClick={() => setPurgeId(null)}
                          className="home-card-confirm-cancel"
                        >
                          取消
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setPurgeId(ev.id)}
                        className="home-trash-purge"
                      >
                        永久刪除
                      </button>
                    )}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {logs.length > 0 && (
        <div className="home-log">
          <button
            className="home-log-toggle"
            onClick={() => setShowLogs((v) => !v)}
          >
            操作紀錄（{logs.length}）{showLogs ? '▲' : '▼'}
          </button>
          {showLogs && (
            <div className="home-log-list">
              {logs.map((l) => (
                <div key={l.id} className="home-log-item">
                  <span className="home-log-time">
                    {new Date(l.at).toLocaleString()}
                  </span>
                  <span className="home-log-by">{l.by}</span>
                  <span className="home-log-action">
                    {ACTION_LABEL[l.action] ?? l.action}
                  </span>
                  <span className="home-log-target">
                    {l.eventTitle ?? l.eventId}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!hasStore && (
        <p className="home-preview-note">
          尚未連接雲端共享儲存(Supabase),資料只存在這台裝置的瀏覽器,隊員之間不會同步。
        </p>
      )}
    </div>
  );
}
