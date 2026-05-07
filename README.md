# 💬 NXCHAT — Real-Time Chat App

A full-stack real-time chat application built with Node.js, Socket.io, SQLite, and React.

## Features

- **Real-time messaging** via WebSockets (Socket.io)
- **JWT authentication** — register, login, 7-day sessions
- **Chat rooms** — create, join, browse rooms
- **Message history** — persisted in SQLite, loads on room join
- **Typing indicators** — "Gowi is typing..."
- **Online presence** — live user list per room
- **Emoji reactions** — react to any message
- **Unread badges** — per-room unread counts
- **Mobile responsive** — works on all screen sizes

## Stack

| Layer | Tech |
|-------|------|
| Backend | Node.js + Express + Socket.io |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| Database | SQLite (better-sqlite3) |
| Frontend | React 18 + Vite + Tailwind CSS |
| Hosting | Railway (backend) + Vercel (frontend) |

## Local Development

### Prerequisites
- Node.js 18+
- npm

### 1. Clone & install

```bash
git clone https://github.com/YOUR_USERNAME/chat-app.git
cd chat-app
```

**Backend:**
```bash
cd server
npm install
cp .env.example .env
# Edit .env — set a strong JWT_SECRET
npm run dev
```

**Frontend (new terminal):**
```bash
cd client
npm install
cp .env.example .env
# .env already points to localhost:3001
npm run dev
```

Open `http://localhost:5173`

### 2. Test it

1. Open two browser tabs at `http://localhost:5173`
2. Register two different users (one per tab)
3. Both join the **#general** room
4. Send a message in tab 1 — it appears in tab 2 instantly
5. Start typing in tab 1 — typing indicator appears in tab 2

## Deployment

### Backend → Railway

1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select the repo, set **Root Directory** to `server`
4. Add environment variables:
   ```
   JWT_SECRET=your_long_random_secret
   CLIENT_URL=https://your-app.vercel.app
   PORT=3001
   ```
5. Deploy — Railway auto-detects the `start` script

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
2. Set **Root Directory** to `client`
3. Add environment variable:
   ```
   VITE_API_URL=https://your-backend.railway.app
   ```
4. Deploy

### Post-deploy

Update Railway's `CLIENT_URL` to match your Vercel URL (no trailing slash).

## Project Structure

```
chat-app/
├── server/
│   ├── index.js              # Express + Socket.io bootstrap
│   ├── routes/
│   │   ├── auth.js           # Register, login
│   │   └── rooms.js          # Rooms, messages, DMs, reactions
│   ├── middleware/
│   │   └── auth.js           # JWT middleware
│   ├── db/
│   │   ├── schema.sql        # All tables
│   │   └── database.js       # SQLite connection + init
│   └── socket/
│       └── handlers.js       # All real-time events
└── client/
    └── src/
        ├── pages/            # Login, Register, Chat
        ├── components/       # ChatRoom, MessageList, MessageInput, RoomSidebar, UserList
        ├── context/          # SocketContext (shared socket instance)
        └── api/              # Axios client with JWT interceptor
```

## API Reference

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | /auth/register | No | Create account |
| POST | /auth/login | No | Login |
| GET | /rooms | Yes | List all rooms |
| POST | /rooms | Yes | Create room |
| POST | /rooms/:id/join | Yes | Join a room |
| GET | /rooms/:id/messages | Yes | Last 50 messages |
| GET | /rooms/dm/:userId | Yes | DM history |
| POST | /rooms/dm/:userId | Yes | Send DM |

## Socket Events

| Client → Server | Payload | Description |
|----------------|---------|-------------|
| join_room | { roomId } | Join a room channel |
| leave_room | { roomId } | Leave a room channel |
| send_message | { roomId, content } | Send a message |
| typing_start | { roomId } | Start typing |
| typing_stop | { roomId } | Stop typing |
| send_dm | { toUserId, content } | Send direct message |
| react_message | { messageId, emoji, roomId } | Toggle emoji reaction |

| Server → Client | Payload | Description |
|----------------|---------|-------------|
| new_message | message object | New message in room |
| online_users | { roomId, users } | Current online users |
| user_joined | { user, timestamp } | User joined room |
| user_left | { user, timestamp } | User left room |
| user_typing | { username, userId } | User started typing |
| user_stopped_typing | { username } | User stopped typing |
| user_offline | { user } | User disconnected |
| new_dm | dm object | Incoming direct message |
| message_reaction | { messageId, emoji, action } | Reaction toggled |
