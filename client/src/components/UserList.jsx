export default function UserList({ users, currentUser }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {users.map((u) => (
        <div
          key={u}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
            u === currentUser
              ? 'bg-violet-600 text-white'
              : 'bg-slate-700 text-slate-300'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
          {u}
          {u === currentUser && ' (you)'}
        </div>
      ))}
    </div>
  );
}
