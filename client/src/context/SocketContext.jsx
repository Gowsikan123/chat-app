import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'

const SocketContext = createContext(null)

export const SocketProvider = ({ children }) => {
  const [connected, setConnected] = useState(false)
  const socketRef = useRef(null)

  const connect = useCallback((token) => {
    // Disconnect existing socket first
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
      console.log('Socket disconnected')
    })

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message)
      setConnected(false)
    })

    socketRef.current = socket
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      connect(token)
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [connect])

  // Call this after login/register to connect with fresh token
  const reconnect = useCallback((token) => {
    connect(token)
  }, [connect])

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected, reconnect }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (!context) throw new Error('useSocket must be used within SocketProvider')
  return context
}
