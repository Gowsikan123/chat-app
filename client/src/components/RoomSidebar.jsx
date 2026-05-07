import { useState } from 'react'
import api from '../api/client'

export default function RoomSidebar({ rooms, activeRoom, onRoomSelect, onRoomCreated, unreadCounts, currentUser }) {
  const [creating, setCreating] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newRoomName.trim()) return
    setLoading(true)
    setError('')

    try {
      const { data } = await api.post('/rooms', { name: newRoomName.trim() })
      onRoomCreated(data)
      setNewRoomName('')
      setCreating(false)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create room')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 border-r border-gray-700/50">
      {/* Header */}
      <div className="p-4 border-b border-gray-700/50">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-white font-bold text-lg tracking-tight">💬 NXCHAT</h1>
        </div>
        <p className="text-gray-500 text-xs">
          Signed in as <span className="text-blue-400 font-medium">{currentUser?.username}</span>
        </p>
      </div>

      {/* Rooms list */}
      <div className="flex-1 overflow-y-auto py-2">
        <div className="px-3 mb-1 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Rooms</span>
          <button
            onClick={() => { setCreating(!creating); setError('') }}
            className="text-gray-500 hover:text-blue-400 transition text-lg leading-none"
            title="Create room"
          >
            +
          </button>
        </div>

        {/* Create room form */}
        {creating && (
          <form onSubmit={handleCreate} className="px-3 pb-2">
            <input
              autoFocus
              value={newRoomName}
              onChange={(e) => { setNewRoomName(e.target.value); setError('') }}
              placeholder="room-name"
              className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-500"
            />
            {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
            <div className="flex gap-2 mt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-md py-1.5 transition disabled:opacity-50"
              >
                {loading ? '...' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => { setCreating(false); setError('') }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-medium rounded-md py-1.5 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Room list */}
        <div className="space-y-0.5 px-2">
          {rooms.map((room) => {
            const isActive = activeRoom?.id === room.id
            const unread = unreadCounts[room.id] || 0

            return (
              <button
                key={room.id}
                onClick={() => onRoomSelect(room)}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between group transition ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className={`text-sm ${isActive ? 'text-blue-200' : 'text-gray-500'}`}>#</span>
                  <span className="text-sm font-medium truncate">{room.name}</span>
                </span>
                <span className="flex items-center gap-1.5 flex-shrink-0">
                  {unread > 0 && !isActive && (
                    <span className="bg-blue-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                  <span className={`text-xs ${isActive ? 'text-blue-200' : 'text-gray-600'}`}>
                    {room.member_count}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Logout */}
      <div className="p-3 border-t border-gray-700/50">
        <button
          onClick={() => {
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            window.location.href = '/login'
          }}
          className="w-full text-left text-gray-500 hover:text-red-400 text-xs px-3 py-2 rounded-lg hover:bg-gray-800 transition"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
