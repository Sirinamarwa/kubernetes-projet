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
      ('book-2', 'Designing Data-Intensive Applications', 'Martin Kleppmann', true),
      ('book-3', 'Refactoring', 'Martin Fowler', true),
      ('book-4', 'The Pragmatic Programmer', 'Andrew Hunt', true),
      ('book-5', 'Domain-Driven Design', 'Eric Evans', true),
      ('book-6', 'Working Effectively with Legacy Code', 'Michael Feathers', true),
      ('book-7', 'Patterns of Enterprise Application Architecture', 'Martin Fowler', true),
      ('book-8', 'Building Microservices', 'Sam Newman', true),
      ('book-9', 'Accelerate', 'Nicole Forsgren', true),
      ('book-10', 'Release It!', 'Michael T. Nygard', true),
      ('book-11', 'Fundamentals of Software Architecture', 'Mark Richards', true)
    ON CONFLICT (id) DO NOTHING;
  `);
}

module.exports = {
  pool,
  initializeDatabase
};
