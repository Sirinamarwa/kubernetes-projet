require('dotenv').config();
const express = require('express');
const { initDB } = require('./db');
const loansRouter = require('./routes/loans');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Health check pour Kubernetes
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'user-loans' }));

// Vérifie la connectivité avec le service Book-Catalog de Sirine
app.get('/health/book-catalog', async (req, res) => {
  const { pingBookCatalog } = require('./clients/bookCatalogClient');
  const reachable = await pingBookCatalog();
  res.json({
    bookCatalogUrl: process.env.BOOK_CATALOG_URL || 'http://myservice:8080',
    reachable,
  });
});

// Routes
app.use('/loans', loansRouter);

// Démarrage
initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`User-Loans service démarré sur le port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Erreur initialisation DB:', err);
    process.exit(1);
  });
