import { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { WD, pad, isoDate } from '../lib/date';
import { BOSSES } from '../lib/bosses';
import type { RaidEvent } from '../lib/types';
import './CreateEvent.css';

interface CreateEventProps {
  onCancel: () => void;
  onCreated: (ev: RaidEvent) => void;
}

export function CreateEvent({ onCancel, onCreated }: CreateEventProps) {
  const today = new Date();
  const [title, setTitle] = useState('');
  const [bossId, setBossId] = useState(BOSSES[0].id);
  const [cursor, setCursor] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [startH, setStartH] = useState(20);
  const [endH, setEndH] = useState(24);
  const [step, setStep] = useState(30);

  const days = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startPad = first.getDay();
    const dim = new Date(
      cursor.getFullYear(),
      cursor.getMonth() + 1,
      0,
    ).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= dim; d++)
      cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    return cells;
  }, [cursor]);

  const toggleDay = (d: Date) => {
    const k = isoDate(d);
    setSelected((p) => {
      const n = new Set(p);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });
  };
  const sortedDates = useMemo(() => [...selected].sort(), [selected]);

  // end can cross midnight: options are start+1 .. start+18 (display +1 for >=24)
  const endOptions = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => startH + 1 + i).filter(
        (h) => h <= 36,
      ),
    [startH],
  );
  useEffect(() => {
    if (endH <= startH) setEndH(startH + 4);
  }, [startH]); // eslint-disable-line react-hooks/exhaustive-deps

  const valid = title.trim() && sortedDates.length > 0 && endH > startH;

  return (
    <div>
      <button onClick={onCancel} className="create-back">
        <ArrowLeft className="icon-4" /> 返回
      </button>
      <div className="create-grid">
        <div className="create-settings">
          <div>
            <label className="field-label">遠征名稱</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="穩如老狗的我們"
              className="input"
            />
          </div>
          <div>
            <label className="field-label">要挑戰的王</label>
            <div className="boss-picker">
              {BOSSES.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBossId(b.id)}
                  className={`boss-option${bossId === b.id ? ' is-selected' : ''}`}
                >
                  <div className="boss-option-imgwrap">
                    <img src={b.img} alt={b.name} className="boss-option-img" />
                  </div>
                  <span className="boss-option-name">{b.name}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="field-label">出征時段</label>
            <div className="create-time-row">
              <select
                value={startH}
                onChange={(e) => setStartH(Number(e.target.value))}
                className="create-select"
              >
                {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                  <option key={h} value={h}>
                    {pad(h)}:00
                  </option>
                ))}
              </select>
              <span className="create-time-sep">至</span>
              <select
                value={endH}
                onChange={(e) => setEndH(Number(e.target.value))}
                className="create-select"
              >
                {endOptions.map((h) => (
                  <option key={h} value={h}>
                    {pad(h % 24)}:00{h >= 24 ? '(+1)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <p className="create-hint">結束時間標 (+1) 表示跨到隔天凌晨</p>
            <p className="create-hint">選取要打的當週所有日期</p>
          </div>
          <div>
            <label className="field-label">時段間隔</label>
            <div className="create-step-row">
              {[30, 60].map((s) => (
                <button
                  key={s}
                  onClick={() => setStep(s)}
                  className={`create-step-btn${step === s ? ' is-active' : ''}`}
                >
                  {s} 分鐘
                </button>
              ))}
            </div>
          </div>
        </div>
        <div>
          <label className="field-label">
            選擇日期(可複選)— 已選 {selected.size} 天
          </label>
          <div className="create-calendar">
            <div className="create-cal-nav">
              <button
                onClick={() =>
                  setCursor(
                    new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1),
                  )
                }
                className="create-cal-navbtn"
              >
                <ChevronLeft className="icon-4" />
              </button>
              <span className="create-cal-month">
                {cursor.getFullYear()} 年 {cursor.getMonth() + 1} 月
              </span>
              <button
                onClick={() =>
                  setCursor(
                    new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1),
                  )
                }
                className="create-cal-navbtn"
              >
                <ChevronRight className="icon-4" />
              </button>
            </div>
            <div className="create-cal-weekdays">
              {WD.map((w) => (
                <div key={w} className="create-cal-weekday">
                  {w}
                </div>
              ))}
            </div>
            <div className="create-cal-days">
              {days.map((d, i) => {
                if (!d) return <div key={i} />;
                const k = isoDate(d),
                  sel = selected.has(k);
                return (
                  <button
                    key={k}
                    onClick={() => toggleDay(d)}
                    className={`create-cal-day${sel ? ' is-selected' : ''}`}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <button
        disabled={!valid}
        onClick={() =>
          onCreated({
            id: `${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`.toUpperCase(),
            title: title.trim(),
            bossId,
            dates: sortedDates,
            startH,
            endH,
            step,
            participants: [],
            createdAt: Date.now(),
          })
        }
        className={`create-submit ${valid ? 'btn btn-amber' : 'btn btn-inactive'}`}
      >
        建立遠征
      </button>
    </div>
  );
}
