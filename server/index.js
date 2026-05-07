require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const authRouter = require('./routes/auth');
const roomsRouter = require('./routes/rooms');
const socketHandlers = require('./socket/handlers');

const app = express();
const httpServer = createServer(app);

const isAllowedOrigin = (origin) => {
  if (!origin) return true; // allow non-browser requests
  if (origin === 'http://localhost:5173') return true;
  if (origin === 'http://localhost:3000') return true;
  if (origin.endsWith('.vercel.app')) return true;
  if (process.env.CLIENT_URL && origin === process.env.CLIENT_URL) return true;
  return false;
};

const corsOptions = {
  origin: function (origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
};

// Socket.io
const io = new Server(httpServer, {
  cors: corsOptions
});

// Express middleware
app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.use('/auth', authRouter);
app.use('/rooms', roomsRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Socket.io handlers
socketHandlers(io);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
