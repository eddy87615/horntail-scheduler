import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  Save,
  ArrowLeft,
  Check,
  Crown,
  Share2,
  Copy,
  Users,
} from 'lucide-react';
import { store, eventKey, availKey } from '../lib/store';
import {
  buildSlots,
  fmtDateShort,
  fmtWeekday,
  timeLabel,
  cellKey,
  pad,
} from '../lib/date';
import { heatColor } from '../lib/heatmap';
import { groupBest } from '../lib/schedule';
import { bossById } from '../lib/bosses';
import type { RaidEvent, AvailRecord, User } from '../lib/types';
import { CellDetail } from './CellDetail';
import './EventView.css';

interface EventViewProps {
  eventId: string;
  user: User;
  onBack: () => void;
  onParticipantsChange?: () => void;
}

export function EventView({
  eventId,
  user,
  onBack,
  onParticipantsChange,
}: EventViewProps) {
  const [ev, setEv] = useState<RaidEvent | null>(null);
  const [avails, setAvails] = useState<Record<string, Set<string>>>({});
  const [tab, setTab] = useState<'mine' | 'overview'>('mine');
  const [mySlots, setMySlots] = useState<Set<string>>(() => new Set());
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hoverCell, setHoverCell] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const slots = useMemo(
    () => (ev ? buildSlots(ev.startH, ev.endH, ev.step) : []),
    [ev],
  );

  const loadAll = useCallback(async () => {
    setLoading(true);
    const e = await store.get<RaidEvent>(eventKey(eventId));
    setEv(e);
    if (e) {
      const keys = await store.list(`avail:${eventId}:`);
      const list = (
        await Promise.all(keys.map((k) => store.get<AvailRecord>(k)))
      ).filter(Boolean) as AvailRecord[];
      const map: Record<string, Set<string>> = {};
      list.forEach((a) => {
        map[a.name] = new Set(a.slots);
      });
      setAvails(map);
      if (map[user.name]) setMySlots(new Set(map[user.name]));
    }
    setLoading(false);
  }, [eventId, user.name]);
  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const dragging = useRef(false);
  const dragMode = useRef<'add' | 'remove'>('add');
  useEffect(() => {
    const up = () => {
      dragging.current = false;
    };
    window.addEventListener('pointerup', up);
    return () => window.removeEventListener('pointerup', up);
  }, []);
  const applyCell = (key: string, mode: 'add' | 'remove') => {
    setMySlots((prev) => {
      const n = new Set(prev);
      mode === 'add' ? n.add(key) : n.delete(key);
      return n;
    });
    setSaved(false);
  };
  const onCellDown = (key: string) => {
    dragMode.current = mySlots.has(key) ? 'remove' : 'add';
    dragging.current = true;
    applyCell(key, dragMode.current);
  };
  const onCellEnter = (key: string) => {
    if (dragging.current) applyCell(key, dragMode.current);
  };

  const saveMine = async () => {
    await store.set(availKey(eventId, user.name), {
      name: user.name,
      slots: [...mySlots],
      updatedAt: Date.now(),
    });
    if (ev && !(ev.participants || []).includes(user.name)) {
      const updated = {
        ...ev,
        participants: [...(ev.participants || []), user.name],
      };
      await store.set(eventKey(eventId), updated);
      setEv(updated);
      onParticipantsChange?.();
    }
    setAvails((p) => ({ ...p, [user.name]: new Set(mySlots) }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const share = async () => {
    try {
      await navigator.clipboard.writeText(eventId);
    } catch {
      /* clipboard unavailable */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const people = Object.keys(avails);
  const total = people.length;
  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    people.forEach((n) =>
      avails[n].forEach((k) => {
        m[k] = (m[k] || 0) + 1;
      }),
    );
    return m;
  }, [avails]); // eslint-disable-line react-hooks/exhaustive-deps
  const bestCells = useMemo(() => {
    const e = Object.entries(counts);
    if (!e.length) return [];
    const max = Math.max(...e.map(([, c]) => c));
    return e
      .filter(([, c]) => c === max)
      .map(([k]) => k)
      .sort();
  }, [counts]);
  const maxCount = bestCells.length ? counts[bestCells[0]] : 0;

  if (loading) return <p className="event-loading">載入中…</p>;
  if (!ev)
    return (
      <div className="event-missing">
        <p className="event-missing-text">找不到這場遠征。</p>
        <button onClick={onBack} className="event-missing-link">
          ← 返回列表
        </button>
      </div>
    );

  return (
    <div>
      <button onClick={onBack} className="event-back">
        <ArrowLeft className="icon-4" /> 返回列表
      </button>

      <div className="event-head">
        <div>
          <h2 className="event-title">{ev.title}</h2>
          <p className="event-meta">
            {ev.dates.length} 天 · {pad(ev.startH)}:00–{pad(ev.endH % 24)}:00
            {ev.endH >= 24 ? '(+1)' : ''} · {ev.step} 分鐘 · {total} 人已填
          </p>
        </div>
        <div className="event-head-actions">
          <button onClick={share} className="event-share">
            {copied ? (
              <>
                <Check className="icon-4" /> 已複製代碼
              </>
            ) : (
              <>
                <Share2 className="icon-4" /> 分享
              </>
            )}
          </button>
          <div className="event-tabs">
            {(
              [
                ['mine', '我的時間'],
                ['overview', '總覽彙整'],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`event-tab${tab === k ? ' is-active' : ''}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="event-code">
        <Copy className="icon-3-5 event-code-icon" />
        遠征代碼 <span className="event-code-value">{eventId}</span>—
        把代碼給隊員,在首頁「貼上遠征代碼」即可直接填寫
      </div>

      {tab === 'mine' && (
        <p className="event-mine-hint">
          以 <span className="event-mine-name">{user.name}</span> 填寫 ·
          拖曳塗選有空時段
        </p>
      )}

      <div className="event-grid-wrap">
        <div
          className="event-grid"
          style={{ touchAction: tab === 'mine' ? 'none' : 'auto' }}
        >
          <div className="event-grid-headrow">
            <div className="event-grid-timecol" />
            {ev.dates.map((d) => (
              <div key={d} className="event-grid-datehead">
                <div className="event-grid-date">{fmtDateShort(d)}</div>
                <div className="event-grid-weekday">週{fmtWeekday(d)}</div>
              </div>
            ))}
          </div>
          {slots.map((t) => (
            <div key={t} className="event-grid-row">
              <div className="event-grid-timelabel">
                {t.endsWith(':00') || ev.step >= 60 ? timeLabel(t) : ''}
              </div>
              {ev.dates.map((d) => {
                const key = cellKey(d, t);
                if (tab === 'mine') {
                  const on = mySlots.has(key);
                  return (
                    <div
                      key={key}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        onCellDown(key);
                      }}
                      onPointerEnter={() => onCellEnter(key)}
                      className={`event-cell event-cell-mine${on ? ' is-on' : ''}`}
                    />
                  );
                }
                const c = counts[key] || 0,
                  ratio = total ? c / total : 0;
                return (
                  <div
                    key={key}
                    onPointerEnter={() => setHoverCell(key)}
                    onPointerLeave={() => setHoverCell(null)}
                    className="event-cell event-cell-heat"
                    style={{ background: heatColor(ratio) }}
                  >
                    {c > 0 && <span className="event-cell-count">{c}</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {tab === 'mine' && (
        <button onClick={saveMine} className="btn btn-amber event-save">
          {saved ? (
            <>
              <Check className="icon-4" /> 已儲存
            </>
          ) : (
            <>
              <Save className="icon-4" /> 儲存我的時間
            </>
          )}
        </button>
      )}

      {tab === 'overview' && (
        <div className="event-overview">
          {bossById(ev.bossId) && (
            <div className="event-boss">
              <img
                src={bossById(ev.bossId)!.img}
                alt={bossById(ev.bossId)!.name}
                className="event-boss-img"
              />
              <div className="event-boss-info">
                <span className="event-boss-label">本場挑戰</span>
                <span className="event-boss-name">
                  {bossById(ev.bossId)!.name}
                </span>
              </div>
            </div>
          )}
          {hoverCell && (
            <CellDetail cellKey={hoverCell} people={people} avails={avails} />
          )}
          <div className="event-best">
            <h3 className="event-best-title">
              <Crown className="icon-4" strokeWidth={1.5} /> 最多人可以的時段
            </h3>
            {total === 0 ? (
              <p className="event-best-empty">還沒有人填寫時間。</p>
            ) : maxCount === 0 ? (
              <p className="event-best-empty">目前沒有任何重疊時段。</p>
            ) : (
              <>
                <p className="event-best-sub">
                  {maxCount} / {total} 人能到 · 共 {bestCells.length} 個時段
                </p>
                <div className="event-best-list">
                  {groupBest(bestCells, ev.step).map((g, i) => {
                    const missing = people.filter(
                      (n) => !avails[n].has(cellKey(g.date, g.from)),
                    );
                    return (
                      <div key={i} className="event-best-item">
                        <span className="event-best-when">
                          {fmtDateShort(g.date)}(週{fmtWeekday(g.date)}){' '}
                          {timeLabel(g.from)}–{timeLabel(g.to)}
                        </span>
                        {missing.length > 0 && (
                          <span className="event-best-missing">
                            缺:{missing.join('、')}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
          <div className="event-replies">
            <h3 className="event-replies-title">
              <Users className="icon-4" strokeWidth={1.5} /> 已回覆 ({total})
            </h3>
            {total === 0 ? (
              <p className="event-replies-empty">尚無人回覆。</p>
            ) : (
              <div className="event-replies-list">
                {people.map((n) => (
                  <span key={n} className="event-reply-chip">
                    {n}
                  </span>
                ))}
              </div>
            )}
            <p className="event-legend">
              顏色越紅代表越多人有空
              <span
                className="event-legend-bar"
                style={{
                  background: `linear-gradient(90deg, ${heatColor(0.01)}, ${heatColor(
                    0.5,
                  )}, ${heatColor(1)})`,
                }}
              />
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
