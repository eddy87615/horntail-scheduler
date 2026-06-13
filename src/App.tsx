import { useState, useEffect, useCallback } from 'react';
import { store, eventKey, availKey } from './lib/store';
import type { RaidEvent, User } from './lib/types';
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
              onCreate={() => setView('create')}
              onOpen={(id) => {
                setActiveId(id);
                setView('event');
              }}
              onDelete={async (id) => {
                const ev = events.find((e) => e.id === id);
                if (ev)
                  for (const n of ev.participants || [])
                    await store.del(availKey(id, n));
                await store.del(eventKey(id));
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
