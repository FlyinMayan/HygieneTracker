const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, 'scans.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_name TEXT NOT NULL,
    location TEXT NOT NULL,
    scanned_at DATETIME DEFAULT (datetime('now'))
  )
`);

module.exports = {
  recordScan(userName, location) {
    return db.prepare('INSERT INTO scans (user_name, location) VALUES (?, ?)').run(userName, location);
  },

  getScans({ limit = 500 } = {}) {
    return db.prepare('SELECT * FROM scans ORDER BY scanned_at DESC LIMIT ?').all(limit);
  },

  getStats() {
    const total = db.prepare('SELECT COUNT(*) as count FROM scans').get();
    const today = db.prepare(`
      SELECT COUNT(*) as count FROM scans
      WHERE date(scanned_at) = date('now')
    `).get();
    return { total: total.count, today: today.count };
  }
};
