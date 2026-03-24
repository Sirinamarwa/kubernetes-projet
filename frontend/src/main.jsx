import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="page-shell">
          <section className="card">
            <h1>Le frontend a rencontre une erreur</h1>
            <p>{this.state.message}</p>
            <p>Ouvre la console du navigateur pour voir le detail technique.</p>
          </section>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
