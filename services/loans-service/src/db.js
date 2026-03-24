const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'library'
});

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS loans (
      id UUID PRIMARY KEY,
      book_id VARCHAR(255) NOT NULL,
      borrower_name VARCHAR(255) NOT NULL,
      loan_date TIMESTAMP NOT NULL DEFAULT NOW(),
      due_date TIMESTAMP NOT NULL
    );
  `);
}

module.exports = {
  pool,
  initializeDatabase
};

