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
    CREATE TABLE IF NOT EXISTS books (
      id VARCHAR(100) PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      author VARCHAR(255),
      available BOOLEAN DEFAULT true
    );
  `);

  await pool.query(`
    INSERT INTO books (id, title, author, available)
    VALUES
      ('book-1', 'Clean Code', 'Robert C. Martin', true),
      ('book-2', 'Designing Data-Intensive Applications', 'Martin Kleppmann', true)
    ON CONFLICT (id) DO NOTHING;
  `);
}

module.exports = {
  pool,
  initializeDatabase
};

