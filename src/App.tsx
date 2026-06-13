import { useState, useEffect, useCallback } from 'react';
import { store, eventKey, availKey } from './lib/store';
import { logAction, loadAudit } from './lib/audit';
import type { RaidEvent, User } from './lib/types';
import type { AuditEntry } from './lib/audit';
import { Shell } from './components/Shell';
import { Login } from './components/Login';
import { Home } from './components/Home';
import { CreateEvent } from './components/CreateEvent';
import { EventView } from './components/EventView';
import './App.css';

type View = 'home' | 'create' | 'event';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [booting, setBooting] = useState(true);

  const [view, setView] = useState<View>('home');
  const [events, setEvents] = useState<RaidEvent[]>([]);
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const sess = await store.get<{ name: string }>('session', false);
      if (sess?.name) setUser({ name: sess.name });
      setBooting(false);
    })();
  }, []);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    const keys = await store.list('event:');
    const list = (
      await Promise.all(keys.map((k) => store.get<RaidEvent>(k)))
    ).filter(Boolean) as RaidEvent[];
    list.sort((a, b) => b.createdAt - a.createdAt);
    setEvents(list);
    setLogs(await loadAudit());
    setLoading(false);
  }, []);
  useEffect(() => {
    if (user) loadEvents();
  }, [user, loadEvents]);

  const logout = async () => {
    await store.del('session', false);
    setUser(null);
    setView('home');
    setActiveId(null);
  };

  if (booting)
    return (
      <Shell>
        <p className="app-status">載入中…</p>
      </Shell>
    );
  if (!user)
    return (
      <Shell>
        <Login
          onLogin={async (name) => {
            await store.set('session', { name }, false);
            setUser({ name });
          }}
        />
      </Shell>
    );

  return (
    <>
      <Shell
        user={user}
        onHome={() => {
          setView('home');
          setActiveId(null);
        }}
        onLogout={logout}
      >
        <main className="shell-main">
          {view === 'home' && (
            <Home
              loading={loading}
              events={events}
              logs={logs}
              userName={user.name}
              onCreate={() => setView('create')}
              onOpen={(id) => {
                setActiveId(id);
                setView('event');
              }}
              onDelete={async (id) => {
                // soft delete: keep the row (and avails) so it can be restored
                const ev = events.find((e) => e.id === id);
                if (!ev) return;
                await store.set(eventKey(id), {
                  ...ev,
                  deleted: true,
                  deletedAt: Date.now(),
                });
                await logAction(user.name, 'delete', ev);
                loadEvents();
              }}
              onRestore={async (id) => {
                const ev = events.find((e) => e.id === id);
                if (!ev) return;
                await store.set(eventKey(id), {
                  ...ev,
                  deleted: false,
                  deletedAt: undefined,
                });
                await logAction(user.name, 'restore', ev);
                loadEvents();
              }}
              onPurge={async (id) => {
                // permanent delete (irreversible): remove event + its avails
                const ev = events.find((e) => e.id === id);
                if (ev)
                  for (const n of ev.participants || [])
                    await store.del(availKey(id, n));
                await store.del(eventKey(id));
                if (ev) await logAction(user.name, 'purge', ev);
                loadEvents();
              }}
            />
          )}
          {view === 'create' && (
            <CreateEvent
              onCancel={() => setView('home')}
              onCreated={async (ev) => {
                await store.set(eventKey(ev.id), {
                  ...ev,
                  ownerName: user.name,
                });
                await logAction(user.name, 'create', ev);
                await loadEvents();
                setActiveId(ev.id);
                setView('event');
              }}
            />
          )}
          {view === 'event' && activeId && (
            <EventView
              eventId={activeId}
              user={user}
              onBack={() => {
                setView('home');
                loadEvents();
              }}
              onParticipantsChange={loadEvents}
            />
          )}
        </main>
      </Shell>
    </>
  );
}
