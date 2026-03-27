const axios = require('axios');

// Service Book-Catalog de Sirine — nom K8s: myservice, port: 8080
const BOOK_CATALOG_URL = process.env.BOOK_CATALOG_URL || 'http://myservice:8080';

const checkBookExists = async (bookId) => {
  try {
    const response = await axios.get(`${BOOK_CATALOG_URL}/books/${bookId}`, { timeout: 3000 });
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return null;
    }
    // Si le service Book-Catalog est indisponible, on log et on continue
    // (à retirer une fois que Sirine aura ajouté l'endpoint /books/:id)
    console.warn(`[WARN] Book-Catalog injoignable pour bookId=${bookId}: ${error.message}`);
    return { id: bookId, available: true, _fallback: true };
  }
};

const updateBookAvailability = async (bookId, available) => {
  const endpoint = available ? 'return' : 'borrow';
  try {
    await axios.patch(`${BOOK_CATALOG_URL}/books/${bookId}/${endpoint}`, {}, { timeout: 3000 });
  } catch (error) {
    console.warn(`[WARN] Impossible de mettre à jour disponibilité du livre ${bookId}: ${error.message}`);
  }
};

const pingBookCatalog = async () => {
  try {
    await axios.get(`${BOOK_CATALOG_URL}/`, { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
};

module.exports = { checkBookExists, updateBookAvailability, pingBookCatalog };
