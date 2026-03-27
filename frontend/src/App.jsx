import React, { useEffect, useState } from 'react';

const booksApiUrl = (import.meta.env.VITE_BOOKS_API_URL || 'http://localhost:3001').replace(/\/$/, '');
const loansApiUrl = (import.meta.env.VITE_LOANS_API_URL || 'http://localhost:3002').replace(/\/$/, '');

function formatStatus(status) {
  return status === 'BORROWED' ? 'Déjà prêté' : 'Disponible';
}

function App() {
  const [books, setBooks] = useState([]);
  const [loanSummary, setLoanSummary] = useState({ available: false, items: [] });
  const [catalogMessage, setCatalogMessage] = useState('');
  const [catalogError, setCatalogError] = useState('');
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [formState, setFormState] = useState({ title: '', author: '' });
  const [creating, setCreating] = useState(false);

  async function requestJson(url, options) {
    const response = await fetch(url, options);
    let payload = null;

    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      throw new Error(payload?.message || 'Une erreur est survenue.');
    }

    return payload;
  }

  async function loadBooks() {
    try {
      setLoadingBooks(true);
      const payload = await requestJson(`${booksApiUrl}/books`);
      setBooks(payload);
      setCatalogError('');
    } catch (error) {
      setCatalogError(error.message);
    } finally {
      setLoadingBooks(false);
    }
  }

  async function loadLoansPreview() {
    try {
      const payload = await requestJson(`${loansApiUrl}/loans`);
      setLoanSummary({ available: true, items: Array.isArray(payload) ? payload : [] });
    } catch {
      setLoanSummary({ available: false, items: [] });
    }
  }

  useEffect(() => {
    loadBooks();
    loadLoansPreview();
  }, []);

  async function handleBorrow(bookId) {
    try {
      const payload = await requestJson(`${booksApiUrl}/books/${bookId}/borrow`, {
        method: 'PATCH'
      });
      setCatalogMessage(payload.message || 'Livre emprunté avec succès.');
      setCatalogError('');
      await loadBooks();
    } catch (error) {
      setCatalogError(error.message);
      setCatalogMessage('');
    }
  }

  async function handleReturn(bookId) {
    try {
      const payload = await requestJson(`${booksApiUrl}/books/${bookId}/return`, {
        method: 'PATCH'
      });
      setCatalogMessage(payload.message || 'Livre retourné avec succès.');
      setCatalogError('');
      await loadBooks();
    } catch (error) {
      setCatalogError(error.message);
      setCatalogMessage('');
    }
  }

  async function handleCreateBook(event) {
    event.preventDefault();

    if (!formState.title.trim() || !formState.author.trim()) {
      setCatalogError('Le titre et l auteur sont obligatoires.');
      setCatalogMessage('');
      return;
    }

    try {
      setCreating(true);
      await requestJson(`${booksApiUrl}/books`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: formState.title.trim(),
          author: formState.author.trim(),
          available: true
        })
      });

      setFormState({ title: '', author: '' });
      setCatalogMessage('Livre ajouté au catalogue.');
      setCatalogError('');
      await loadBooks();
    } catch (error) {
      setCatalogError(error.message);
      setCatalogMessage('');
    } finally {
      setCreating(false);
    }
  }

  const availableCount = books.filter((book) => book.status === 'AVAILABLE').length;
  const borrowedCount = books.filter((book) => book.status === 'BORROWED').length;
  const borrowerCount = loanSummary.available
    ? new Set(
        loanSummary.items
          .map((loan) => loan.borrowerName || loan.borrower || '')
          .filter(Boolean)
      ).size
    : 0;

  return (
    <div className="app-shell">
      <div className="page-frame">
        <header className="topbar">
          <div className="brand">
            <div className="brand-mark">LB</div>
            <div>
              <strong>Library Manager</strong>
              <p>Microservices · React · Docker · Kubernetes</p>
            </div>
          </div>

          <nav className="pill-nav">
            <a href="#livres">Livres</a>
            <a href="#emprunts">Emprunts</a>
          </nav>
        </header>

        <section className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Gestion de bibliothèque</p>
            <h1>Une démo claire pour montrer vos services en action.</h1>
            <p className="hero-text">
              Cette interface React orchestre la gestion du catalogue et prépare l’intégration
              complète avec le service des emprunts. Elle est pensée pour une présentation simple,
              lisible et immédiate pendant la soutenance.
            </p>

            <div className="hero-actions">
              <button className="primary-button" type="button" onClick={loadBooks}>
                Rafraîchir les données
              </button>
              <span className="sync-badge">Données synchronisées.</span>
            </div>

            <div className="tech-strip">
              <div className="tech-chip">
                <span>Front</span>
                <strong>React</strong>
              </div>
              <div className="tech-chip">
                <span>Service A</span>
                <strong>Books API</strong>
              </div>
              <div className="tech-chip">
                <span>Service B</span>
                <strong>Loans API</strong>
              </div>
              <div className="tech-chip">
                <span>DB</span>
                <strong>PostgreSQL</strong>
              </div>
            </div>
          </div>

          <aside className="stats-panel">
            <div className="stat-card">
              <span>Catalogue</span>
              <strong>{availableCount}</strong>
              <p>livres actuellement disponibles dans la démo</p>
            </div>
            <div className="stat-card">
              <span>Emprunts</span>
              <strong>{loanSummary.available ? loanSummary.items.length : 0}</strong>
              <p>enregistrements visibles dans l’interface</p>
            </div>
            <div className="stat-card">
              <span>Lecteurs</span>
              <strong>{borrowerCount}</strong>
              <p>emprunteur(s) distinct(s) dans le système</p>
            </div>
          </aside>
        </section>

        {catalogMessage ? <div className="feedback success">{catalogMessage}</div> : null}
        {catalogError ? <div className="feedback error">{catalogError}</div> : null}

        <main className="content-grid">
          <section className="panel" id="livres">
            <div className="panel-header">
              <div>
                <h2>Livres</h2>
                <p>Ajoutez, consultez et gérez les ouvrages du catalogue.</p>
              </div>
              <span className="counter-pill">{books.length} ouvrage(s)</span>
            </div>

            <form className="book-form" onSubmit={handleCreateBook}>
              <input
                value={formState.title}
                onChange={(event) => setFormState((current) => ({ ...current, title: event.target.value }))}
                placeholder="Titre"
              />
              <input
                value={formState.author}
                onChange={(event) => setFormState((current) => ({ ...current, author: event.target.value }))}
                placeholder="Auteur"
              />
              <button type="submit" className="primary-button" disabled={creating}>
                {creating ? 'Ajout...' : 'Ajouter'}
              </button>
            </form>

            <div className="book-list">
              {loadingBooks ? <p className="empty-state">Chargement du catalogue...</p> : null}
              {!loadingBooks && books.length === 0 ? (
                <p className="empty-state">Aucun livre disponible pour le moment.</p>
              ) : null}

              {books.map((book) => (
                <article key={book.id} className="book-row">
                  <div className="book-meta">
                    <h3>{book.title}</h3>
                    <p>{book.author}</p>
                    <span className={`status-badge ${book.status === 'AVAILABLE' ? 'available' : 'borrowed'}`}>
                      {formatStatus(book.status)}
                    </span>
                  </div>

                  <div className="book-controls">
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => handleBorrow(book.id)}
                      disabled={book.status !== 'AVAILABLE'}
                    >
                      Emprunter
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => handleReturn(book.id)}
                      disabled={book.status !== 'BORROWED'}
                    >
                      Retourner
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="panel" id="emprunts">
            <div className="panel-header">
              <div>
                <h2>Emprunts</h2>
                <p>Enregistrez qui emprunte quel livre.</p>
              </div>
              <span className="counter-pill">
                {loanSummary.available ? loanSummary.items.length : 0} emprunt(s)
              </span>
            </div>

            {loanSummary.available ? (
              <div className="loan-list">
                {loanSummary.items.length === 0 ? (
                  <p className="empty-state">Aucun emprunt pour le moment.</p>
                ) : (
                  loanSummary.items.map((loan, index) => (
                    <article key={loan.id || index} className="loan-row">
                      <strong>{loan.borrowerName || loan.borrower || 'Emprunteur'}</strong>
                      <span>Livre : {loan.bookId || loan.book_id || 'à préciser'}</span>
                      <span>Retour : {loan.dueDate || loan.due_date || 'à préciser'}</span>
                    </article>
                  ))
                )}
              </div>
            ) : (
              <div className="placeholder-box">
                <h3>Zone prête pour la suite</h3>
                <p>
                  Cette partie est déjà préparée pour l’intégration du service de Chaimaa :
                  création des prêts, dates de retour, statuts et logique métier complète.
                </p>
                <ul>
                  <li>Formulaire d’emprunt</li>
                  <li>Historique des prêts</li>
                  <li>Retours et disponibilités</li>
                  <li>Connexion avec PostgreSQL</li>
                </ul>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

export default App;
