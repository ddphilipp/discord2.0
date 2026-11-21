'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

async function rpc(action, data = {}) {
  const r = await fetch('/api/rpc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...data }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.error || 'Fehler'); e.status = r.status; throw e; }
  return j;
}
const run = async (fn) => { try { await fn(); } catch (e) { alert(e.message); } };

function Auth({ onDone }) {
  const [mode, setMode] = useState('login');
  const [u, setU] = useState(''); const [p, setP] = useState(''); const [e, setE] = useState('');
  const go = async (ev) => {
    ev.preventDefault(); setE('');
    try { await rpc(mode, { username: u, password: p }); onDone(); } catch (x) { setE(x.message); }
  };
  return (
    <form className="auth" onSubmit={go}>
      <h1>GameHub</h1>
      <input placeholder="Username" value={u} onChange={(x) => setU(x.target.value)} autoComplete="username" />
      <input placeholder="Passwort" type="password" value={p} onChange={(x) => setP(x.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
      {e && <p className="err">{e}</p>}
      <button className="pri">{mode === 'login' ? 'Einloggen' : 'Account erstellen'}</button>
      <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
        {mode === 'login' ? 'Noch keinen Account? Registrieren' : 'Schon registriert? Einloggen'}
      </button>
    </form>
  );
}

function Links({ text }) {
  const parts = (text || '').split(/\s+/).filter((s) => /^https?:\/\//i.test(s));
  return parts.map((l, i) => <div key={i}><a href={l} target="_blank" rel="noopener noreferrer">{l}</a></div>);
}

function GameBar({ chat, game, reload }) {
  const [open, setOpen] = useState(false);
  const [g, setG] = useState(''); const [n, setN] = useState(''); const [l, setL] = useState('');
  useEffect(() => { setG(game?.game || ''); setN(game?.note || ''); setL(game?.links || ''); }, [game?.game, game?.note, game?.links, chat.scope, chat.ref]);
  const save = () => run(async () => { await rpc('game_set', { scope: chat.scope, ref: chat.ref, game: g, note: n, links: l }); setOpen(false); reload(); });
  if (open) return (
    <div className="edit">
      <input placeholder="Was wird gezockt?" value={g} onChange={(x) => setG(x.target.value)} />
      <div className="row"><button onClick={() => setG('Chillen')}>Chillen</button><button onClick={() => setG('Reden')}>Reden</button></div>
      <textarea rows={2} placeholder="Notiz" value={n} onChange={(x) => setN(x.target.value)} />
      <textarea rows={2} placeholder="Links (einer pro Zeile)" value={l} onChange={(x) => setL(x.target.value)} />
      <div className="row"><button className="pri" onClick={save}>Speichern</button><button onClick={() => setOpen(false)}>Abbrechen</button></div>
    </div>
  );
  return (
    <div className="game">
      <div>
        {game?.game ? <><b>{game.game}</b>{game.note && <div>{game.note}</div>}<Links text={game.links} /></> : <span className="muted">Kein Game festgelegt</span>}
      </div>
      <button onClick={() => setOpen(true)}>{game?.game ? 'Ändern' : 'Game festlegen'}</button>
    </div>
  );
}

function Chat({ chat }) {
  const [d, setD] = useState({ m: [], game: null });
  const [text, setText] = useState('');
  const end = useRef(); const fileRef = useRef();
  const load = useCallback(async () => {
    try { setD(await rpc('msgs', { scope: chat.scope, ref: chat.ref })); } catch {}
  }, [chat.scope, chat.ref]);
  useEffect(() => { setD({ m: [], game: null }); load(); const t = setInterval(load, 2000); return () => clearInterval(t); }, [load]);
  useEffect(() => { end.current?.scrollIntoView(); }, [d.m.length]);
  const send = (extra = {}) => run(async () => {
    const body = text; setText('');
    await rpc('send', { scope: chat.scope, ref: chat.ref, body, ...extra }); load();
  });
  const upload = (ev) => run(async () => {
    const f = ev.target.files[0]; if (!f) return;
    const fd = new FormData(); fd.append('file', f);
    const r = await fetch('/api/upload', { method: 'POST', body: fd }); const j = await r.json();
    if (!r.ok) throw new Error(j.error);
    await send({ file_url: j.url, file_name: j.name }); fileRef.current.value = '';
  });
  return (
    <>
      <div className="head"><h3>{chat.title}</h3><GameBar chat={chat} game={d.game} reload={load} /></div>
      <div className="msgs">
        {d.m.length === 0 && <div className="empty">Noch keine Nachrichten. Schreib die erste.</div>}
        {d.m.map((m) => (
          <div className="msg" key={m.id}>
            <b>{m.username}</b><span className="muted">{new Date(m.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
            {m.body && <div style={{ whiteSpace: 'pre-wrap' }}>{m.body}</div>}
            {m.file_url && (/\.(png|jpe?g|gif|webp)$/i.test(m.file_name || '')
              ? <a href={m.file_url} target="_blank" rel="noopener noreferrer"><img src={m.file_url} alt={m.file_name} /></a>
              : <a href={m.file_url} target="_blank" rel="noopener noreferrer">{m.file_name || 'Anhang'}</a>)}
          </div>
        ))}
        <div ref={end} />
      </div>
      <div className="compose">
        <input ref={fileRef} type="file" hidden onChange={upload} />
        <button onClick={() => fileRef.current.click()} aria-label="Anhang hochladen">+</button>
        <input placeholder="Nachricht schreiben" value={text} onChange={(x) => setText(x.target.value)} onKeyDown={(x) => x.key === 'Enter' && send()} />
        <button className="pri" onClick={() => send()}>Senden</button>
      </div>
    </>
  );
}

export default function App() {
  const [st, setSt] = useState(null); const [ready, setReady] = useState(false);
  const [tab, setTab] = useState('friends'); const [chat, setChat] = useState(null);
  const [fname, setFname] = useState(''); const [rname, setRname] = useState('');
  const [q, setQ] = useState(''); const [found, setFound] = useState(null);
  const load = useCallback(async () => {
    try { setSt(await rpc('state')); } catch (e) { if (e.status === 401) setSt(null); }
    setReady(true);
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, [load]);
  if (!ready) return null;
  if (!st) return <Auth onDone={load} />;

  const act = (action, data) => run(async () => { await rpc(action, data); load(); });
  const incoming = st.friends.filter((f) => f.status === 'pending' && !f.mine);
  const outgoing = st.friends.filter((f) => f.status === 'pending' && f.mine);
  const accepted = st.friends.filter((f) => f.status === 'accepted');
  const search = () => run(async () => setFound((await rpc('room_search', { q })).rows));

  return (
    <div className="app">
      <aside className="side">
        <div className="tabs">
          <button className={tab === 'friends' ? 'on' : ''} onClick={() => setTab('friends')}>Freunde</button>
          <button className={tab === 'rooms' ? 'on' : ''} onClick={() => setTab('rooms')}>Rooms</button>
        </div>
        <div className="scroll">
          {tab === 'friends' && <>
            <div className="row">
              <input placeholder="Username hinzufügen" value={fname} onChange={(x) => setFname(x.target.value)} onKeyDown={(x) => x.key === 'Enter' && (act('friend_add', { username: fname }), setFname(''))} />
              <button className="pri" onClick={() => { act('friend_add', { username: fname }); setFname(''); }}>Add</button>
            </div>
            {incoming.map((f) => (
              <div className="item" key={f.id}><span>{f.username} <span className="muted">möchte dein Freund sein</span></span>
                <span className="row"><button className="pri" onClick={() => act('friend_answer', { id: f.id, accept: true })}>Annehmen</button><button onClick={() => act('friend_answer', { id: f.id, accept: false })}>Ablehnen</button></span></div>
            ))}
            {outgoing.map((f) => <div className="item" key={f.id}><span>{f.username}</span><span className="muted">Anfrage offen</span></div>)}
            {accepted.map((f) => (
              <div key={f.id} className={'item' + (chat?.scope === 'dm' && chat.ref === f.id ? ' on' : '')} onClick={() => setChat({ scope: 'dm', ref: f.id, title: f.username })}>
                <span>{f.username}</span>
                <button onClick={(e) => { e.stopPropagation(); confirm('Freund entfernen?') && act('friend_answer', { id: f.id, accept: false }); }}>×</button>
              </div>
            ))}
            {accepted.length === 0 && incoming.length + outgoing.length === 0 && <p className="muted">Füge Freunde per Username hinzu.</p>}
          </>}
          {tab === 'rooms' && <>
            <div className="row">
              <input placeholder="Neuer Room" value={rname} onChange={(x) => setRname(x.target.value)} />
              <button className="pri" onClick={() => { act('room_create', { name: rname }); setRname(''); }}>Erstellen</button>
            </div>
            {st.reqs.map((r) => (
              <div className="item" key={r.room_id + '-' + r.user_id}><span>{r.username} <span className="muted">will in {r.room}</span></span>
                <span className="row"><button className="pri" onClick={() => act('room_answer', { room_id: r.room_id, user_id: r.user_id, accept: true })}>Ja</button><button onClick={() => act('room_answer', { room_id: r.room_id, user_id: r.user_id, accept: false })}>Nein</button></span></div>
            ))}
            {st.rooms.map((r) => (
              <div className="room" key={r.id}>
                <h4><span>{r.name}</span>
                  <span className="row">
                    <button title="User hinzufügen" onClick={() => { const u = prompt('Username hinzufügen:'); u && act('room_add', { room_id: r.id, username: u }); }}>+ User</button>
                    {r.owner === st.myId && <button title="Channel erstellen" onClick={() => { const n = prompt('Channel-Name:'); if (!n) return; const voice = confirm('Sprachchat? OK = Sprache, Abbrechen = Text'); act('channel_create', { room_id: r.id, name: n, kind: voice ? 'voice' : 'text' }); }}>+ Channel</button>}
                  </span></h4>
                {st.channels.filter((c) => c.room_id === r.id).map((c) => (
                  <div key={c.id} className={'item' + (chat?.scope === 'ch' && chat.ref === c.id ? ' on' : '')}
                    onClick={() => setChat(c.kind === 'voice' ? { voice: true, title: c.name } : { scope: 'ch', ref: c.id, title: `${r.name} / ${c.name}` })}>
                    <span>{c.kind === 'voice' ? '🔊' : '#'} {c.name}</span>
                  </div>
                ))}
              </div>
            ))}
            <div className="row">
              <input placeholder="Room suchen" value={q} onChange={(x) => setQ(x.target.value)} onKeyDown={(x) => x.key === 'Enter' && search()} />
              <button onClick={search}>Suchen</button>
            </div>
            {found && found.length === 0 && <p className="muted">Kein Room gefunden.</p>}
            {found && found.map((r) => (
              <div className="item" key={r.id}><span>{r.name} <span className="muted">{r.n} Mitglieder</span></span>
                {r.member ? <span className="muted">dabei</span> : <button onClick={() => act('room_request', { room_id: r.id })}>Anfrage</button>}</div>
            ))}
          </>}
        </div>
        <div className="me"><b>{st.me}</b><button onClick={async () => { await rpc('logout'); setSt(null); setChat(null); }}>Logout</button></div>
      </aside>
      <main className="main">
        {!chat && <div className="empty">Wähle einen Freund oder einen Channel.</div>}
        {chat?.voice && <div className="empty"><h3>{chat.title}</h3>Sprach-, Video- und Bildschirm-Chat kommen im nächsten Schritt.</div>}
        {chat && !chat.voice && <Chat chat={chat} />}
      </main>
    </div>
  );
}
