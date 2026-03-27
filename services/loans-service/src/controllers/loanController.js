const { pool } = require('../db');
const { checkBookExists, updateBookAvailability } = require('../clients/bookCatalogClient');

const getAllLoans = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM loans ORDER BY loan_date DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getLoansByUser = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM loans WHERE user_id = $1 ORDER BY loan_date DESC',
      [req.params.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createLoan = async (req, res) => {
  const { user_id, book_id } = req.body;

  if (!user_id || !book_id) {
    return res.status(400).json({ error: 'user_id et book_id sont requis.' });
  }

  try {
    // Vérifier que le livre existe dans le service de Sirine
    const book = await checkBookExists(book_id);
    if (!book) {
      return res.status(404).json({ error: `Livre ${book_id} introuvable dans le catalogue.` });
    }

    // Vérifier qu'un prêt actif n'existe pas déjà pour ce livre
    const existing = await pool.query(
      "SELECT * FROM loans WHERE book_id = $1 AND status = 'active'",
      [book_id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Ce livre est déjà emprunté.' });
    }

    const result = await pool.query(
      "INSERT INTO loans (user_id, book_id, status) VALUES ($1, $2, 'active') RETURNING *",
      [user_id, book_id]
    );
    await updateBookAvailability(book_id, false);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const returnLoan = async (req, res) => {
  try {
    const result = await pool.query(
      "UPDATE loans SET status = 'returned', return_date = NOW() WHERE id = $1 AND status = 'active' RETURNING *",
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prêt introuvable ou déjà retourné.' });
    }
    await updateBookAvailability(result.rows[0].book_id, true);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteLoan = async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM loans WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prêt introuvable.' });
    }
    res.json({ message: 'Prêt supprimé.', loan: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAllLoans, getLoansByUser, createLoan, returnLoan, deleteLoan };
