import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import * as Y from 'yjs';
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate } from 'y-protocols/awareness';
import { yCollab, yUndoManagerKeymap } from 'y-codemirror.next';
import { keymap } from '@codemirror/view';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { java } from '@codemirror/lang-java';
import { cpp } from '@codemirror/lang-cpp';
import { oneDark } from '@codemirror/theme-one-dark';
import { useAuth } from '../context/AuthContext';
import UserList from '../components/UserList';
import toast from 'react-hot-toast';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

const CURSOR_COLORS = [
  { color: '#958DF1', light: '#958DF133' },
  { color: '#F98181', light: '#F9818133' },
  { color: '#FBBC88', light: '#FBBC8833' },
  { color: '#70CFF8', light: '#70CFF833' },
  { color: '#94FADB', light: '#94FADB33' },
  { color: '#B9F18D', light: '#B9F18D33' },
];

function getUserColor(username) {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

const langExtensions = {
  javascript: javascript({ jsx: true }),
  python: python(),
  java: java(),
  cpp: cpp(),
};

export default function EditorPage() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const ydocRef = useRef(null);
  const ytextRef = useRef(null);
  const awarenessRef = useRef(null);

  const [language, setLanguage] = useState('javascript');
  const [users, setUsers] = useState([]);
  const [roomName, setRoomName] = useState('');
  const [connected, setConnected] = useState(false);
  const [docReady, setDocReady] = useState(false);

  useEffect(() => {
    if (!user) return navigate('/login');

    const ydoc = new Y.Doc();
    const ytext = ydoc.getText('codemirror');
    const awareness = new Awareness(ydoc);
    ydocRef.current = ydoc;
    ytextRef.current = ytext;
    awarenessRef.current = awareness;

    const userColor = getUserColor(user.username);
    awareness.setLocalStateField('user', {
      name: user.username,
      color: userColor.color,
      colorLight: userColor.light,
    });

    const socket = io(SOCKET_URL, {
      auth: { token: localStorage.getItem('token') },
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join-room', { roomId });
    });

    socket.on('connect_error', (err) => {
      toast.error(err.message === 'Unauthorized' ? 'Session expired, please login again' : 'Connection failed');
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('room-state', ({ yjsState, language: l, roomName: n }) => {
      Y.applyUpdate(ydoc, new Uint8Array(yjsState), 'remote');
      setLanguage(l);
      setRoomName(n);
      setDocReady(true);
    });

    // Apply Yjs updates from other users
    socket.on('yjs-update', ({ update }) => {
      Y.applyUpdate(ydoc, new Uint8Array(update), 'remote');
    });

    // Apply awareness (cursor) updates from other users
    socket.on('awareness-update', ({ update }) => {
      applyAwarenessUpdate(awareness, new Uint8Array(update), 'remote');
    });

    // Send local Yjs edits to server (skip updates originating from server)
    ydoc.on('update', (update, origin) => {
      if (origin !== 'remote') {
        socket.emit('yjs-update', { roomId, update: Array.from(update) });
      }
    });

    // Send local cursor position to other users
    awareness.on('update', ({ added, updated, removed }) => {
      const update = encodeAwarenessUpdate(awareness, [...added, ...updated, ...removed]);
      socket.emit('awareness-update', { roomId, update: Array.from(update) });
    });

    socket.on('language-update', ({ language: l }) => setLanguage(l));
    socket.on('room-users', (u) => setUsers(u));
    socket.on('user-joined', ({ username }) => toast.success(`${username} joined the room`));
    socket.on('user-left', ({ username }) => toast(`${username} left the room`, { icon: '👋' }));
    socket.on('save-success', ({ message }) => toast.success(message));
    socket.on('save-error', ({ message }) => toast.error(message));

    return () => {
      awareness.destroy();
      ydoc.destroy();
      socket.disconnect();
    };
  }, [roomId, user, navigate]);

  const handleLanguageChange = (e) => {
    const lang = e.target.value;
    setLanguage(lang);
    socketRef.current?.emit('language-change', { roomId, language: lang });
  };

  const handleSave = () => {
    const code = ytextRef.current?.toString() || '';
    socketRef.current?.emit('save-code', { roomId, language });
    // Also persist via REST as backup
    void 0;
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    toast.success('Room ID copied!');
  };

  const editorExtensions = docReady
    ? [
        langExtensions[language] || javascript(),
        yCollab(ytextRef.current, awarenessRef.current),
        keymap.of(yUndoManagerKeymap),
      ]
    : [langExtensions[language] || javascript()];

  return (
    <div className="h-screen flex flex-col bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="text-slate-400 hover:text-white transition text-sm"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-white font-semibold text-sm">{roomName || 'Loading...'}</h1>
            <button
              onClick={copyRoomId}
              className="text-xs text-slate-400 hover:text-violet-400 transition font-mono"
            >
              {roomId} (copy)
            </button>
          </div>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              connected ? 'bg-emerald-900 text-emerald-400' : 'bg-red-900 text-red-400'
            }`}
          >
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={language}
            onChange={handleLanguageChange}
            className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500"
          >
            {Object.keys(langExtensions).map((l) => (
              <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
            ))}
          </select>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition"
          >
            Save
          </button>
        </div>
      </div>

      {/* Users bar */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-2 flex-shrink-0">
        <UserList users={users} currentUser={user?.username} />
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        {docReady ? (
          <CodeMirror
            height="100%"
            theme={oneDark}
            extensions={editorExtensions}
            basicSetup={{
              lineNumbers: true,
              highlightActiveLine: true,
              foldGutter: true,
              autocompletion: true,
              history: false,
            }}
            style={{ height: '100%' }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400 text-sm">
            Connecting to room...
          </div>
        )}
      </div>
    </div>
  );
}
