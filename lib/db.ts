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

let _initPromise: Promise<void> | null = null

async function _runMigrations() {
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
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_log_date DATE`)
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS streak INTEGER DEFAULT 0`)

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
  await pool.query(`ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS manual BOOLEAN DEFAULT FALSE`)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS weight_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      berat NUMERIC(5,1) NOT NULL,
      catatan VARCHAR(200) DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS food_favorites (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      nama VARCHAR(255),
      porsi VARCHAR(255),
      total_kalori INTEGER,
      protein_g NUMERIC(6,1),
      karbo_g NUMERIC(6,1),
      lemak_g NUMERIC(6,1),
      items JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  // Indexes untuk query yang sering dipakai
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_food_logs_user_id ON food_logs(user_id)`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_food_logs_user_created ON food_logs(user_id, created_at DESC)`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_food_logs_created_at ON food_logs(created_at)`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_food_favorites_user_id ON food_favorites(user_id)`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_weight_logs_user_id ON weight_logs(user_id, created_at DESC)`)
}

/** Jalankan migrasi DB — aman dipanggil berkali-kali, hanya berjalan sekali per proses. */
export function initDB(): Promise<void> {
  if (!_initPromise) {
    _initPromise = _runMigrations().catch(err => {
      console.error('[DB init error]', err)
      _initPromise = null // reset supaya bisa retry kalau ada transient error
      throw err
    })
  }
  return _initPromise
}

export async function updateStreak(userId: number) {
  try {
    const userRes = await pool.query(
      `SELECT
        last_log_date,
        streak,
        (CURRENT_DATE AT TIME ZONE 'Asia/Jakarta')::date AS today,
        CASE
          WHEN last_log_date IS NULL THEN NULL
          ELSE ((CURRENT_DATE AT TIME ZONE 'Asia/Jakarta')::date - last_log_date::date)
        END AS diff_days
       FROM users WHERE id = $1`,
      [userId]
    )
    if (userRes.rows.length === 0) return

    const { last_log_date, streak, today, diff_days } = userRes.rows[0]

    if (!last_log_date) {
      await pool.query(
        `UPDATE users SET streak = 1, last_log_date = $1 WHERE id = $2`,
        [today, userId]
      )
      return
    }

    const diffDays: number = diff_days

    if (diffDays === 0) {
      return
    } else if (diffDays === 1) {
      await pool.query(
        `UPDATE users SET streak = $1, last_log_date = $2 WHERE id = $3`,
        [streak + 1, today, userId]
      )
    } else {
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
