const booksServiceUrl = process.env.BOOKS_SERVICE_URL || 'http://localhost:3001';

async function getBookById(bookId) {
  const response = await fetch(`${booksServiceUrl}/books/${bookId}`);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`books-service returned status ${response.status}`);
  }

  return response.json();
}

module.exports = {
  getBookById
};

