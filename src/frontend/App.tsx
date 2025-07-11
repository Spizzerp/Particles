import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import DepositPage from './pages/DepositPage';
import WithdrawPage from './pages/WithdrawPage';
import PoolsPage from './pages/PoolsPage';
import PrivacyPage from './pages/PrivacyPage';
import TestCommitmentPage from './pages/TestCommitmentPage';
import Navigation from './components/Navigation';
import { AuthProvider } from './contexts/AuthContext';

function AppContent() {
  const [isConnected, setIsConnected] = useState(false);
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  return (
    <div className="app">
      {!isHomePage && <Navigation isConnected={isConnected} setIsConnected={setIsConnected} />}
      <main className={isHomePage ? '' : 'main-content'}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/deposit" element={<DepositPage />} />
          <Route path="/withdraw" element={<WithdrawPage />} />
          <Route path="/pools" element={<PoolsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/test-commitment" element={<TestCommitmentPage />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;