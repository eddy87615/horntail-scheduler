import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Calendar, Plus, Users, Clock, Trash2, ChevronLeft, ChevronRight,
  Save, ArrowLeft, Check, Crown, Swords, LogOut, Share2, KeyRound, Copy
} from "lucide-react";

/* ----------------------------- storage layer ----------------------------- */
const hasStore = typeof window !== "undefined" && window.storage;
const mem = new Map();

const store = {
  async get(key, shared = true) {
    try {
      if (!hasStore) return mem.has(key + shared) ? mem.get(key + shared) : null;
      const r = await window.storage.get(key, shared);
      return r ? JSON.parse(r.value) : null;
    } catch { return null; }
  },
  async set(key, val, shared = true) {
    try {
      if (!hasStore) { mem.set(key + shared, val); return true; }
      await window.storage.set(key, JSON.stringify(val), shared);
      return true;
    } catch { return false; }
  },
  async del(key, shared = true) {
    try {
      if (!hasStore) { mem.delete(key + shared); return true; }
      await window.storage.delete(key, shared); return true;
    } catch { return false; }
  },
  async list(prefix, shared = true) {
    try {
      if (!hasStore) return [...mem.keys()].filter((k) => k.startsWith(prefix)).map((k) => k.slice(0, k.length - String(shared).length));
      const r = await window.storage.list(prefix, shared);
      return r?.keys || [];
    } catch { return []; }
  },
};

const enc = (s) => encodeURIComponent(s);
const eventKey = (id) => `event:${id}`;
const availKey = (eid, name) => `avail:${eid}:${enc(name)}`;
const userKey = (name) => `user:${enc(name)}`;

async function hashPw(s) {
  try {
    const b = new TextEncoder().encode(s + "::maple-raid");
    const h = await crypto.subtle.digest("SHA-256", b);
    return [...new Uint8Array(h)].map((x) => x.toString(16).padStart(2, "0")).join("");
  } catch {
    let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return "f" + (h >>> 0).toString(16);
  }
}

/* ----------------------------- date helpers ------------------------------ */
const WD = ["日", "一", "二", "三", "四", "五", "六"];
const pad = (n) => String(n).padStart(2, "0");
const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseISO = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const fmtDateShort = (s) => { const d = parseISO(s); return `${d.getMonth() + 1}/${d.getDate()}`; };
const fmtWeekday = (s) => WD[parseISO(s).getDay()];

// time strings may exceed 24:00 for overnight sessions (e.g. "25:30" = 01:30 next day)
function buildSlots(startH, endH, stepMin) {
  const out = [];
  for (let m = startH * 60; m < endH * 60; m += stepMin) out.push(`${pad(Math.floor(m / 60))}:${pad(m % 60)}`);
  return out;
}
function timeLabel(t) {
  const [h, m] = t.split(":").map(Number);
  return h >= 24 ? `${pad(h - 24)}:${pad(m)}⁺` : t;
}
const cellKey = (date, time) => `${date}|${time}`;

/* ------------------------------- heatmap --------------------------------- */
function heatColor(ratio) {
  if (ratio <= 0) return "transparent";
  const stops = [[51, 65, 85], [217, 119, 6], [234, 88, 12], [220, 38, 38]];
  const seg = ratio * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(seg));
  const t = seg - i, a = stops[i], b = stops[i + 1];
  const c = a.map((v, k) => Math.round(v + (b[k] - v) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

/* ================================ APP ==================================== */
export default function App() {
  const [user, setUser] = useState(null); // {name}
  const [booting, setBooting] = useState(true);

  const [view, setView] = useState("home");
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    (async () => {
      const sess = await store.get("session", false);
      if (sess?.name) setUser({ name: sess.name });
      setBooting(false);
    })();
  }, []);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    const keys = await store.list("event:");
    const list = (await Promise.all(keys.map((k) => store.get(k)))).filter(Boolean);
    list.sort((a, b) => b.createdAt - a.createdAt);
    setEvents(list);
    setLoading(false);
  }, []);
  useEffect(() => { if (user) loadEvents(); }, [user, loadEvents]);

  const logout = async () => { await store.del("session", false); setUser(null); setView("home"); setActiveId(null); };

  if (booting) return <Shell><p className="py-16 text-center text-sm text-slate-600">載入中…</p></Shell>;
  if (!user) return <Shell><Login onLogin={async (name) => { await store.set("session", { name }, false); setUser({ name }); }} /></Shell>;

  return (
    <Shell user={user} onHome={() => { setView("home"); setActiveId(null); }} onLogout={logout}>
      {view === "home" && (
        <Home loading={loading} events={events}
          onCreate={() => setView("create")}
          onOpen={(id) => { setActiveId(id); setView("event"); }}
          onDelete={async (id) => {
            const ev = events.find((e) => e.id === id);
            if (ev) for (const n of ev.participants || []) await store.del(availKey(id, n));
            await store.del(eventKey(id)); loadEvents();
          }} />
      )}
      {view === "create" && (
        <CreateEvent onCancel={() => setView("home")}
          onCreated={async (ev) => { await store.set(eventKey(ev.id), ev); await loadEvents(); setActiveId(ev.id); setView("event"); }} />
      )}
      {view === "event" && activeId && (
        <EventView eventId={activeId} user={user}
          onBack={() => { setView("home"); loadEvents(); }}
          onParticipantsChange={loadEvents} />
      )}
    </Shell>
  );
}

