import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [joinId, setJoinId] = useState('');
  const [newRoom, setNewRoom] = useState({ name: '', language: 'javascript' });
  const [creating, setCreating] = useState(false);

  const languages = ['javascript', 'python', 'java', 'cpp'];

  useEffect(() => {
    api.get('/rooms/my')
      .then((res) => setRooms(res.data))
      .catch(() => toast.error('Failed to load rooms'));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newRoom.name.trim()) return toast.error('Room name required');
    setCreating(true);
    try {
      const res = await api.post('/rooms', newRoom);
      toast.success('Room created!');
      navigate(`/editor/${res.data.roomId}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create room');
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (!joinId.trim()) return toast.error('Enter a room ID');
    navigate(`/editor/${joinId.trim()}`);
  };

  const handleDelete = async (e, roomId) => {
    e.stopPropagation();
    if (!window.confirm('Delete this room?')) return;
    try {
      await api.delete(`/rooms/${roomId}`);
      setRooms((prev) => prev.filter((r) => r.roomId !== roomId));
      toast.success('Room deleted');
    } catch {
      toast.error('Failed to delete room');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Navbar */}
      <nav className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">CodeCollab</h1>
        <div className="flex items-center gap-4">
          <span className="text-slate-300 text-sm">
            Hello, <span className="text-violet-400 font-semibold">{user?.username}</span>
          </span>
          <button
            onClick={logout}
            className="text-sm text-slate-400 hover:text-white transition"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {/* Create Room */}
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <h2 className="text-lg font-semibold text-white mb-4">Create a Room</h2>
            {!showCreate ? (
              <button
                onClick={() => setShowCreate(true)}
                className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-lg transition"
              >
                + New Room
              </button>
            ) : (
              <form onSubmit={handleCreate} className="space-y-3">
                <input
                  type="text"
                  placeholder="Room name"
                  value={newRoom.name}
                  onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-violet-500"
                />
                <select
                  value={newRoom.language}
                  onChange={(e) => setNewRoom({ ...newRoom, language: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-violet-500"
                >
                  {languages.map((l) => (
                    <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold rounded-lg transition"
                  >
                    {creating ? 'Creating...' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Join Room */}
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <h2 className="text-lg font-semibold text-white mb-4">Join a Room</h2>
            <form onSubmit={handleJoin} className="space-y-3">
              <input
                type="text"
                placeholder="Enter Room ID"
                value={joinId}
                onChange={(e) => setJoinId(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-violet-500"
              />
              <button
                type="submit"
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition"
              >
                Join Room
              </button>
            </form>
          </div>
        </div>

        {/* My Rooms */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">My Rooms</h2>
          {rooms.length === 0 ? (
            <p className="text-slate-400 text-center py-10">No rooms yet. Create one above!</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rooms.map((room) => (
                <div
                  key={room._id}
                  onClick={() => navigate(`/editor/${room.roomId}`)}
                  className="bg-slate-800 rounded-xl p-5 border border-slate-700 hover:border-violet-500 cursor-pointer transition group"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-white group-hover:text-violet-400 transition">
                      {room.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-1 bg-slate-700 text-slate-300 rounded-full">
                        {room.language}
                      </span>
                      <button
                        onClick={(e) => handleDelete(e, room.roomId)}
                        className="text-xs px-2 py-1 bg-red-900 hover:bg-red-700 text-red-300 rounded-full transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 font-mono truncate">{room.roomId}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(room.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
