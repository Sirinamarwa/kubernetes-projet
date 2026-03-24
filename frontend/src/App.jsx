import React, { useEffect, useState } from 'react';

const booksApi = import.meta.env.VITE_BOOKS_API_URL || 'http://localhost:3001';
const loansApi = import.meta.env.VITE_LOANS_API_URL || 'http://localhost:3002';

const initialBookForm = {
  title: '',
  author: '',
  publishedYear: ''
};

const initialLoanForm = {
  bookId: '',
  borrowerName: '',
  dueDate: ''
};

async function parseResponse(response) {
  if (response.status === 204) {
    return null;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Une erreur est survenue.');
  }

  return data;
}

function SectionFallback({ title, message }) {
  return (
    <article className="empty-state">
      <h3>{title}</h3>
      <p>{message}</p>
    </article>
  );
}

export default function App() {
  const [books, setBooks] = useState([]);
  const [loans, setLoans] = useState([]);
  const [bookForm, setBookForm] = useState(initialBookForm);
  const [loanForm, setLoanForm] = useState(initialLoanForm);
  const [status, setStatus] = useState('Chargement des donnees...');
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    try {
      const [booksResponse, loansResponse] = await Promise.all([
        fetch(`${booksApi}/books`),
        fetch(`${loansApi}/loans`)
      ]);

      const booksData = await parseResponse(booksResponse);
      const loansData = await parseResponse(loansResponse);

      setBooks(booksData);
      setLoans(loansData);
      setStatus('Donnees synchronisees.');
    } catch (error) {
      setStatus(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleBookSubmit(event) {
    event.preventDefault();

    try {
      const response = await fetch(`${booksApi}/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: bookForm.title,
          author: bookForm.author,
          publishedYear: bookForm.publishedYear ? Number(bookForm.publishedYear) : null
        })
      });

      await parseResponse(response);
      setBookForm(initialBookForm);
      setStatus('Livre ajoute.');
      await loadData();
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function handleLoanSubmit(event) {
    event.preventDefault();

    try {
      const response = await fetch(`${loansApi}/loans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loanForm)
      });

      await parseResponse(response);
      setLoanForm(initialLoanForm);
      setStatus('Emprunt enregistre.');
      await loadData();
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function deleteBook(bookId) {
    try {
      const response = await fetch(`${booksApi}/books/${bookId}`, {
        method: 'DELETE'
      });

      await parseResponse(response);
      setStatus('Livre supprime.');
      await loadData();
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function deleteLoan(loanId) {
    try {
      const response = await fetch(`${loansApi}/loans/${loanId}`, {
        method: 'DELETE'
      });

      await parseResponse(response);
      setStatus('Emprunt supprime.');
      await loadData();
    } catch (error) {
      setStatus(error.message);
    }
  }

  const availableBooks = books.length;
  const activeBorrowers = new Set(loans.map((loan) => loan.borrowerName)).size;

  return (
    <div className="page-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">LB</div>
          <div>
            <p className="brand-title">Library Manager</p>
            <p className="brand-subtitle">Microservices • React • Docker • Kubernetes</p>
          </div>
        </div>
        <nav className="nav-links">
          <a href="#books">Livres</a>
          <a href="#loans">Emprunts</a>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-copy-block">
          <p className="eyebrow">Gestion de Bibliotheque</p>
          <h1>Une demo claire pour montrer vos services en action.</h1>
          <p className="hero-copy">
            Cette interface React orchestre la gestion des livres et des emprunts avec
            vos APIs REST. Elle est pensee pour une presentation simple, lisible et
            immediate pendant la soutenance.
          </p>
          <div className="hero-actions">
            <button onClick={loadData} type="button">
              Rafraichir les donnees
            </button>
            <span className={loading ? 'badge badge-warn' : 'badge'}>{status}</span>
          </div>
        </div>

        <div className="hero-panel">
          <div className="stat-card">
            <span>Catalogue</span>
            <strong>{availableBooks}</strong>
            <p>livres actuellement disponibles dans la demo</p>
          </div>
          <div className="stat-card">
            <span>Emprunts</span>
            <strong>{loans.length}</strong>
            <p>enregistrements conserves dans PostgreSQL</p>
          </div>
          <div className="stat-card">
            <span>Lecteurs</span>
            <strong>{activeBorrowers}</strong>
            <p>emprunteur(s) distinct(s) dans le systeme</p>
          </div>
        </div>
      </section>

      <section className="info-strip">
        <div>
          <span className="info-label">Front</span>
          <strong>React</strong>
        </div>
        <div>
          <span className="info-label">Service A</span>
          <strong>Books API</strong>
        </div>
        <div>
          <span className="info-label">Service B</span>
          <strong>Loans API</strong>
        </div>
        <div>
          <span className="info-label">DB</span>
          <strong>PostgreSQL</strong>
        </div>
      </section>

      <main className="grid">
        <section className="card" id="books">
          <div className="section-title">
            <div>
              <h2>Livres</h2>
              <p className="section-copy">Ajoutez, consultez et supprimez les ouvrages.</p>
            </div>
            <span>{books.length} ouvrage(s)</span>
          </div>

          <form className="form-grid" onSubmit={handleBookSubmit}>
            <input
              placeholder="Titre"
              value={bookForm.title}
              onChange={(event) => setBookForm({ ...bookForm, title: event.target.value })}
              required
            />
            <input
              placeholder="Auteur"
              value={bookForm.author}
              onChange={(event) => setBookForm({ ...bookForm, author: event.target.value })}
              required
            />
            <input
              placeholder="Annee"
              type="number"
              value={bookForm.publishedYear}
              onChange={(event) =>
                setBookForm({ ...bookForm, publishedYear: event.target.value })
              }
            />
            <button type="submit">Ajouter un livre</button>
          </form>

          <div className="list">
            {books.length === 0 ? (
              <SectionFallback
                title="Aucun livre"
                message="Ajoutez un ouvrage pour alimenter le catalogue."
              />
            ) : (
              books.map((book) => (
                <article className="list-item" key={book.id}>
                  <div className="list-item-body">
                    <div className="book-icon">Livre</div>
                    <div>
                      <h3>{book.title}</h3>
                      <p>
                        {book.author}
                        {book.publishedYear ? ` • ${book.publishedYear}` : ''}
                      </p>
                      <code>{book.id}</code>
                    </div>
                  </div>
                  <button className="danger-button" onClick={() => deleteBook(book.id)} type="button">
                    Supprimer
                  </button>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="card" id="loans">
          <div className="section-title">
            <div>
              <h2>Emprunts</h2>
              <p className="section-copy">Enregistrez qui emprunte quel livre.</p>
            </div>
            <span>{loans.length} emprunt(s)</span>
          </div>

          <form className="form-grid" onSubmit={handleLoanSubmit}>
            <select
              value={loanForm.bookId}
              onChange={(event) => setLoanForm({ ...loanForm, bookId: event.target.value })}
              required
            >
              <option value="">Choisir un livre</option>
              {books.map((book) => (
                <option key={book.id} value={book.id}>
                  {book.title}
                </option>
              ))}
            </select>
            <input
              placeholder="Nom de l'emprunteur"
              value={loanForm.borrowerName}
              onChange={(event) =>
                setLoanForm({ ...loanForm, borrowerName: event.target.value })
              }
              required
            />
            <input
              type="datetime-local"
              value={loanForm.dueDate}
              onChange={(event) => setLoanForm({ ...loanForm, dueDate: event.target.value })}
              required
            />
            <button type="submit">Creer un emprunt</button>
          </form>

          <div className="list">
            {loans.length === 0 ? (
              <SectionFallback
                title="Aucun emprunt"
                message="Creer un emprunt pour verifier la communication avec PostgreSQL."
              />
            ) : (
              loans.map((loan) => (
                <article className="list-item" key={loan.id}>
                  <div className="list-item-body">
                    <div className="loan-icon">Pret</div>
                    <div>
                      <h3>{loan.borrowerName}</h3>
                      <p>
                        Livre : {loan.bookId}
                        <br />
                        Retour : {new Date(loan.dueDate).toLocaleString('fr-FR')}
                      </p>
                      <code>{loan.id}</code>
                    </div>
                  </div>
                  <button className="danger-button" onClick={() => deleteLoan(loan.id)} type="button">
                    Supprimer
                  </button>
                </article>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
