const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// On Railway, use the volume mount path if available
const DB_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, '../../');
const DB_PATH = path.join(DB_DIR, 'chat.db');

const db = new Database(DB_PATH);

// WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Run schema on startup — IF NOT EXISTS means this is safe to call every time
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

// Seed a default "general" room if no rooms exist
const roomCount = db.prepare('SELECT COUNT(*) as count FROM rooms').get();
if (roomCount.count === 0) {
  db.prepare("INSERT OR IGNORE INTO rooms (name, created_by) VALUES ('general', NULL)").run();
  db.prepare("INSERT OR IGNORE INTO rooms (name, created_by) VALUES ('random', NULL)").run();
  db.prepare("INSERT OR IGNORE INTO rooms (name, created_by) VALUES ('tech', NULL)").run();
}

module.exports = db;
