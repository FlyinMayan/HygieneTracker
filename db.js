const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS scans (
      id         SERIAL PRIMARY KEY,
      user_name  TEXT NOT NULL,
      location   TEXT NOT NULL,
      scanned_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

module.exports = {
  init,

  async recordScan(userName, location) {
    await pool.query(
      'INSERT INTO scans (user_name, location) VALUES ($1, $2)',
      [userName, location]
    );
  },

  async getScans({ limit = 500 } = {}) {
    const { rows } = await pool.query(
      'SELECT * FROM scans ORDER BY scanned_at DESC LIMIT $1',
      [limit]
    );
    return rows;
  },

  async getStats() {
    const [total, today] = await Promise.all([
      pool.query('SELECT COUNT(*) AS count FROM scans'),
      pool.query('SELECT COUNT(*) AS count FROM scans WHERE scanned_at::date = CURRENT_DATE')
    ]);
    return {
      total: parseInt(total.rows[0].count),
      today: parseInt(today.rows[0].count)
    };
  }
};
