# Chat App

> A real-time full-stack chat application with user authentication and persistent message history.

![Status](https://img.shields.io/badge/status-complete-brightgreen)
![Stack](https://img.shields.io/badge/stack-Node.js%20%7C%20Socket.io%20%7C%20Express-informational)
![Auth](https://img.shields.io/badge/auth-JWT-green)

---

## What It Does

A full-stack real-time chat application where users can register, log in, and exchange messages instantly. Built to deepen understanding of WebSocket communication, server-side session handling, and persistent data storage.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + Express |
| Real-time | Socket.io |
| Auth | JWT |
| Database | SQLite / MongoDB |
| Frontend | HTML + CSS + JavaScript |

---

## Key Features

- **Real-time messaging** — WebSocket-powered instant message delivery via Socket.io
- **User authentication** — Register and login with JWT-secured sessions
- **Persistent history** — Messages stored in database, loaded on reconnect
- **Multi-room support** — Users can join different chat channels
- **Responsive UI** — Works across desktop and mobile browsers

---

## Local Setup

```bash
git clone https://github.com/Gowsikan123/chat-app.git
cd chat-app
npm install
```

Create a `.env` file:
```env
JWT_SECRET=your_secret_here
PORT=3000
```

```bash
npm run dev
# Open http://localhost:3000
```

---

## What I Learned

- How WebSocket connections differ from standard HTTP request/response cycles
- Managing authenticated socket connections — attaching JWT verification to the Socket.io handshake
- Broadcasting events to specific rooms vs. all connected clients
- Handling disconnection and reconnection gracefully

---

## Author

**Gowsikan** — [GitHub](https://github.com/Gowsikan123)