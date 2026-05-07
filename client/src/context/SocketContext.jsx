import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { io } from 'socket.io-client'

const SocketContext = createContext(null)

export const SocketProvider = ({ children }) => {
  const [connected, setConnected] = useState(false)
  const socketRef = useRef(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return

    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001', {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
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

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [])

  // Call this after login to reconnect with fresh token
  const reconnect = (token) => {
    if (socketRef.current) {
      socketRef.current.auth = { token }
      socketRef.current.connect()
    }
  }

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
