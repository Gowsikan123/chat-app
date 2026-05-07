export default function UserList({ onlineUsers, roomName }) {
  if (!roomName) {
    return (
      <div className="flex flex-col h-full bg-gray-900 border-l border-gray-700/50 p-4">
        <p className="text-gray-600 text-xs text-center mt-4">Select a room</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 border-l border-gray-700/50">
      <div className="p-4 border-b border-gray-700/50">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Online — {onlineUsers.length}
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto py-2 px-3 space-y-0.5">
        {onlineUsers.length === 0 && (
          <p className="text-gray-600 text-xs text-center mt-4">No users online</p>
        )}
        {onlineUsers.map((user) => (
          <div
            key={user.id}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg"
          >
            <div className="relative flex-shrink-0">
              <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300">
                {user.username?.[0]?.toUpperCase()}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-gray-900" />
            </div>
            <span className="text-sm text-gray-300 truncate">{user.username}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
