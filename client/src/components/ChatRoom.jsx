export default function ChatRoom({ room, onlineCount, children }) {
  if (!room) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center bg-gray-850 text-gray-600">
        <div className="text-6xl mb-4">💬</div>
        <h2 className="text-xl font-semibold text-gray-500 mb-2">Welcome to NXCHAT</h2>
        <p className="text-sm">Select a room from the sidebar to start chatting</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-w-0">
      {/* Room header */}
      <div className="px-4 py-3 border-b border-gray-700/50 bg-gray-900 flex items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 font-medium">#</span>
            <h2 className="text-white font-semibold">{room.name}</h2>
          </div>
          <p className="text-xs text-gray-500">{onlineCount} online</p>
        </div>
      </div>
      {children}
    </div>
  )
}
