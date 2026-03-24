const express = require('express');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
const port = Number(process.env.PORT || 3001);

app.use(cors());
app.use(express.json());

const books = [
  {
    id: 'book-1',
    title: 'Clean Code',
    author: 'Robert C. Martin',
    publishedYear: 2008,
    available: true
  },
  {
    id: 'book-2',
    title: 'Designing Data-Intensive Applications',
    author: 'Martin Kleppmann',
    publishedYear: 2017,
    available: true
  }
];

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'books-service' });
});

app.get('/books', (_req, res) => {
  res.json(books);
});

app.get('/books/:id', (req, res) => {
  const book = books.find((item) => item.id === req.params.id);

  if (!book) {
    return res.status(404).json({ message: 'Livre introuvable.' });
  }

  return res.json(book);
});

app.post('/books', (req, res) => {
  const { title, author, publishedYear } = req.body;

  if (!title || !author) {
    return res.status(400).json({ message: 'Les champs title et author sont obligatoires.' });
  }

  const book = {
    id: `book-${crypto.randomUUID()}`,
    title,
    author,
    publishedYear: publishedYear || null,
    available: true
  };

  books.push(book);

  return res.status(201).json(book);
});

app.delete('/books/:id', (req, res) => {
  const index = books.findIndex((item) => item.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ message: 'Livre introuvable.' });
  }

  books.splice(index, 1);

  return res.status(204).send();
});

app.listen(port, () => {
  console.log(`books-service listening on port ${port}`);
});