/* -------------------------------- Shell ---------------------------------- */
function Shell({ children, user, onHome, onLogout }) {
  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100" style={{ fontFamily: "'Noto Sans TC', system-ui, sans-serif" }}>
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <button onClick={onHome} className="flex items-center gap-3 outline-none">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-orange-900/40">
              <Swords className="h-5 w-5 text-slate-950" strokeWidth={2.5} />
            </div>
            <div className="text-left">
              <h1 className="text-lg font-bold leading-none tracking-tight">龍王遠征隊・出征排程</h1>
              <p className="mt-1 text-xs text-slate-500">點選大家有空的時段,自動算出最多人能出征的時間</p>
            </div>
          </button>
          {user && (
            <div className="flex items-center gap-2 text-sm">
              <span className="hidden rounded-md bg-slate-800 px-2.5 py-1 font-semibold text-amber-400 sm:inline">{user.name}</span>
              <button onClick={onLogout} className="flex items-center gap-1 rounded-md px-2 py-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
                <LogOut className="h-4 w-4" /><span className="hidden sm:inline">登出</span>
              </button>
            </div>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

/* -------------------------------- Login ---------------------------------- */
function Login({ onLogin }) {
  const [name, setName] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const n = name.trim();
    if (!n || !pw) { setErr("請輸入暱稱與密碼"); return; }
    setBusy(true); setErr("");
    const rec = await store.get(userKey(n));
    const h = await hashPw(pw);
    if (rec) {
      if (rec.hash !== h) { setErr("密碼錯誤"); setBusy(false); return; }
    } else {
      await store.set(userKey(n), { name: n, hash: h, createdAt: Date.now() });
    }
    setBusy(false);
    onLogin(n);
  };

  return (
    <div className="mx-auto max-w-sm pt-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="mb-1 flex items-center gap-2 text-amber-400">
          <KeyRound className="h-4 w-4" /><h2 className="text-sm font-bold">登入 / 註冊</h2>
        </div>
        <p className="mb-5 text-xs text-slate-500">設定暱稱與密碼,之後這台裝置免再輸入。新暱稱會自動建立。</p>
        <div className="space-y-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="角色名 / 暱稱"
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-amber-600" />
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="密碼(簡單即可)"
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-amber-600" />
          {err && <p className="text-xs text-red-400">{err}</p>}
          <button disabled={busy} onClick={submit}
            className="w-full rounded-lg bg-amber-500 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-amber-400 disabled:opacity-50">
            {busy ? "處理中…" : "進入"}
          </button>
        </div>
        <p className="mt-4 text-[11px] text-slate-600">密碼僅作暱稱保護用,請勿使用重要密碼。</p>
      </div>
    </div>
  );
}

/* --------------------------------- Home ---------------------------------- */
function Home({ loading, events, onCreate, onOpen, onDelete }) {
  const [confirmId, setConfirmId] = useState(null);
  const [code, setCode] = useState("");
  const [codeErr, setCodeErr] = useState("");

  const joinByCode = () => {
    const c = code.trim();
    if (events.some((e) => e.id === c)) { onOpen(c); return; }
    setCodeErr("找不到這組代碼的遠征");
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-400">
          <Calendar className="h-4 w-4" /> 遠征列表 / 歷史紀錄
        </h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
            <input value={code} onChange={(e) => { setCode(e.target.value); setCodeErr(""); }}
              onKeyDown={(e) => e.key === "Enter" && joinByCode()} placeholder="貼上遠征代碼"
              className="w-32 bg-transparent px-3 py-2 text-sm outline-none" />
            <button onClick={joinByCode} className="border-l border-slate-800 px-3 py-2 text-sm text-amber-400 hover:bg-slate-800">加入</button>
          </div>
          <button onClick={onCreate}
            className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-400">
            <Plus className="h-4 w-4" strokeWidth={2.5} /> 開新遠征
          </button>
        </div>
      </div>
      {codeErr && <p className="mb-3 text-xs text-red-400">{codeErr}</p>}

      {loading ? (
        <p className="py-12 text-center text-sm text-slate-600">載入中…</p>
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 py-14 text-center">
          <p className="text-sm text-slate-500">還沒有任何遠征。</p>
          <button onClick={onCreate} className="mt-3 text-sm font-semibold text-amber-400 hover:text-amber-300">開第一場 →</button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {events.map((ev) => (
            <div key={ev.id} className="group relative rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition hover:border-amber-700/60 hover:bg-slate-900">
              <button onClick={() => onOpen(ev.id)} className="block w-full text-left">
                <h3 className="font-bold leading-snug">{ev.title}</h3>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                  <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{ev.dates.length} 天</span>
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{pad(ev.startH % 24)}:00–{timeLabel(pad(ev.endH) + ":00")}</span>
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{(ev.participants || []).length} 人</span>
                </div>
              </button>
              {confirmId === ev.id ? (
                <div className="absolute right-3 top-3 flex items-center gap-1">
                  <button onClick={() => { onDelete(ev.id); setConfirmId(null); }} className="rounded bg-red-600 px-2 py-1 text-xs font-semibold hover:bg-red-500">刪除</button>
                  <button onClick={() => setConfirmId(null)} className="rounded bg-slate-700 px-2 py-1 text-xs hover:bg-slate-600">取消</button>
                </div>
              ) : (
                <button onClick={() => setConfirmId(ev.id)}
                  className="absolute right-3 top-3 rounded p-1.5 text-slate-600 opacity-0 transition hover:bg-slate-800 hover:text-red-400 group-hover:opacity-100">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {!hasStore && (
        <p className="mt-6 rounded-lg border border-amber-900/40 bg-amber-950/30 p-3 text-xs text-amber-400/80">
          目前在預覽環境執行,資料僅暫存於此分頁。分享連結給隊員後共享儲存才會生效。
        </p>
      )}
    </div>
  );
}

/* ----------------------------- Create Event ------------------------------ */
function CreateEvent({ onCancel, onCreated }) {
  const today = new Date();
  const [title, setTitle] = useState("");
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(() => new Set());
  const [startH, setStartH] = useState(20);
  const [endH, setEndH] = useState(24);
  const [step, setStep] = useState(30);

  const days = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startPad = first.getDay();
    const dim = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= dim; d++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    return cells;
  }, [cursor]);

  const toggleDay = (d) => {
    const k = isoDate(d);
    setSelected((p) => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n; });
  };
  const sortedDates = useMemo(() => [...selected].sort(), [selected]);

  // end can cross midnight: options are start+1 .. start+18 (display +1 for >=24)
  const endOptions = useMemo(() => Array.from({ length: 18 }, (_, i) => startH + 1 + i).filter((h) => h <= 36), [startH]);
  useEffect(() => { if (endH <= startH) setEndH(startH + 4); }, [startH]); // eslint-disable-line

  const valid = title.trim() && sortedDates.length > 0 && endH > startH;

  return (
    <div>
      <button onClick={onCancel} className="mb-4 flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200">
        <ArrowLeft className="h-4 w-4" /> 返回
      </button>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-5">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-400">遠征名稱</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例:本週龍王 — 硬核團"
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm outline-none focus:border-amber-600" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-400">出征時段(每日,可跨夜)</label>
            <div className="flex items-center gap-2 text-sm">
              <select value={startH} onChange={(e) => setStartH(Number(e.target.value))}
                className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 outline-none focus:border-amber-600">
                {Array.from({ length: 24 }, (_, i) => i).map((h) => <option key={h} value={h}>{pad(h)}:00</option>)}
              </select>
              <span className="text-slate-500">至</span>
              <select value={endH} onChange={(e) => setEndH(Number(e.target.value))}
                className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 outline-none focus:border-amber-600">
                {endOptions.map((h) => <option key={h} value={h}>{pad(h % 24)}:00{h >= 24 ? "(+1)" : ""}</option>)}
              </select>
            </div>
            <p className="mt-1 text-[11px] text-slate-600">結束時間標 (+1) 表示跨到隔天凌晨</p>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-400">時段間隔</label>
            <div className="flex gap-2">
              {[30, 60].map((s) => (
                <button key={s} onClick={() => setStep(s)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${step === s ? "bg-amber-500 text-slate-950" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>{s} 分鐘</button>
              ))}
            </div>
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-400">選擇日期(可複選)— 已選 {selected.size} 天</label>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <div className="mb-2 flex items-center justify-between">
              <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="rounded p-1 hover:bg-slate-800"><ChevronLeft className="h-4 w-4" /></button>
              <span className="text-sm font-semibold">{cursor.getFullYear()} 年 {cursor.getMonth() + 1} 月</span>
              <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="rounded p-1 hover:bg-slate-800"><ChevronRight className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-slate-500">
              {WD.map((w) => <div key={w} className="py-1">{w}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map((d, i) => {
                if (!d) return <div key={i} />;
                const k = isoDate(d), sel = selected.has(k);
                return (
                  <button key={k} onClick={() => toggleDay(d)}
                    className={`aspect-square rounded-md text-sm transition ${sel ? "bg-amber-500 font-bold text-slate-950" : "text-slate-300 hover:bg-slate-800"}`}>{d.getDate()}</button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <button disabled={!valid}
        onClick={() => onCreated({
          id: `${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`.toUpperCase(),
          title: title.trim(), dates: sortedDates, startH, endH, step, participants: [], createdAt: Date.now(),
        })}
        className={`mt-6 w-full rounded-lg py-3 text-sm font-bold transition ${valid ? "bg-amber-500 text-slate-950 hover:bg-amber-400" : "bg-slate-800 text-slate-600"}`}>建立遠征</button>
    </div>
  );
}

/* ------------------------------- Event View ------------------------------ */
function EventView({ eventId, user, onBack, onParticipantsChange }) {
  const [ev, setEv] = useState(null);
  const [avails, setAvails] = useState({});
  const [tab, setTab] = useState("mine");
  const [mySlots, setMySlots] = useState(() => new Set());
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hoverCell, setHoverCell] = useState(null);
  const [copied, setCopied] = useState(false);

  const slots = useMemo(() => ev ? buildSlots(ev.startH, ev.endH, ev.step) : [], [ev]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const e = await store.get(eventKey(eventId));
    setEv(e);
    if (e) {
      const keys = await store.list(`avail:${eventId}:`);
      const list = (await Promise.all(keys.map((k) => store.get(k)))).filter(Boolean);
      const map = {};
      list.forEach((a) => { map[a.name] = new Set(a.slots); });
      setAvails(map);
      if (map[user.name]) setMySlots(new Set(map[user.name]));
    }
    setLoading(false);
  }, [eventId, user.name]);
  useEffect(() => { loadAll(); }, [loadAll]);

  const dragging = useRef(false);
  const dragMode = useRef("add");
  useEffect(() => {
    const up = () => { dragging.current = false; };
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, []);
  const applyCell = (key, mode) => {
    setMySlots((prev) => { const n = new Set(prev); mode === "add" ? n.add(key) : n.delete(key); return n; });
    setSaved(false);
  };
  const onCellDown = (key) => { dragMode.current = mySlots.has(key) ? "remove" : "add"; dragging.current = true; applyCell(key, dragMode.current); };
  const onCellEnter = (key) => { if (dragging.current) applyCell(key, dragMode.current); };

  const saveMine = async () => {
    await store.set(availKey(eventId, user.name), { name: user.name, slots: [...mySlots], updatedAt: Date.now() });
    if (ev && !(ev.participants || []).includes(user.name)) {
      const updated = { ...ev, participants: [...(ev.participants || []), user.name] };
      await store.set(eventKey(eventId), updated); setEv(updated); onParticipantsChange?.();
    }
    setAvails((p) => ({ ...p, [user.name]: new Set(mySlots) }));
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const share = async () => {
    try { await navigator.clipboard.writeText(eventId); } catch {}
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const people = Object.keys(avails);
  const total = people.length;
  const counts = useMemo(() => {
    const m = {}; people.forEach((n) => avails[n].forEach((k) => { m[k] = (m[k] || 0) + 1; })); return m;
  }, [avails]); // eslint-disable-line
  const bestCells = useMemo(() => {
    const e = Object.entries(counts); if (!e.length) return [];
    const max = Math.max(...e.map(([, c]) => c));
    return e.filter(([, c]) => c === max).map(([k]) => k).sort();
  }, [counts]);
  const maxCount = bestCells.length ? counts[bestCells[0]] : 0;

  if (loading) return <p className="py-12 text-center text-sm text-slate-600">載入中…</p>;
  if (!ev) return (
    <div className="py-12 text-center">
      <p className="text-sm text-slate-500">找不到這場遠征。</p>
      <button onClick={onBack} className="mt-3 text-sm text-amber-400">← 返回列表</button>
    </div>
  );

  return (
    <div>
      <button onClick={onBack} className="mb-3 flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200">
        <ArrowLeft className="h-4 w-4" /> 返回列表
      </button>

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{ev.title}</h2>
          <p className="mt-1 text-xs text-slate-500">
            {ev.dates.length} 天 · {pad(ev.startH)}:00–{pad(ev.endH % 24)}:00{ev.endH >= 24 ? "(+1)" : ""} · {ev.step} 分鐘 · {total} 人已填
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={share}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition hover:border-amber-600 hover:text-amber-400">
            {copied ? <><Check className="h-4 w-4" /> 已複製代碼</> : <><Share2 className="h-4 w-4" /> 分享</>}
          </button>
          <div className="flex rounded-lg bg-slate-800 p-0.5 text-sm">
            {[["mine", "我的時間"], ["overview", "總覽彙整"]].map(([k, label]) => (
              <button key={k} onClick={() => setTab(k)}
                className={`rounded-md px-3 py-1.5 font-medium transition ${tab === k ? "bg-amber-500 text-slate-950" : "text-slate-300 hover:text-white"}`}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-xs text-slate-400">
        <Copy className="h-3.5 w-3.5 shrink-0" />
        遠征代碼 <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono font-semibold text-amber-400">{eventId}</span>
        — 把代碼給隊員,在首頁「貼上遠征代碼」即可直接填寫
      </div>

      {tab === "mine" && (
        <p className="mb-3 text-xs text-slate-500">以 <span className="font-semibold text-amber-400">{user.name}</span> 填寫 · 拖曳塗選有空時段</p>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40 p-3">
        <div className="inline-block min-w-full" style={{ touchAction: tab === "mine" ? "none" : "auto" }}>
          <div className="flex">
            <div className="w-14 shrink-0" />
            {ev.dates.map((d) => (
              <div key={d} className="flex-1 px-1 pb-2 text-center">
                <div className="text-xs font-bold">{fmtDateShort(d)}</div>
                <div className="text-[10px] text-slate-500">週{fmtWeekday(d)}</div>
              </div>
            ))}
          </div>
          {slots.map((t) => (
            <div key={t} className="flex items-stretch">
              <div className="flex w-14 shrink-0 items-center justify-end pr-2 text-[10px] text-slate-500">
                {t.endsWith(":00") || ev.step >= 60 ? timeLabel(t) : ""}
              </div>
              {ev.dates.map((d) => {
                const key = cellKey(d, t);
                if (tab === "mine") {
                  const on = mySlots.has(key);
                  return (
                    <div key={key}
                      onPointerDown={(e) => { e.preventDefault(); onCellDown(key); }}
                      onPointerEnter={() => onCellEnter(key)}
                      className={`mx-px my-px flex-1 cursor-pointer rounded-sm border transition ${on ? "border-amber-400 bg-amber-500/90" : "border-slate-800 bg-slate-800/40 hover:bg-slate-700/60"}`}
                      style={{ height: 22, minWidth: 28 }} />
                  );
                }
                const c = counts[key] || 0, ratio = total ? c / total : 0;
                return (
                  <div key={key} onPointerEnter={() => setHoverCell(key)} onPointerLeave={() => setHoverCell(null)}
                    className="relative mx-px my-px flex-1 rounded-sm border border-slate-800/60"
                    style={{ height: 22, minWidth: 28, background: heatColor(ratio) }}>
                    {c > 0 && <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white/90">{c}</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {tab === "mine" && (
        <button onClick={saveMine}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-400">
          {saved ? <><Check className="h-4 w-4" /> 已儲存</> : <><Save className="h-4 w-4" /> 儲存我的時間</>}
        </button>
      )}

      {tab === "overview" && (
        <div className="mt-4 space-y-4">
          {hoverCell && <CellDetail cellKey={hoverCell} people={people} avails={avails} />}
          <div className="rounded-xl border border-amber-800/40 bg-gradient-to-br from-amber-950/40 to-orange-950/20 p-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-amber-300"><Crown className="h-4 w-4" /> 最多人可以的時段</h3>
            {total === 0 ? <p className="mt-2 text-sm text-slate-400">還沒有人填寫時間。</p>
              : maxCount === 0 ? <p className="mt-2 text-sm text-slate-400">目前沒有任何重疊時段。</p>
              : (<>
                <p className="mt-1 text-xs text-slate-400">{maxCount} / {total} 人能到 · 共 {bestCells.length} 個時段</p>
                <div className="mt-3 space-y-1.5">
                  {groupBest(bestCells, ev.step).map((g, i) => {
                    const missing = people.filter((n) => !avails[n].has(cellKey(g.date, g.from)));
                    return (
                      <div key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-slate-900/60 px-3 py-2 text-sm">
                        <span className="font-semibold text-amber-200">{fmtDateShort(g.date)}(週{fmtWeekday(g.date)}) {timeLabel(g.from)}–{timeLabel(g.to)}</span>
                        {missing.length > 0 && <span className="text-xs text-slate-500">缺:{missing.join("、")}</span>}
                      </div>
                    );
                  })}
                </div>
              </>)}
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300"><Users className="h-4 w-4" /> 已回覆 ({total})</h3>
            {total === 0 ? <p className="text-sm text-slate-500">尚無人回覆。</p>
              : <div className="flex flex-wrap gap-2">{people.map((n) => <span key={n} className="rounded-md bg-slate-800 px-2.5 py-1 text-sm">{n}</span>)}</div>}
            <p className="mt-3 flex items-center gap-2 text-[11px] text-slate-600">
              顏色越紅代表越多人有空
              <span className="inline-flex h-3 w-24 rounded-sm" style={{ background: `linear-gradient(90deg, ${heatColor(0.01)}, ${heatColor(0.5)}, ${heatColor(1)})` }} />
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function CellDetail({ cellKey: ck, people, avails }) {
  const [date, time] = ck.split("|");
  const yes = people.filter((n) => avails[n].has(ck));
  const no = people.filter((n) => !avails[n].has(ck));
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-3 text-sm">
      <span className="font-semibold">{fmtDateShort(date)}(週{fmtWeekday(date)}) {timeLabel(time)}</span>
      <span className="ml-2 text-emerald-400">可:{yes.join("、") || "—"}</span>
      {no.length > 0 && <span className="ml-2 text-slate-500">缺:{no.join("、")}</span>}
    </div>
  );
}

function groupBest(cells, stepMin) {
  const byDate = {};
  cells.forEach((k) => { const [d, t] = k.split("|"); (byDate[d] ||= []).push(t); });
  const out = [];
  const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const toStr = (mins) => `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;
  Object.keys(byDate).sort().forEach((d) => {
    const times = byDate[d].sort((a, b) => toMin(a) - toMin(b));
    let start = times[0], prev = times[0];
    for (let i = 1; i <= times.length; i++) {
      const cur = times[i];
      if (cur && toMin(cur) - toMin(prev) === stepMin) { prev = cur; continue; }
      out.push({ date: d, from: start, to: toStr(toMin(prev) + stepMin) });
      start = cur; prev = cur;
    }
  });
  return out;
}
