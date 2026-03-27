const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'loansdb',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

const initDB = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS loans (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(100) NOT NULL,
      book_id VARCHAR(100) NOT NULL,
      loan_date TIMESTAMP DEFAULT NOW(),
      return_date TIMESTAMP,
      status VARCHAR(20) DEFAULT 'active'
    )
  `);
  console.log('Table loans prête.');
};

module.exports = { pool, initDB };
