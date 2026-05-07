import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'

const SocketContext = createContext(null)

export const SocketProvider = ({ children }) => {
  const [connected, setConnected] = useState(false)
  const socketRef = useRef(null)
  // A stable ref-based getter so consumers always get the latest socket
  const getSocket = useCallback(() => socketRef.current, [])

  const connect = useCallback((token) => {
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }
    if (!token) return

    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001', {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
    })

    socket.on('connect', () => {
      setConnected(true)
      console.log('Socket connected:', socket.id)
    })
    socket.on('disconnect', () => {
      setConnected(false)
    })
    socket.on('connect_error', (err) => {
      console.error('Socket error:', err.message)
      setConnected(false)
    })

    socketRef.current = socket
    // Trigger re-render so consumers get updated context
    setConnected(false)
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) connect(token)
    return () => {
      socketRef.current?.disconnect()
      socketRef.current = null
    }
  }, [connect])

  const reconnect = useCallback((token) => {
    connect(token)
  }, [connect])

  return (
    <SocketContext.Provider value={{ getSocket, connected, reconnect }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (!context) throw new Error('useSocket must be used within SocketProvider')
  return context
}
