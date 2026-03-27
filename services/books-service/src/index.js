const express = require('express');
const crypto = require('crypto');
const cors = require('cors');
const { pool, initializeDatabase } = require('./db');

const app = express();
const port = Number(process.env.PORT || 3001);

app.use(cors());
app.use(express.json());

function normalizeAvailable(value) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (normalized === 'true') {
      return true;
    }

    if (normalized === 'false') {
      return false;
    }
  }

  return null;
}

async function findBookById(id) {
  const result = await pool.query(`
    SELECT id, title, author, available
    FROM books
    WHERE id = $1
  `, [id]);

  return result.rows[0] || null;
}

function serializeBook(book) {
  return {
    ...book,
    status: book.available ? 'AVAILABLE' : 'BORROWED'
  };
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'books-service' });
});

app.get('/books', async (req, res) => {
  const search = req.query.search ? String(req.query.search).trim() : '';
  const available = normalizeAvailable(req.query.available);

  if (available === null) {
    return res.status(400).json({ message: 'Le parametre available doit etre true ou false.' });
  }

  try {
    const conditions = [];
    const values = [];

    if (search) {
      values.push(`%${search}%`);
      const index = values.length;
      conditions.push(`(title ILIKE $${index} OR author ILIKE $${index})`);
    }

    if (available !== undefined) {
      values.push(available);
      conditions.push(`available = $${values.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(`
      SELECT id, title, author, available
      FROM books
      ${whereClause}
      ORDER BY title ASC
    `, values);

    return res.json(result.rows.map(serializeBook));
  } catch (error) {
    return res.status(500).json({ message: 'Impossible de recuperer les livres.', error: error.message });
  }
});

app.get('/books/:id', async (req, res) => {
  try {
    const book = await findBookById(req.params.id);

    if (!book) {
      return res.status(404).json({ message: 'Livre introuvable.' });
    }

    return res.json(serializeBook(book));
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

    return res.status(201).json(serializeBook(book));
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

    return res.json(serializeBook(result.rows[0]));
  } catch (error) {
    return res.status(500).json({ message: 'Impossible de modifier le livre.', error: error.message });
  }
});

app.patch('/books/:id/availability', async (req, res) => {
  const available = normalizeAvailable(req.body.available);

  if (available === null || available === undefined) {
    return res.status(400).json({ message: 'Le champ available est obligatoire et doit etre true ou false.' });
  }

  try {
    const result = await pool.query(`
      UPDATE books
      SET available = $2
      WHERE id = $1
      RETURNING id, title, author, available
    `, [req.params.id, available]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Livre introuvable.' });
    }

    return res.json(serializeBook(result.rows[0]));
  } catch (error) {
    return res.status(500).json({ message: 'Impossible de modifier la disponibilite du livre.', error: error.message });
  }
});

app.patch('/books/:id/borrow', async (req, res) => {
  try {
    const result = await pool.query(`
      UPDATE books
      SET available = false
      WHERE id = $1 AND available = true
      RETURNING id, title, author, available
    `, [req.params.id]);

    if (result.rowCount > 0) {
      return res.json({
        message: 'Livre emprunte avec succes.',
        book: serializeBook(result.rows[0])
      });
    }

    const book = await findBookById(req.params.id);

    if (!book) {
      return res.status(404).json({ message: 'Livre introuvable.' });
    }

    return res.status(409).json({
      code: 'BOOK_UNAVAILABLE',
      message: 'Livre deja prete ou non disponible.',
      book: serializeBook(book)
    });
  } catch (error) {
    return res.status(500).json({ message: 'Impossible d enregistrer l emprunt du livre.', error: error.message });
  }
});

app.patch('/books/:id/return', async (req, res) => {
  try {
    const result = await pool.query(`
      UPDATE books
      SET available = true
      WHERE id = $1 AND available = false
      RETURNING id, title, author, available
    `, [req.params.id]);

    if (result.rowCount > 0) {
      return res.json({
        message: 'Livre retourne avec succes.',
        book: serializeBook(result.rows[0])
      });
    }

    const book = await findBookById(req.params.id);

    if (!book) {
      return res.status(404).json({ message: 'Livre introuvable.' });
    }

    return res.status(409).json({
      code: 'BOOK_ALREADY_AVAILABLE',
      message: 'Livre deja disponible.',
      book: serializeBook(book)
    });
  } catch (error) {
    return res.status(500).json({ message: 'Impossible d enregistrer le retour du livre.', error: error.message });
  }
});

app.delete('/books/:id', async (req, res) => {
  try {
    const book = await findBookById(req.params.id);

    if (!book) {
      return res.status(404).json({ message: 'Livre introuvable.' });
    }

    if (!book.available) {
      return res.status(409).json({
        code: 'BOOK_UNAVAILABLE',
        message: 'Impossible de supprimer un livre deja prete ou non disponible.',
        book: serializeBook(book)
      });
    }

    const result = await pool.query('DELETE FROM books WHERE id = $1', [req.params.id]);

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
