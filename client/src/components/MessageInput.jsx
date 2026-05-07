import { useState, useRef, useCallback } from 'react'

export default function MessageInput({ onSend, onTypingStart, onTypingStop, disabled }) {
  const [content, setContent] = useState('')
  const typingRef = useRef(false)
  const stopTimerRef = useRef(null)

  const triggerTypingStop = useCallback(() => {
    if (typingRef.current) {
      typingRef.current = false
      onTypingStop?.()
    }
  }, [onTypingStop])

  const handleChange = (e) => {
    setContent(e.target.value)

    // Start typing
    if (!typingRef.current && e.target.value.length > 0) {
      typingRef.current = true
      onTypingStart?.()
    }

    // Reset the stop timer
    clearTimeout(stopTimerRef.current)
    stopTimerRef.current = setTimeout(() => {
      triggerTypingStop()
    }, 1500)

    // If field is cleared, stop immediately
    if (e.target.value.length === 0) {
      clearTimeout(stopTimerRef.current)
      triggerTypingStop()
    }
  }

  const handleSend = () => {
    const trimmed = content.trim()
    if (!trimmed || disabled) return

    onSend(trimmed)
    setContent('')

    clearTimeout(stopTimerRef.current)
    triggerTypingStop()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleBlur = () => {
    clearTimeout(stopTimerRef.current)
    triggerTypingStop()
  }

  return (
    <div className="px-4 pb-4 pt-2 border-t border-gray-700/50">
      <div className="flex items-end gap-2 bg-gray-700 rounded-xl border border-gray-600 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/30 transition">
        <textarea
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={disabled ? 'Select a room to chat...' : 'Message... (Enter to send, Shift+Enter for newline)'}
          rows={1}
          className="flex-1 bg-transparent text-white placeholder-gray-500 text-sm px-4 py-3 resize-none focus:outline-none leading-relaxed disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ maxHeight: '120px', overflowY: 'auto' }}
          onInput={(e) => {
            e.target.style.height = 'auto'
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
          }}
        />
        <button
          onClick={handleSend}
          disabled={!content.trim() || disabled}
          className="m-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg p-2 transition flex-shrink-0"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
      <p className="text-xs text-gray-600 mt-1.5 px-1">Enter to send · Shift+Enter for newline</p>
    </div>
  )
}
