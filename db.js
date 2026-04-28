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
      department TEXT,
      unit       TEXT,
      scanned_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`ALTER TABLE scans ADD COLUMN IF NOT EXISTS department TEXT`);
  await pool.query(`ALTER TABLE scans ADD COLUMN IF NOT EXISTS unit TEXT`);
}

module.exports = {
  init,

  async recordScan(userName, location, department, unit) {
    await pool.query(
      'INSERT INTO scans (user_name, location, department, unit) VALUES ($1, $2, $3, $4)',
      [userName, location, department || null, unit || null]
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
