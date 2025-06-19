import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Principal } from '@dfinity/principal';
import './Navigation.css';

interface NavigationProps {
  isConnected: boolean;
  setIsConnected: (connected: boolean) => void;
}

const Navigation: React.FC<NavigationProps> = ({ isConnected, setIsConnected }) => {
  const { principal, isAuthenticated, isLoading, connect, disconnect } = useAuth();
  const [showWalletMenu, setShowWalletMenu] = useState(false);
  
  const handleConnect = async () => {
    try {
      if (isAuthenticated) {
        await disconnect();
        setIsConnected(false);
      } else {
        await connect();
        setIsConnected(true);
      }
    } catch (error) {
      console.error('Connection failed:', error);
      alert(`Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const formatPrincipal = (principal: Principal) => {
    const str = principal.toString();
    return `${str.slice(0, 5)}...${str.slice(-3)}`;
  };

  return (
    <nav className="navigation">
      <div className="nav-container">
        <Link to="/" className="logo">
          Particle Funds
        </Link>
        
        <div className="nav-links">
          <Link to="/deposit" className="nav-link">Deposit</Link>
          <Link to="/withdraw" className="nav-link">Withdraw</Link>
          <Link to="/pools" className="nav-link">Pools</Link>
          <Link to="/privacy" className="nav-link">Privacy Pool</Link>
        </div>
        
        {isLoading ? (
          <button className="connect-btn" disabled>
            <span className="loading-spinner" />
            Connecting...
          </button>
        ) : isAuthenticated && principal ? (
          <div className="wallet-connected">
            <button 
              className="wallet-info-btn"
              onClick={() => setShowWalletMenu(!showWalletMenu)}
            >
              <span className="wallet-icon">🔐</span>
              <span className="wallet-address">{formatPrincipal(principal)}</span>
              <span className="dropdown-arrow">▼</span>
            </button>
            {showWalletMenu && (
              <div className="wallet-menu">
                <div className="wallet-menu-item">
                  <span>Principal ID:</span>
                  <span className="principal-full">{principal.toString()}</span>
                </div>
                <button 
                  className="disconnect-btn"
                  onClick={handleConnect}
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
        ) : (
          <button 
            className="connect-btn"
            onClick={handleConnect}
          >
            Connect Wallet
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navigation;