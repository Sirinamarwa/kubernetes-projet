const express = require('express');
const crypto = require('crypto');
const cors = require('cors');
const { pool, initializeDatabase } = require('./db');
const { getBookById } = require('./booksClient');

const app = express();
const port = Number(process.env.PORT || 3002);

app.use(cors());
app.use(express.json());

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', service: 'loans-service' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.get('/loans', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, book_id AS "bookId", borrower_name AS "borrowerName",
             loan_date AS "loanDate", due_date AS "dueDate"
      FROM loans
      ORDER BY loan_date DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Impossible de récupérer les emprunts.', error: error.message });
  }
});

app.get('/loans/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, book_id AS "bookId", borrower_name AS "borrowerName",
             loan_date AS "loanDate", due_date AS "dueDate"
      FROM loans
      WHERE id = $1
    `, [req.params.id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Emprunt introuvable.' });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ message: 'Erreur lors de la lecture de l’emprunt.', error: error.message });
  }
});

app.post('/loans', async (req, res) => {
  const { bookId, borrowerName, dueDate } = req.body;

  if (!bookId || !borrowerName || !dueDate) {
    return res.status(400).json({ message: 'Les champs bookId, borrowerName et dueDate sont obligatoires.' });
  }

  try {
    const book = await getBookById(bookId);

    if (!book) {
      return res.status(404).json({ message: 'Le livre demandé n’existe pas.' });
    }

    const loan = {
      id: crypto.randomUUID(),
      bookId,
      borrowerName,
      dueDate
    };

    await pool.query(`
      INSERT INTO loans (id, book_id, borrower_name, due_date)
      VALUES ($1, $2, $3, $4)
    `, [loan.id, loan.bookId, loan.borrowerName, loan.dueDate]);

    return res.status(201).json({
      ...loan,
      book
    });
  } catch (error) {
    return res.status(500).json({ message: 'Impossible de créer l’emprunt.', error: error.message });
  }
});

app.delete('/loans/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM loans WHERE id = $1', [req.params.id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Emprunt introuvable.' });
    }

    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ message: 'Impossible de supprimer l’emprunt.', error: error.message });
  }
});

async function start() {
  try {
    await initializeDatabase();
    app.listen(port, () => {
      console.log(`loans-service listening on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to initialize loans-service:', error);
    process.exit(1);
  }
}

start();
