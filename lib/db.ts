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
    CREATE TABLE IF NOT EXISTS food_logs (
      id SERIAL PRIMARY KEY,
      nama VARCHAR(255),
      porsi VARCHAR(255),
      total_kalori INTEGER,
      protein_g NUMERIC(6,1),
      karbo_g NUMERIC(6,1),
      lemak_g NUMERIC(6,1),
      items JSONB DEFAULT '[]',
      saran TEXT,
      target_kalori INTEGER DEFAULT 2000,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
}

export default pool
