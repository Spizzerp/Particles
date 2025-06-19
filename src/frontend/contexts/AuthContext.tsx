import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Principal } from '@dfinity/principal';
import { Identity } from '@dfinity/agent';
import { authService } from '../services/authService';

interface AuthContextType {
  principal: Principal | null;
  identity: Identity | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  connect: () => Promise<void>;
  connectWithNFID: () => Promise<void>;
  disconnect: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [principal, setPrincipal] = useState<Principal | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth service and check for existing session
  useEffect(() => {
    const initAuth = async () => {
      try {
        setIsLoading(true);
        const session = await authService.restoreSession();
        if (session) {
          setPrincipal(session.principal);
          setIdentity(session.identity);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Failed to restore session:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    initAuth();
  }, []);

  const connect = async () => {
    try {
      setIsLoading(true);
      const { principal, identity } = await authService.connect();
      setPrincipal(principal);
      setIdentity(identity);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Failed to connect:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const connectWithNFID = async () => {
    try {
      setIsLoading(true);
      const { principal, identity } = await authService.connectWithNFID();
      setPrincipal(principal);
      setIdentity(identity);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Failed to connect with NFID:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = async () => {
    try {
      setIsLoading(true);
      await authService.disconnect();
      setPrincipal(null);
      setIdentity(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Failed to disconnect:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider 
      value={{ 
        principal, 
        identity,
        isAuthenticated, 
        isLoading,
        connect, 
        connectWithNFID,
        disconnect 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};