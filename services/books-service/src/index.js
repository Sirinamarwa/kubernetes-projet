const express = require('express');
const crypto = require('crypto');
const cors = require('cors');
const { pool, initializeDatabase } = require('./db');

const app = express();
const port = Number(process.env.PORT || 3001);

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'books-service' });
});

app.get('/books', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, title, author, available
      FROM books
      ORDER BY title ASC
    `);

    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ message: 'Impossible de recuperer les livres.', error: error.message });
  }
});

app.get('/books/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, title, author, available
      FROM books
      WHERE id = $1
    `, [req.params.id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Livre introuvable.' });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ message: 'Impossible de recuperer le livre.', error: error.message });
  }
});

app.post('/books', async (req, res) => {
  const { title, author, available } = req.body;

  if (!title || !author) {
    return res.status(400).json({ message: 'Les champs title et author sont obligatoires.' });
  }

  const book = {
    id: `book-${crypto.randomUUID()}`,
    title,
    author,
    available: available ?? true
  };

  try {
    await pool.query(`
      INSERT INTO books (id, title, author, available)
      VALUES ($1, $2, $3, $4)
    `, [book.id, book.title, book.author, book.available]);

    return res.status(201).json(book);
  } catch (error) {
    return res.status(500).json({ message: 'Impossible de creer le livre.', error: error.message });
  }
});

app.put('/books/:id', async (req, res) => {
  const { title, author, available } = req.body;

  if (!title || !author) {
    return res.status(400).json({ message: 'Les champs title et author sont obligatoires.' });
  }

  try {
    const result = await pool.query(`
      UPDATE books
      SET title = $2, author = $3, available = $4
      WHERE id = $1
      RETURNING id, title, author, available
    `, [req.params.id, title, author, available ?? true]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Livre introuvable.' });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ message: 'Impossible de modifier le livre.', error: error.message });
  }
});

app.delete('/books/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM books WHERE id = $1', [req.params.id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Livre introuvable.' });
    }

    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ message: 'Impossible de supprimer le livre.', error: error.message });
  }
});

async function start() {
  try {
    await initializeDatabase();
    app.listen(port, () => {
      console.log(`books-service listening on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to initialize books-service:', error);
    process.exit(1);
  }
}

start();
