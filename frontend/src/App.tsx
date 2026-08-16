import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';

export function HomePage() {
  return (
    <div className="hero-card">
      <h1 className="hero-title">Ask Repo</h1>
      <p className="hero-subtitle">
        Chat with your GitHub repository codebases with AST-aware indexing, LSP symbol reference resolution, and precise file citations.
      </p>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <div className="app-shell" data-testid="app-shell">
        <header className="app-header">
          <div className="app-logo">Ask Repo</div>
        </header>
        <main className="app-main">
          <Routes>
            <Route path="/" element={<HomePage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
