import { useState, useEffect, useCallback, useRef } from 'react'
import { useSocket } from '../context/SocketContext'
import api from '../api/client'
import RoomSidebar from '../components/RoomSidebar'
import ChatRoom from '../components/ChatRoom'
import MessageList from '../components/MessageList'
import MessageInput from '../components/MessageInput'
import UserList from '../components/UserList'

export default function Chat() {
  const { socket, connected } = useSocket()
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}')

  const [rooms, setRooms] = useState([])
  const [activeRoom, setActiveRoom] = useState(null)
  const [messages, setMessages] = useState([])
  const [onlineUsers, setOnlineUsers] = useState([])
  const [typingUsers, setTypingUsers] = useState([])
  const [unreadCounts, setUnreadCounts] = useState({})
  const [reactions, setReactions] = useState({}) // { messageId: { emoji: [userId, ...] } }
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [usersOpen, setUsersOpen] = useState(false)

  const activeRoomRef = useRef(null)
  activeRoomRef.current = activeRoom

  // Load rooms on mount
  useEffect(() => {
    api.get('/rooms')
      .then(({ data }) => setRooms(data))
      .catch(console.error)
  }, [])

  // Socket event listeners
  useEffect(() => {
    if (!socket) return

    const onNewMessage = (message) => {
      setMessages((prev) => [...prev, message])

      // Increment unread if not in this room
      if (activeRoomRef.current?.id !== message.room_id) {
        setUnreadCounts((prev) => ({
          ...prev,
          [message.room_id]: (prev[message.room_id] || 0) + 1
        }))
      }
    }

    const onOnlineUsers = ({ roomId, users }) => {
      if (activeRoomRef.current?.id === roomId) {
        setOnlineUsers(users)
      }
    }

    const onUserTyping = ({ username, userId }) => {
      if (userId === currentUser.id) return
      setTypingUsers((prev) =>
        prev.includes(username) ? prev : [...prev, username]
      )
    }

    const onUserStoppedTyping = ({ username }) => {
      setTypingUsers((prev) => prev.filter((u) => u !== username))
    }

    const onUserOffline = ({ user }) => {
      setOnlineUsers((prev) => prev.filter((u) => u.id !== user.id))
      setTypingUsers((prev) => prev.filter((u) => u !== user.username))
    }

    const onMessageReaction = ({ messageId, emoji, userId, action }) => {
      setReactions((prev) => {
        const msgReactions = { ...(prev[messageId] || {}) }
        const emojiUsers = [...(msgReactions[emoji] || [])]

        if (action === 'added') {
          if (!emojiUsers.includes(userId)) emojiUsers.push(userId)
        } else {
          const idx = emojiUsers.indexOf(userId)
          if (idx > -1) emojiUsers.splice(idx, 1)
        }

        if (emojiUsers.length === 0) {
          delete msgReactions[emoji]
        } else {
          msgReactions[emoji] = emojiUsers
        }

        return { ...prev, [messageId]: msgReactions }
      })
    }

    socket.on('new_message', onNewMessage)
    socket.on('online_users', onOnlineUsers)
    socket.on('user_typing', onUserTyping)
    socket.on('user_stopped_typing', onUserStoppedTyping)
    socket.on('user_offline', onUserOffline)
    socket.on('message_reaction', onMessageReaction)

    return () => {
      socket.off('new_message', onNewMessage)
      socket.off('online_users', onOnlineUsers)
      socket.off('user_typing', onUserTyping)
      socket.off('user_stopped_typing', onUserStoppedTyping)
      socket.off('user_offline', onUserOffline)
      socket.off('message_reaction', onMessageReaction)
    }
  }, [socket, currentUser.id])

  const selectRoom = useCallback(async (room) => {
    if (activeRoomRef.current) {
      socket?.emit('leave_room', { roomId: activeRoomRef.current.id })
    }

    setActiveRoom(room)
    setMessages([])
    setOnlineUsers([])
    setTypingUsers([])
    setSidebarOpen(false)

    // Clear unread for this room
    setUnreadCounts((prev) => ({ ...prev, [room.id]: 0 }))

    // Join room via socket
    socket?.emit('join_room', { roomId: room.id })

    // Load message history
    try {
      const { data } = await api.get(`/rooms/${room.id}/messages`)
      setMessages(data)
    } catch (err) {
      console.error('Failed to load messages:', err)
    }

    // Join via REST too (idempotent)
    api.post(`/rooms/${room.id}/join`).catch(() => {})
  }, [socket])

  const handleRoomCreated = useCallback((room) => {
    setRooms((prev) => [...prev, { ...room, member_count: 1 }])
    selectRoom(room)
  }, [selectRoom])

  const handleSend = useCallback((content) => {
    if (!activeRoomRef.current || !socket) return
    socket.emit('send_message', { roomId: activeRoomRef.current.id, content })
  }, [socket])

  const handleTypingStart = useCallback(() => {
    if (!activeRoomRef.current || !socket) return
    socket.emit('typing_start', { roomId: activeRoomRef.current.id })
  }, [socket])

  const handleTypingStop = useCallback(() => {
    if (!activeRoomRef.current || !socket) return
    socket.emit('typing_stop', { roomId: activeRoomRef.current.id })
  }, [socket])

  const handleReact = useCallback((messageId, emoji) => {
    if (!activeRoomRef.current || !socket) return
    socket.emit('react_message', {
      messageId,
      emoji,
      roomId: activeRoomRef.current.id
    })
  }, [socket])

  return (
    <div className="flex h-screen bg-gray-850 overflow-hidden">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed md:relative z-30 md:z-auto
        w-64 h-full flex-shrink-0
        transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <RoomSidebar
          rooms={rooms}
          activeRoom={activeRoom}
          onRoomSelect={selectRoom}
          onRoomCreated={handleRoomCreated}
          unreadCounts={unreadCounts}
          currentUser={currentUser}
        />
      </div>

      {/* Main chat area */}
      <div className="flex flex-1 flex-col min-w-0 bg-gray-850">
        {/* Mobile top bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-900 border-b border-gray-700/50 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-400 hover:text-white transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-white font-semibold text-sm">
            {activeRoom ? `#${activeRoom.name}` : 'NXCHAT'}
          </span>
          <button
            onClick={() => setUsersOpen(!usersOpen)}
            className="text-gray-400 hover:text-white transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          <ChatRoom room={activeRoom} onlineCount={onlineUsers.length}>
            <MessageList
              messages={messages}
              typingUsers={typingUsers}
              currentUser={currentUser}
              onReact={handleReact}
              reactions={reactions}
            />
            <MessageInput
              onSend={handleSend}
              onTypingStart={handleTypingStart}
              onTypingStop={handleTypingStop}
              disabled={!activeRoom || !connected}
            />
          </ChatRoom>

          {/* User list — hidden on mobile unless toggled */}
          <div className={`
            w-48 flex-shrink-0
            hidden md:block
            ${usersOpen ? '!block' : ''}
          `}>
            <UserList onlineUsers={onlineUsers} roomName={activeRoom?.name} />
          </div>
        </div>
      </div>

      {/* Connection status */}
      {!connected && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-yellow-900/90 border border-yellow-600/50 text-yellow-300 text-xs px-4 py-2 rounded-full shadow-lg">
          Reconnecting...
        </div>
      )}
    </div>
  )
}
