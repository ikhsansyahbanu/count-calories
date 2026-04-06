import { Pool } from 'pg'

const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'kalori_db',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
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
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  await pool.query(`ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS keterangan VARCHAR(100) DEFAULT ''`)
  await pool.query(`ALTER TABLE food_logs ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`)
}

export default pool
