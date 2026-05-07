import { useEffect, useRef } from 'react'

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥']

const formatTime = (iso) => {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const formatDate = (iso) => {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
}

export default function MessageList({ messages, typingUsers, currentUser, onReact, reactions }) {
  const bottomRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typingUsers])

  // Group messages by date
  const grouped = []
  let lastDate = null
  let lastUser = null

  for (const msg of messages) {
    const date = formatDate(msg.created_at)
    if (date !== lastDate) {
      grouped.push({ type: 'date', label: date })
      lastDate = date
      lastUser = null
    }
    grouped.push({ type: 'message', data: msg, compact: lastUser === msg.user_id })
    lastUser = msg.user_id
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-0.5">
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-gray-600">
          <div className="text-4xl mb-2">💬</div>
          <p className="text-sm">No messages yet. Say hello!</p>
        </div>
      )}

      {grouped.map((item, i) => {
        if (item.type === 'date') {
          return (
            <div key={`date-${i}`} className="flex items-center gap-3 py-3">
              <div className="flex-1 h-px bg-gray-700/50" />
              <span className="text-xs text-gray-500 font-medium">{item.label}</span>
              <div className="flex-1 h-px bg-gray-700/50" />
            </div>
          )
        }

        const msg = item.data
        const isOwn = msg.user_id === currentUser?.id
        const compact = item.compact

        // Get reactions for this message
        const msgReactions = reactions?.[msg.id] || {}

        return (
          <div
            key={msg.id}
            className={`group flex gap-3 ${compact ? 'mt-0.5' : 'mt-3'} ${isOwn ? 'flex-row-reverse' : ''}`}
          >
            {/* Avatar */}
            {!compact ? (
              <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${
                isOwn ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
              }`}>
                {msg.username?.[0]?.toUpperCase()}
              </div>
            ) : (
              <div className="w-8 flex-shrink-0" />
            )}

            {/* Message bubble */}
            <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
              {!compact && (
                <div className={`flex items-baseline gap-2 mb-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
                  <span className="text-sm font-semibold text-white">{msg.username}</span>
                  <span className="text-xs text-gray-500">{formatTime(msg.created_at)}</span>
                </div>
              )}

              <div className="relative">
                <div
                  className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    isOwn
                      ? 'bg-blue-600 text-white rounded-tr-sm'
                      : 'bg-gray-700 text-gray-100 rounded-tl-sm'
                  }`}
                >
                  {msg.content}
                </div>

                {/* Reaction button — appears on hover */}
                {onReact && (
                  <div className={`absolute top-0 ${isOwn ? 'left-0 -translate-x-full pr-1' : 'right-0 translate-x-full pl-1'} opacity-0 group-hover:opacity-100 transition flex items-center`}>
                    <div className="bg-gray-800 border border-gray-700 rounded-lg px-1.5 py-1 flex gap-1">
                      {EMOJIS.map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => onReact(msg.id, emoji)}
                          className="hover:scale-125 transition-transform text-sm leading-none"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Reactions display */}
              {Object.keys(msgReactions).length > 0 && (
                <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? 'justify-end' : ''}`}>
                  {Object.entries(msgReactions).map(([emoji, users]) => (
                    <button
                      key={emoji}
                      onClick={() => onReact?.(msg.id, emoji)}
                      className={`flex items-center gap-1 text-xs rounded-full px-2 py-0.5 border transition ${
                        users.includes(currentUser?.id)
                          ? 'bg-blue-900/50 border-blue-500/50 text-blue-300'
                          : 'bg-gray-700/50 border-gray-600 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <span>{emoji}</span>
                      <span>{users.length}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* Typing indicators */}
      {typingUsers.length > 0 && (
        <div className="flex items-center gap-3 mt-2 px-1">
          <div className="w-8 h-8 rounded-full bg-gray-700 flex-shrink-0 flex items-center justify-center text-xs">
            {typingUsers[0][0]?.toUpperCase()}
          </div>
          <div className="bg-gray-700 rounded-2xl rounded-tl-sm px-4 py-2.5 flex items-center gap-1">
            <span className="text-xs text-gray-400 mr-1">
              {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing
            </span>
            <span className="flex gap-0.5">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </span>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
