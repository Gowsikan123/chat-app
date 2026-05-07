const jwt = require('jsonwebtoken');
const db = require('../db/database');

// Track userId -> socketId for DM routing
const userSocketMap = new Map();

// Get array of online usernames currently in a room
const getOnlineUsers = (io, roomId) => {
  const room = io.sockets.adapter.rooms.get(String(roomId));
  if (!room) return [];

  const users = [];
  for (const socketId of room) {
    const socket = io.sockets.sockets.get(socketId);
    if (socket && socket.data.user) {
      users.push({ id: socket.data.user.id, username: socket.data.user.username });
    }
  }
  return users;
};

const socketHandlers = (io) => {
  // Middleware: authenticate every socket connection via JWT
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.data.user = decoded;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    console.log(`✓ Connected: ${user.username} (${socket.id})`);

    // Register in user->socket map
    userSocketMap.set(user.id, socket.id);

    // ── join_room ────────────────────────────────────────────────
    socket.on('join_room', ({ roomId }) => {
      if (!roomId) return;

      socket.join(String(roomId));

      // Notify everyone in the room
      socket.to(String(roomId)).emit('user_joined', {
        user: { id: user.id, username: user.username },
        timestamp: new Date().toISOString()
      });

      // Send current online users list to everyone in the room
      const onlineUsers = getOnlineUsers(io, roomId);
      io.to(String(roomId)).emit('online_users', { roomId, users: onlineUsers });

      console.log(`${user.username} joined room ${roomId}`);
    });

    // ── leave_room ───────────────────────────────────────────────
    socket.on('leave_room', ({ roomId }) => {
      if (!roomId) return;

      socket.leave(String(roomId));

      socket.to(String(roomId)).emit('user_left', {
        user: { id: user.id, username: user.username },
        timestamp: new Date().toISOString()
      });

      const onlineUsers = getOnlineUsers(io, roomId);
      io.to(String(roomId)).emit('online_users', { roomId, users: onlineUsers });

      console.log(`${user.username} left room ${roomId}`);
    });

    // ── send_message ─────────────────────────────────────────────
    socket.on('send_message', ({ roomId, content }) => {
      if (!roomId || !content || !content.trim()) return;

      try {
        const result = db.prepare(
          'INSERT INTO messages (room_id, user_id, content) VALUES (?, ?, ?)'
        ).run(roomId, user.id, content.trim());

        const message = db.prepare(`
          SELECT m.id, m.content, m.created_at, u.id as user_id, u.username
          FROM messages m JOIN users u ON m.user_id = u.id
          WHERE m.id = ?
        `).get(result.lastInsertRowid);

        io.to(String(roomId)).emit('new_message', message);
      } catch (err) {
        console.error('send_message error:', err);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // ── typing_start ─────────────────────────────────────────────
    socket.on('typing_start', ({ roomId }) => {
      if (!roomId) return;
      socket.to(String(roomId)).emit('user_typing', {
        username: user.username,
        userId: user.id
      });
    });

    // ── typing_stop ──────────────────────────────────────────────
    socket.on('typing_stop', ({ roomId }) => {
      if (!roomId) return;
      socket.to(String(roomId)).emit('user_stopped_typing', {
        username: user.username,
        userId: user.id
      });
    });

    // ── send_dm ──────────────────────────────────────────────────
    socket.on('send_dm', ({ toUserId, content }) => {
      if (!toUserId || !content || !content.trim()) return;

      try {
        const receiver = db.prepare('SELECT id, username FROM users WHERE id = ?').get(toUserId);
        if (!receiver) return;

        const result = db.prepare(
          'INSERT INTO direct_messages (sender_id, receiver_id, content) VALUES (?, ?, ?)'
        ).run(user.id, toUserId, content.trim());

        const dm = {
          id: result.lastInsertRowid,
          sender_id: user.id,
          sender_username: user.username,
          receiver_id: toUserId,
          content: content.trim(),
          created_at: new Date().toISOString()
        };

        // Emit to recipient if they're online
        const recipientSocketId = userSocketMap.get(toUserId);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('new_dm', dm);
        }

        // Echo back to sender
        socket.emit('new_dm', dm);
      } catch (err) {
        console.error('send_dm error:', err);
      }
    });

    // ── react_message ────────────────────────────────────────────
    socket.on('react_message', ({ messageId, emoji, roomId }) => {
      if (!messageId || !emoji || !roomId) return;

      try {
        const existing = db.prepare(
          'SELECT id FROM reactions WHERE message_id = ? AND user_id = ? AND emoji = ?'
        ).get(messageId, user.id, emoji);

        let action;
        if (existing) {
          db.prepare('DELETE FROM reactions WHERE id = ?').run(existing.id);
          action = 'removed';
        } else {
          db.prepare(
            'INSERT INTO reactions (message_id, user_id, emoji) VALUES (?, ?, ?)'
          ).run(messageId, user.id, emoji);
          action = 'added';
        }

        io.to(String(roomId)).emit('message_reaction', {
          messageId,
          emoji,
          username: user.username,
          userId: user.id,
          action
        });
      } catch (err) {
        console.error('react_message error:', err);
      }
    });

    // ── disconnect ───────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`✗ Disconnected: ${user.username}`);
      userSocketMap.delete(user.id);

      // Notify all rooms this user was in
      for (const roomId of socket.rooms) {
        if (roomId === socket.id) continue; // skip default room
        socket.to(roomId).emit('user_offline', {
          user: { id: user.id, username: user.username }
        });
        // Update online users list for each room
        const onlineUsers = getOnlineUsers(io, roomId);
        io.to(roomId).emit('online_users', { roomId, users: onlineUsers });
      }
    });
  });
};

module.exports = socketHandlers;
