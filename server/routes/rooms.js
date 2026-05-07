const express = require('express');
const db = require('../db/database');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /rooms — list all rooms with member count
router.get('/', auth, (req, res) => {
  try {
    const rooms = db.prepare(`
      SELECT
        r.id,
        r.name,
        r.created_at,
        COUNT(rm.user_id) as member_count
      FROM rooms r
      LEFT JOIN room_members rm ON r.id = rm.room_id
      GROUP BY r.id
      ORDER BY r.created_at ASC
    `).all();

    res.json(rooms);
  } catch (err) {
    console.error('Get rooms error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /rooms — create a room
router.post('/', auth, (req, res) => {
  const { name } = req.body;

  if (!name || name.trim().length < 2) {
    return res.status(400).json({ error: 'Room name must be at least 2 characters' });
  }

  const cleanName = name.trim().toLowerCase().replace(/\s+/g, '-');

  try {
    const existing = db.prepare('SELECT id FROM rooms WHERE name = ?').get(cleanName);
    if (existing) {
      return res.status(409).json({ error: 'Room name already taken' });
    }

    const result = db.prepare(
      'INSERT INTO rooms (name, created_by) VALUES (?, ?)'
    ).run(cleanName, req.user.id);

    const roomId = result.lastInsertRowid;

    // Creator auto-joins
    db.prepare(
      'INSERT OR IGNORE INTO room_members (room_id, user_id) VALUES (?, ?)'
    ).run(roomId, req.user.id);

    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
    res.status(201).json(room);
  } catch (err) {
    console.error('Create room error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /rooms/:id/join — join a room
router.post('/:id/join', auth, (req, res) => {
  const roomId = parseInt(req.params.id);

  try {
    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Idempotent — INSERT OR IGNORE
    db.prepare(
      'INSERT OR IGNORE INTO room_members (room_id, user_id) VALUES (?, ?)'
    ).run(roomId, req.user.id);

    res.json({ message: 'Joined room', room });
  } catch (err) {
    console.error('Join room error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /rooms/:id/messages — last 50 messages with username
router.get('/:id/messages', auth, (req, res) => {
  const roomId = parseInt(req.params.id);

  try {
    const room = db.prepare('SELECT id FROM rooms WHERE id = ?').get(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const messages = db.prepare(`
      SELECT
        m.id,
        m.content,
        m.created_at,
        u.id as user_id,
        u.username
      FROM messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.room_id = ?
      ORDER BY m.created_at DESC
      LIMIT 50
    `).all(roomId);

    // Return in chronological order
    res.json(messages.reverse());
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /rooms/:id/react — add emoji reaction to a message
router.post('/messages/:messageId/react', auth, (req, res) => {
  const messageId = parseInt(req.params.messageId);
  const { emoji } = req.body;

  if (!emoji) return res.status(400).json({ error: 'Emoji required' });

  try {
    // Toggle: if reaction exists, remove it; otherwise add it
    const existing = db.prepare(
      'SELECT id FROM reactions WHERE message_id = ? AND user_id = ? AND emoji = ?'
    ).get(messageId, req.user.id, emoji);

    if (existing) {
      db.prepare('DELETE FROM reactions WHERE id = ?').run(existing.id);
      return res.json({ action: 'removed' });
    }

    db.prepare(
      'INSERT INTO reactions (message_id, user_id, emoji) VALUES (?, ?, ?)'
    ).run(messageId, req.user.id, emoji);

    res.json({ action: 'added' });
  } catch (err) {
    console.error('React error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /rooms/dm/:userId — DM history between two users
router.get('/dm/:userId', auth, (req, res) => {
  const otherId = parseInt(req.params.userId);
  const myId = req.user.id;

  try {
    const messages = db.prepare(`
      SELECT dm.*, u.username as sender_username
      FROM direct_messages dm
      JOIN users u ON dm.sender_id = u.id
      WHERE (dm.sender_id = ? AND dm.receiver_id = ?)
         OR (dm.sender_id = ? AND dm.receiver_id = ?)
      ORDER BY dm.created_at ASC
      LIMIT 50
    `).all(myId, otherId, otherId, myId);

    // Mark as read
    db.prepare(
      'UPDATE direct_messages SET read = 1 WHERE receiver_id = ? AND sender_id = ?'
    ).run(myId, otherId);

    res.json(messages);
  } catch (err) {
    console.error('DM history error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /rooms/dm/:userId — send a DM
router.post('/dm/:userId', auth, (req, res) => {
  const receiverId = parseInt(req.params.userId);
  const { content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Message content required' });
  }

  try {
    const receiver = db.prepare('SELECT id, username FROM users WHERE id = ?').get(receiverId);
    if (!receiver) return res.status(404).json({ error: 'User not found' });

    const result = db.prepare(
      'INSERT INTO direct_messages (sender_id, receiver_id, content) VALUES (?, ?, ?)'
    ).run(req.user.id, receiverId, content.trim());

    res.status(201).json({ id: result.lastInsertRowid, message: 'Sent' });
  } catch (err) {
    console.error('Send DM error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
