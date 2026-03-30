import React, { useEffect, useMemo, useState } from 'react';

const booksApiUrl = (import.meta.env.VITE_BOOKS_API_URL || 'http://localhost:3001').replace(/\/$/, '');
const loansApiUrl = (import.meta.env.VITE_LOANS_API_URL || 'http://localhost:3002').replace(/\/$/, '');

function formatLoanStatus(status) {
  return status === 'active' ? 'En cours' : 'Retourné';
}

function formatDate(value) {
  if (!value) {
    return 'Non défini';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

function categoryForBook(book) {
  const haystack = `${book.title} ${book.author}`.toLowerCase();

  if (haystack.includes('design') || haystack.includes('domain')) {
    return 'Architecture';
  }

  if (haystack.includes('clean') || haystack.includes('pragmatic') || haystack.includes('refactoring')) {
    return 'Ingénierie';
  }

  if (haystack.includes('data')) {
    return 'Science';
  }

  return 'Collection';
}

function descriptionForBook(book) {
  const descriptions = {
    'Clean Code': 'Des principes concrets pour produire un code lisible, durable et maintenable.',
    'Designing Data-Intensive Applications': 'Une référence sur les architectures fiables, scalables et distribuées.',
    Refactoring: 'Un guide pour améliorer un code existant sans altérer son comportement.'
  };

  return descriptions[book.title] || `Une sélection de ${book.author} ajoutée au catalogue.`;
}

function sortLoansByRecency(left, right) {
  const leftDate = new Date(left.return_date || left.loan_date || 0).getTime();
  const rightDate = new Date(right.return_date || right.loan_date || 0).getTime();

  if (left.status !== right.status) {
    return left.status === 'active' ? -1 : 1;
  }

  return rightDate - leftDate;
}

function App() {
  const [activeTab, setActiveTab] = useState('catalogue');
  const [loanView, setLoanView] = useState('borrow');
  const [books, setBooks] = useState([]);
  const [loans, setLoans] = useState([]);
  const [booksApiOnline, setBooksApiOnline] = useState(true);
  const [loansApiOnline, setLoansApiOnline] = useState(true);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [loadingLoans, setLoadingLoans] = useState(true);
  const [bookSearch, setBookSearch] = useState('');
  const [catalogFilter, setCatalogFilter] = useState('all');
  const [selectedBookId, setSelectedBookId] = useState('');
  const [selectedLoanId, setSelectedLoanId] = useState('');
  const [showAddBookForm, setShowAddBookForm] = useState(false);
  const [bookForm, setBookForm] = useState({
    title: '',
    author: '',
    description: '',
    category: 'Ingénierie'
  });
  const [bookVisuals, setBookVisuals] = useState({});
  const [loanForm, setLoanForm] = useState({ user_id: '', book_id: '' });
  const [creatingBook, setCreatingBook] = useState(false);
  const [creatingLoan, setCreatingLoan] = useState(false);
  const [catalogMessage, setCatalogMessage] = useState('');
  const [catalogError, setCatalogError] = useState('');
  const [loanMessage, setLoanMessage] = useState('');
  const [loanError, setLoanError] = useState('');

  async function requestJson(url, options) {
    const response = await fetch(url, options);
    let payload = null;

    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      throw new Error(payload?.message || payload?.error || 'Une erreur est survenue.');
    }

    return payload;
  }

  async function loadBooks() {
    try {
      setLoadingBooks(true);
      const payload = await requestJson(`${booksApiUrl}/books`);
      setBooks(Array.isArray(payload) ? payload : []);
      setBooksApiOnline(true);
      setCatalogError('');
    } catch (error) {
      setBooksApiOnline(false);
      setCatalogError(error.message);
    } finally {
      setLoadingBooks(false);
    }
  }

  async function loadLoans() {
    try {
      setLoadingLoans(true);
      const payload = await requestJson(`${loansApiUrl}/loans`);
      setLoans(Array.isArray(payload) ? payload : []);
      setLoansApiOnline(true);
      setLoanError('');
    } catch (error) {
      setLoansApiOnline(false);
      setLoanError(error.message);
    } finally {
      setLoadingLoans(false);
    }
  }

  useEffect(() => {
    loadBooks();
    loadLoans();
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  useEffect(() => {
    if (!selectedBookId && books.length > 0) {
      setSelectedBookId(books[0].id);
    }
  }, [books, selectedBookId]);

  useEffect(() => {
    if (!selectedLoanId && loans.length > 0) {
      setSelectedLoanId(String(loans[0].id));
    }
  }, [loans, selectedLoanId]);

  const filteredBooks = useMemo(() => {
    const byStatus = books.filter((book) => {
      if (catalogFilter === 'available') {
        return book.status === 'AVAILABLE';
      }

      if (catalogFilter === 'borrowed') {
        return book.status === 'BORROWED';
      }

      return true;
    });

    if (!bookSearch.trim()) {
      return byStatus;
    }

    const query = bookSearch.trim().toLowerCase();
    return byStatus.filter((book) =>
      `${book.title} ${book.author} ${book.id}`.toLowerCase().includes(query)
    );
  }, [books, catalogFilter, bookSearch]);

  const availableBooks = useMemo(
    () => books.filter((book) => book.status === 'AVAILABLE'),
    [books]
  );

  const activeLoans = useMemo(
    () => loans.filter((loan) => loan.status === 'active'),
    [loans]
  );

  const borrowedBooksCount = useMemo(
    () => books.filter((book) => book.status === 'BORROWED').length,
    [books]
  );

  const readerCount = useMemo(
    () => new Set(loans.map((loan) => loan.user_id).filter(Boolean)).size,
    [loans]
  );

  const selectedBook = useMemo(
    () => books.find((book) => book.id === selectedBookId) || filteredBooks[0] || books[0] || null,
    [books, filteredBooks, selectedBookId]
  );

  const selectedLoan = useMemo(
    () => loans.find((loan) => String(loan.id) === String(selectedLoanId)) || loans[0] || null,
    [loans, selectedLoanId]
  );

  const bookLookup = useMemo(() => new Map(books.map((book) => [book.id, book])), [books]);
  const orderedLoans = useMemo(() => [...loans].sort(sortLoansByRecency), [loans]);
  const selectedLoanBook = useMemo(
    () => books.find((book) => book.id === loanForm.book_id) || null,
    [books, loanForm.book_id]
  );
  const suggestedReaders = useMemo(() => {
    const readers = Array.from(new Set(loans.map((loan) => loan.user_id).filter(Boolean)));
    return readers.slice(0, 4);
  }, [loans]);
  const isBookFormValid = Boolean(bookForm.title.trim() && bookForm.author.trim());
  const isLoanFormValid = Boolean(loanForm.user_id.trim() && loanForm.book_id);
  const loanStage = !loanForm.book_id ? 1 : !loanForm.user_id.trim() ? 2 : 3;

  async function syncEverything() {
    await Promise.all([loadBooks(), loadLoans()]);
  }

  function openLoanForBook(bookId) {
    setLoanMessage('');
    setLoanError('');
    setLoanForm((current) => ({ ...current, book_id: bookId }));
    setActiveTab('loans');
    setLoanView('borrow');
  }

  async function handleCreateBook(event) {
    event.preventDefault();

    if (!bookForm.title.trim() || !bookForm.author.trim()) {
      setCatalogError('Le titre et l’auteur sont obligatoires.');
      setCatalogMessage('');
      return;
    }

    try {
      setCreatingBook(true);
      const createdBook = await requestJson(`${booksApiUrl}/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: bookForm.title.trim(),
          author: bookForm.author.trim(),
          available: true
        })
      });

      if (createdBook?.id) {
        setBookVisuals((current) => ({
          ...current,
          [createdBook.id]: {
            category: bookForm.category,
            description: bookForm.description.trim()
          }
        }));
      }

      setBookForm({
        title: '',
        author: '',
        description: '',
        category: 'Ingénierie'
      });
      setCatalogMessage('Livre ajouté au catalogue.');
      setCatalogError('');
      setShowAddBookForm(false);
      await loadBooks();
    } catch (error) {
      setCatalogError(error.message);
      setCatalogMessage('');
    } finally {
      setCreatingBook(false);
    }
  }

  async function handleCreateLoan(event) {
    event.preventDefault();

    if (!loanForm.user_id.trim() || !loanForm.book_id) {
      return;
    }

    try {
      setCreatingLoan(true);
      await requestJson(`${loansApiUrl}/loans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: loanForm.user_id.trim(),
          book_id: loanForm.book_id
        })
      });

      setLoanForm({ user_id: '', book_id: '' });
      setLoanMessage('Emprunt enregistré avec succès.');
      setLoanError('');
      await syncEverything();
      setSelectedLoanId('');
    } catch (error) {
      setLoanError(error.message);
      setLoanMessage('');
    } finally {
      setCreatingLoan(false);
    }
  }

  async function handleReturnLoan(loanId) {
    try {
      await requestJson(`${loansApiUrl}/loans/${loanId}/return`, {
        method: 'PUT'
      });
      setLoanMessage('Prêt marqué comme retourné.');
      setLoanError('');
      await syncEverything();
    } catch (error) {
      setLoanError(error.message);
      setLoanMessage('');
    }
  }

  return (
    <div className="catalog-app">
      {showAddBookForm ? (
        <div className="modal-overlay" onClick={() => setShowAddBookForm(false)}>
          <section className="book-modal" onClick={(event) => event.stopPropagation()}>
            <div className="book-modal-head">
              <div>
                <h2>Nouveau Livre</h2>
                <p>Enrichissez la collection de la bibliothèque.</p>
              </div>
              <button
                type="button"
                className="close-form modal-close"
                onClick={() => setShowAddBookForm(false)}
                aria-label="Fermer"
              >
                ×
              </button>
            </div>

            <form className="book-modal-form" onSubmit={handleCreateBook}>
              <label>
                <span>Titre de l'ouvrage</span>
                <input
                  value={bookForm.title}
                  onChange={(event) =>
                    setBookForm((current) => ({ ...current, title: event.target.value }))
                  }
                  placeholder="ex: L'Alchimiste"
                />
              </label>

              <label>
                <span>Auteur</span>
                <input
                  value={bookForm.author}
                  onChange={(event) =>
                    setBookForm((current) => ({ ...current, author: event.target.value }))
                  }
                  placeholder="ex: Paulo Coelho"
                />
              </label>

              <label>
                <span>Description</span>
                <textarea
                  value={bookForm.description}
                  onChange={(event) =>
                    setBookForm((current) => ({ ...current, description: event.target.value }))
                  }
                  placeholder="Une brève description..."
                  rows="4"
                />
              </label>

              <label>
                <span>Catégorie</span>
                <select
                  value={bookForm.category}
                  onChange={(event) =>
                    setBookForm((current) => ({ ...current, category: event.target.value }))
                  }
                >
                  <option>Ingénierie</option>
                  <option>Architecture</option>
                  <option>Design</option>
                  <option>Science</option>
                  <option>Collection</option>
                </select>
              </label>

              <button
                type="submit"
                className="solid-button modal-submit"
                disabled={creatingBook || !isBookFormValid}
              >
                {creatingBook ? 'Ajout...' : "Confirmer l'ajout"}
              </button>
            </form>
          </section>
        </div>
      ) : null}

      <header className="catalog-topbar">
        <div className="catalog-brand">
          <div className="catalog-logo">⌘</div>
          <div>
            <strong>BIBLIO</strong>
            <p>Library Manager Microservices Demo</p>
          </div>
        </div>

        <nav className="catalog-nav">
          <button
            type="button"
            className={activeTab === 'catalogue' ? 'catalog-nav-pill active' : 'catalog-nav-pill'}
            onClick={() => setActiveTab('catalogue')}
          >
            Catalogue
          </button>
          <button
            type="button"
            className={activeTab === 'loans' ? 'catalog-nav-pill active' : 'catalog-nav-pill'}
            onClick={() => setActiveTab('loans')}
          >
            Mes Emprunts
          </button>
        </nav>

        <div className="catalog-tools">
          <div className={`tool-indicator ${booksApiOnline ? 'online' : 'offline'}`} />
          <div className={`tool-indicator ${loansApiOnline ? 'online' : 'offline'}`} />
        </div>
      </header>

      {activeTab === 'catalogue' ? (
        <>
          <section className="catalog-hero">
            <div className="catalog-hero-copy">
              <span className="season-pill">Collection 2026</span>
              <h1>
                Découvrez
                <br />
                <span>l'excellence.</span>
              </h1>
              <p>
                Une sélection rigoureuse d’ouvrages pour nourrir votre esprit et illustrer le
                fonctionnement du catalogue de Sirine dans une interface plus moderne.
              </p>
            </div>

            <div className="catalog-hero-actions">
              <div className="search-shell">
                <input
                  value={bookSearch}
                  onChange={(event) => setBookSearch(event.target.value)}
                  placeholder="Rechercher un titre..."
                />
              </div>
              <button
                type="button"
                className="hero-action-button"
                onClick={() => setShowAddBookForm((current) => !current)}
              >
                <span>＋</span>
                Ajouter un livre
              </button>
            </div>
          </section>

          <section className="catalog-toolbar">
            <div className="category-pills">
              <button type="button" className={catalogFilter === 'all' ? 'category-pill active' : 'category-pill'} onClick={() => setCatalogFilter('all')}>
                Tous
              </button>
              <button type="button" className={catalogFilter === 'available' ? 'category-pill active' : 'category-pill'} onClick={() => setCatalogFilter('available')}>
                Disponibles
              </button>
              <button type="button" className={catalogFilter === 'borrowed' ? 'category-pill active' : 'category-pill'} onClick={() => setCatalogFilter('borrowed')}>
                Empruntés
              </button>
            </div>

            <button type="button" className="refresh-ghost" onClick={syncEverything}>
              Rafraîchir
            </button>
          </section>

          <section className="catalog-insights">
            <div className="insight-card">
              <span>Catalogue</span>
              <strong>{books.length}</strong>
              <p>ouvrage(s) actuellement enregistré(s)</p>
            </div>
            <div className="insight-card">
              <span>Disponibles</span>
              <strong>{availableBooks.length}</strong>
              <p>prêts à être empruntés dans la démo</p>
            </div>
            <div className="insight-card">
              <span>Empruntés</span>
              <strong>{borrowedBooksCount}</strong>
              <p>ouvrage(s) déjà sortis du catalogue</p>
            </div>
          </section>

          {catalogMessage ? <div className="floating-feedback success">{catalogMessage}</div> : null}
          {catalogError ? <div className="floating-feedback error">{catalogError}</div> : null}

          {selectedBook ? (
            <section className="book-spotlight">
              <div className="book-spotlight-copy">
                <span className="season-pill">Livre sélectionné</span>
                <h2>{selectedBook.title}</h2>
                <strong>{selectedBook.author}</strong>
                <p>{bookVisuals[selectedBook.id]?.description || descriptionForBook(selectedBook)}</p>
              </div>
              <div className="book-spotlight-meta">
                <div>
                  <span>Catégorie</span>
                  <strong>{bookVisuals[selectedBook.id]?.category || categoryForBook(selectedBook)}</strong>
                </div>
                <div>
                  <span>Statut</span>
                  <strong>{selectedBook.status === 'AVAILABLE' ? 'Disponible' : 'Déjà prêté'}</strong>
                </div>
                <button
                  type="button"
                  className="solid-button spotlight-button"
                  onClick={() => openLoanForBook(selectedBook.id)}
                  disabled={selectedBook.status !== 'AVAILABLE'}
                >
                  {selectedBook.status === 'AVAILABLE' ? 'Emprunter ce livre' : 'Indisponible'}
                </button>
              </div>
            </section>
          ) : null}

          <section className="book-card-grid">
            {loadingBooks ? <div className="empty-card">Chargement du catalogue...</div> : null}
            {!loadingBooks && filteredBooks.length === 0 ? (
              <div className="empty-card">Aucun livre trouvé pour ce filtre.</div>
            ) : null}

            {filteredBooks.map((book) => (
              <article
                key={book.id}
                className={`library-card ${selectedBook?.id === book.id ? 'active' : ''}`}
                onClick={() => setSelectedBookId(book.id)}
              >
                <div className="card-topline">
                  <span className="mini-badge">
                    {bookVisuals[book.id]?.category || categoryForBook(book)}
                  </span>
                  <span className={`availability-dot ${book.status === 'AVAILABLE' ? 'available' : 'borrowed'}`} />
                </div>

                <div className="card-content">
                  <h3>{book.title}</h3>
                  <strong>{book.author}</strong>
                  <p>{bookVisuals[book.id]?.description || descriptionForBook(book)}</p>
                </div>

                <div className="card-footer">
                  <div>
                    <span className="footer-label">Disponibilité</span>
                    <strong className={book.status === 'AVAILABLE' ? 'available-text' : 'borrowed-text'}>
                      {book.status === 'AVAILABLE' ? 'Disponible' : 'Déjà prêté'}
                    </strong>
                  </div>
                  <button
                    type="button"
                    className="round-arrow"
                    onClick={(event) => {
                      event.stopPropagation();
                      openLoanForBook(book.id);
                    }}
                    disabled={book.status !== 'AVAILABLE'}
                    title={book.status === 'AVAILABLE' ? 'Créer un emprunt' : 'Livre indisponible'}
                  >
                    →
                  </button>
                </div>
              </article>
            ))}
          </section>
        </>
      ) : (
        <>
          <section className="loan-hero">
            <div>
              <span className="season-pill">Mes emprunts</span>
              <h2>Suivez les prêts, les retours et les statuts en direct.</h2>
              <p>
                Cette vue s’appuie sur le service de Chaimaa pour gérer le cycle complet d’un
                emprunt, du lecteur jusqu’au retour.
              </p>
            </div>
            <div className="loan-hero-side">
              <div className="loan-summary">
                <div className="summary-bubble">
                  <span>Actifs</span>
                  <strong>{activeLoans.length}</strong>
                </div>
                <div className="summary-bubble">
                  <span>Historique</span>
                  <strong>{loans.length}</strong>
                </div>
                <div className="summary-bubble">
                  <span>Lecteurs</span>
                  <strong>{readerCount}</strong>
                </div>
              </div>

              <div className="loan-hero-panel">
                <span className="detail-heading">Vue métier</span>
                <h3>Un prêt met immédiatement le catalogue à jour.</h3>
                <p>
                  Cette zone pilote la création d’emprunt, puis l’historique permet de suivre le
                  statut, la date de création et le retour du livre sans changer d’écran.
                </p>
                <div className="loan-hero-points">
                  <div>
                    <span>Étape 1</span>
                    <strong>Choisir un livre disponible</strong>
                  </div>
                  <div>
                    <span>Étape 2</span>
                    <strong>Associer un lecteur</strong>
                  </div>
                  <div>
                    <span>Étape 3</span>
                    <strong>Suivre l’emprunt et le retour</strong>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="loan-subnav">
            <button
              type="button"
              className={loanView === 'borrow' ? 'loan-subnav-pill active' : 'loan-subnav-pill'}
              onClick={() => setLoanView('borrow')}
            >
              Emprunter un livre
            </button>
            <button
              type="button"
              className={loanView === 'history' ? 'loan-subnav-pill active' : 'loan-subnav-pill'}
              onClick={() => setLoanView('history')}
            >
              Historique des emprunts
            </button>
          </section>

          {loanMessage ? <div className="floating-feedback success">{loanMessage}</div> : null}
          {loanError ? <div className="floating-feedback error">{loanError}</div> : null}

          {loanView === 'borrow' ? (
          <section className="loan-layout borrow-layout">
            <div className="loan-composer">
              <div className="composer-head">
                <h3>Créer un emprunt</h3>
                <p>Sélectionne un lecteur puis un livre disponible.</p>
              </div>

              <div className="loan-stage-banner">
                <span>Étape actuelle</span>
                <strong>
                  {loanStage === 1
                    ? 'Sélection du livre'
                    : loanStage === 2
                      ? 'Identification du lecteur'
                      : 'Validation du prêt'}
                </strong>
                <small>
                  {loanStage === 1
                    ? 'Commence par choisir un ouvrage encore disponible.'
                    : loanStage === 2
                      ? 'Renseigne maintenant le lecteur concerné.'
                      : 'Tout est prêt pour enregistrer l’emprunt.'}
                </small>
              </div>

              <div className="loan-pipeline">
                <div className={`pipeline-step ${loanForm.book_id ? 'done' : 'active'}`}>
                  <span>1</span>
                  <div>
                    <strong>Choisir un livre</strong>
                    <small>Depuis le catalogue ou la liste disponible.</small>
                  </div>
                </div>
                <div className={`pipeline-step ${loanForm.user_id.trim() ? 'done' : loanForm.book_id ? 'active' : ''}`}>
                  <span>2</span>
                  <div>
                    <strong>Identifier le lecteur</strong>
                    <small>Nom libre ou lecteur déjà utilisé.</small>
                  </div>
                </div>
                <div className={`pipeline-step ${isLoanFormValid ? 'active ready' : ''}`}>
                  <span>3</span>
                  <div>
                    <strong>Confirmer le prêt</strong>
                    <small>Le statut du livre sera mis à jour automatiquement.</small>
                  </div>
                </div>
              </div>

              <form className="loan-composer-form" onSubmit={handleCreateLoan}>
                <div className="reader-shortcuts">
                  {suggestedReaders.map((reader) => (
                    <button
                      key={reader}
                      type="button"
                      className={`reader-chip ${loanForm.user_id === reader ? 'active' : ''}`}
                      onClick={() => setLoanForm((current) => ({ ...current, user_id: reader }))}
                    >
                      {reader}
                    </button>
                  ))}
                </div>

                <label>
                  <span>Lecteur</span>
                  <input
                    value={loanForm.user_id}
                    onChange={(event) => setLoanForm((current) => ({ ...current, user_id: event.target.value }))}
                    placeholder="Ex. Martin Kleppmann"
                  />
                </label>

                <label>
                  <span>Livre disponible</span>
                  <select
                    value={loanForm.book_id}
                    onChange={(event) => setLoanForm((current) => ({ ...current, book_id: event.target.value }))}
                  >
                    <option value="">Choisir un livre</option>
                    {availableBooks.map((book) => (
                      <option key={book.id} value={book.id}>
                        {book.title}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedLoanBook ? (
                  <div className="loan-book-preview">
                    <div>
                      <span>Livre sélectionné</span>
                      <strong>{selectedLoanBook.title}</strong>
                      <small>{selectedLoanBook.author}</small>
                    </div>
                    <button
                      type="button"
                      className="preview-clear"
                      onClick={() => setLoanForm((current) => ({ ...current, book_id: '' }))}
                    >
                      Changer
                    </button>
                  </div>
                ) : null}

                <div className="loan-composer-hint">
                  {availableBooks.length === 0
                    ? 'Aucun livre disponible pour le moment.'
                    : loanForm.book_id
                      ? `Livre sélectionné : ${bookLookup.get(loanForm.book_id)?.title || loanForm.book_id}`
                      : 'Choisis un lecteur et un livre pour enregistrer le prêt.'}
                </div>

                <button
                  type="submit"
                  className="solid-button wide"
                  disabled={creatingLoan || availableBooks.length === 0 || !isLoanFormValid}
                >
                  {creatingLoan ? 'Enregistrement...' : 'Créer un emprunt'}
                </button>

                <div className="loan-form-footer">
                  <span>Traitement</span>
                  <strong>
                    {creatingLoan ? 'Envoi vers Loans API...' : 'Prêt prêt à être enregistré'}
                  </strong>
                </div>
              </form>
            </div>

            <aside className="loan-detail borrow-focus-card">
              <span className="detail-heading">Récapitulatif</span>
              {selectedLoanBook ? (
                <>
                  <h3>{selectedLoanBook.title}</h3>
                  <p>{selectedLoanBook.author}</p>
                  <div className="detail-grid">
                    <div>
                      <span>Disponibilité</span>
                      <strong>Disponible</strong>
                    </div>
                    <div>
                      <span>Lecteur</span>
                      <strong>{loanForm.user_id.trim() || 'À renseigner'}</strong>
                    </div>
                    <div>
                      <span>Étape</span>
                      <strong>
                        {loanStage === 1 ? 'Sélection' : loanStage === 2 ? 'Lecteur' : 'Validation'}
                      </strong>
                    </div>
                  </div>
                  <div className="loan-detail-note">
                    <span>Contrôle final</span>
                    <p>
                      La création du prêt enverra la demande au service de Chaimaa puis mettra automatiquement le livre hors disponibilité.
                    </p>
                  </div>
                </>
              ) : (
                <div className="empty-card">Choisis un livre pour afficher le récapitulatif du prêt.</div>
              )}
            </aside>
          </section>
          ) : (
          <section className="loan-layout history-layout">
            <div className="loan-feed wide">
              <div className="composer-head">
                <h3>Historique des prêts</h3>
                <p>Clique sur une carte pour voir le détail ou marquer le retour.</p>
              </div>

              <div className="loan-feed-summary">
                <div className="feed-summary-card">
                  <span>En cours</span>
                  <strong>{activeLoans.length}</strong>
                </div>
                <div className="feed-summary-card">
                  <span>Retournés</span>
                  <strong>{loans.length - activeLoans.length}</strong>
                </div>
                <div className="feed-summary-card">
                  <span>Dernière action</span>
                  <strong>{orderedLoans[0] ? formatDate(orderedLoans[0].return_date || orderedLoans[0].loan_date) : 'Aucune'}</strong>
                </div>
              </div>

              {loadingLoans ? <div className="empty-card">Chargement des emprunts...</div> : null}
              {!loadingLoans && loans.length === 0 ? (
                <div className="empty-card">Aucun emprunt enregistré pour le moment.</div>
              ) : null}

              {orderedLoans.map((loan) => (
                <article
                  key={loan.id}
                  className={`loan-feed-card ${selectedLoan && String(selectedLoan.id) === String(loan.id) ? 'active' : ''}`}
                  onClick={() => setSelectedLoanId(String(loan.id))}
                >
                  <div className="loan-feed-head">
                    <div>
                      <span className="mini-badge">Loan #{loan.id}</span>
                      <h4>{loan.user_id}</h4>
                    </div>
                    <span className={`loan-chip ${loan.status === 'active' ? 'active' : 'returned'}`}>
                      {formatLoanStatus(loan.status)}
                    </span>
                  </div>

                  <p>{bookLookup.get(loan.book_id)?.title || loan.book_id}</p>
                  <div className="loan-card-meta">
                    <small>Début : {formatDate(loan.loan_date)}</small>
                    <small>Livre : {loan.book_id}</small>
                  </div>

                  {loan.status === 'active' ? (
                    <button
                      type="button"
                      className="ghost-button compact"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleReturnLoan(loan.id);
                      }}
                    >
                      Marquer le retour
                    </button>
                  ) : (
                    <div className="loan-returned-note">Prêt déjà clôturé</div>
                  )}
                </article>
              ))}
            </div>

            <aside className="loan-detail">
              <span className="detail-heading">Détail sélectionné</span>
              {selectedLoan ? (
                <>
                  <div className="loan-detail-top">
                    <div>
                      <h3>{selectedLoan.user_id}</h3>
                      <p>{bookLookup.get(selectedLoan.book_id)?.title || selectedLoan.book_id}</p>
                    </div>
                    <span className={`loan-chip ${selectedLoan.status === 'active' ? 'active' : 'returned'}`}>
                      {formatLoanStatus(selectedLoan.status)}
                    </span>
                  </div>
                  <div className="detail-grid">
                    <div>
                      <span>Statut</span>
                      <strong>{formatLoanStatus(selectedLoan.status)}</strong>
                    </div>
                    <div>
                      <span>Début</span>
                      <strong>{formatDate(selectedLoan.loan_date)}</strong>
                    </div>
                    <div>
                      <span>Retour</span>
                      <strong>{formatDate(selectedLoan.return_date)}</strong>
                    </div>
                    <div>
                      <span>Livre</span>
                      <strong>{selectedLoan.book_id}</strong>
                    </div>
                  </div>
                  <div className="loan-detail-note">
                    <span>Suivi métier</span>
                    <p>
                      {selectedLoan.status === 'active'
                        ? 'Ce livre est actuellement sorti du catalogue et reviendra après confirmation du retour.'
                        : 'Ce prêt est terminé. Le livre a déjà été remis en disponibilité dans le catalogue.'}
                    </p>
                  </div>
                  <div className="loan-timeline">
                    <div className="timeline-item">
                      <span className="timeline-dot start" />
                      <div>
                        <strong>Prêt créé</strong>
                        <small>{formatDate(selectedLoan.loan_date)}</small>
                      </div>
                    </div>
                    <div className="timeline-item">
                      <span className={`timeline-dot ${selectedLoan.return_date ? 'done' : 'pending'}`} />
                      <div>
                        <strong>{selectedLoan.return_date ? 'Retour enregistré' : 'En attente de retour'}</strong>
                        <small>{selectedLoan.return_date ? formatDate(selectedLoan.return_date) : 'Le livre est encore chez le lecteur.'}</small>
                      </div>
                    </div>
                  </div>
                  {selectedLoan.status === 'active' ? (
                    <button
                      type="button"
                      className="solid-button detail-action"
                      onClick={() => handleReturnLoan(selectedLoan.id)}
                    >
                      Marquer ce prêt comme retourné
                    </button>
                  ) : null}
                </>
              ) : (
                <div className="empty-card">Sélectionne un emprunt pour voir son détail.</div>
              )}
            </aside>
          </section>
          )}
        </>
      )}
    </div>
  );
}

export default App;
