import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL
  ?.replace('sslmode=require', 'sslmode=verify-full')
  ?.replace('sslmode=prefer', 'sslmode=verify-full')

const pool = new Pool(
  connectionString
    ? { connectionString, ssl: true }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'kalori_db',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        ssl: process.env.DB_SSL === 'true' ? true : false,
      }
)

export async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      nama VARCHAR(100) NOT NULL,
      berat_badan NUMERIC(5,1) DEFAULT 0,
      tinggi_badan NUMERIC(5,1) DEFAULT 0,
      usia INTEGER DEFAULT 0,
      jenis_kelamin VARCHAR(20) DEFAULT 'laki-laki',
      aktivitas VARCHAR(20) DEFAULT 'moderate',
      target_kalori INTEGER DEFAULT 2000,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS usia INTEGER DEFAULT 0`)
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS jenis_kelamin VARCHAR(20) DEFAULT 'laki-laki'`)
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS aktivitas VARCHAR(20) DEFAULT 'moderate'`)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS food_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      nama VARCHAR(255),
      porsi VARCHAR(255),
      total_kalori INTEGER,
      protein_g NUMERIC(6,1),
      karbo_g NUMERIC(6,1),
      lemak_g NUMERIC(6,1),
      items JSONB DEFAULT '[]',
      saran TEXT,
      target_kalori INTEGER DEFAULT 2000,
      keterangan VARCHAR(100) DEFAULT '',
      confidence VARCHAR(10) DEFAULT 'medium',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  await pool.query(`ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS keterangan VARCHAR(100) DEFAULT ''`)
  await pool.query(`ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS confidence VARCHAR(10) DEFAULT 'medium'`)
  await pool.query(`ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`)
  await pool.query(`ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS manual BOOLEAN DEFAULT FALSE`)
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_log_date DATE`)
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS streak INTEGER DEFAULT 0`)
}

export async function updateStreak(userId: number) {
  try {
    const userRes = await pool.query(
      `SELECT last_log_date, streak FROM users WHERE id = $1`,
      [userId]
    )
    if (userRes.rows.length === 0) return

    const { last_log_date, streak } = userRes.rows[0]

    const todayRes = await pool.query(
      `SELECT CURRENT_DATE AT TIME ZONE 'Asia/Jakarta' AS today`
    )
    const today = todayRes.rows[0].today

    if (!last_log_date) {
      // First log ever
      await pool.query(
        `UPDATE users SET streak = 1, last_log_date = $1 WHERE id = $2`,
        [today, userId]
      )
      return
    }

    const lastDate = new Date(last_log_date)
    const todayDate = new Date(today)

    // Normalize to date-only comparison
    const diffDays = Math.round(
      (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (diffDays === 0) {
      // Already counted today, no change
      return
    } else if (diffDays === 1) {
      // Consecutive day
      await pool.query(
        `UPDATE users SET streak = $1, last_log_date = $2 WHERE id = $3`,
        [streak + 1, today, userId]
      )
    } else {
      // Gap of more than 1 day, reset streak
      await pool.query(
        `UPDATE users SET streak = 1, last_log_date = $1 WHERE id = $2`,
        [today, userId]
      )
    }
  } catch (err) {
    console.error('[updateStreak]', err)
  }
}

export default pool
