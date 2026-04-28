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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
  await pool.query(`
    INSERT INTO settings (key, value) VALUES ('daily_target', '8')
    ON CONFLICT (key) DO NOTHING
  `);
}

module.exports = {
  init,

  async recordScan(userName, location, department, unit) {
    const recent = await pool.query(
      `SELECT 1 FROM scans
       WHERE user_name = $1 AND location = $2
       AND scanned_at > NOW() - INTERVAL '60 seconds'
       LIMIT 1`,
      [userName, location]
    );
    if (recent.rows.length > 0) return;

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
  },

  async getReportTrend(days) {
    const { rows } = await pool.query(
      `SELECT DATE(scanned_at) AS date, COUNT(*)::int AS count
       FROM scans
       WHERE scanned_at >= NOW() - ($1 * INTERVAL '1 day')
       GROUP BY DATE(scanned_at)
       ORDER BY date`,
      [days]
    );
    return rows;
  },

  async getReportByDepartment(days) {
    const { rows } = await pool.query(
      `SELECT COALESCE(department, 'Unknown') AS department, COUNT(*)::int AS count
       FROM scans
       WHERE scanned_at >= NOW() - ($1 * INTERVAL '1 day')
       GROUP BY department
       ORDER BY count DESC`,
      [days]
    );
    return rows;
  },

  async getReportByPerson(days) {
    const { rows } = await pool.query(
      `SELECT user_name,
              COALESCE(department, '—') AS department,
              COALESCE(unit, '—') AS unit,
              COUNT(*)::int AS count
       FROM scans
       WHERE scanned_at >= NOW() - ($1 * INTERVAL '1 day')
       GROUP BY user_name, department, unit
       ORDER BY count DESC`,
      [days]
    );
    return rows;
  },

  async getReportHeatmap(days) {
    const { rows } = await pool.query(
      `SELECT EXTRACT(DOW FROM scanned_at)::int AS day_of_week,
              EXTRACT(HOUR FROM scanned_at)::int AS hour,
              COUNT(*)::int AS count
       FROM scans
       WHERE scanned_at >= NOW() - ($1 * INTERVAL '1 day')
       GROUP BY day_of_week, hour`,
      [days]
    );
    return rows;
  },

  async getSetting(key, fallback = null) {
    const { rows } = await pool.query('SELECT value FROM settings WHERE key = $1', [key]);
    return rows.length ? rows[0].value : fallback;
  },

  async setSetting(key, value) {
    await pool.query(
      `INSERT INTO settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = $2`,
      [key, String(value)]
    );
  },

  async getExportScans(days) {
    const { rows } = await pool.query(
      `SELECT user_name, department, unit, location, scanned_at
       FROM scans
       WHERE scanned_at >= NOW() - ($1 * INTERVAL '1 day')
       ORDER BY scanned_at DESC`,
      [days]
    );
    return rows;
  }
};
