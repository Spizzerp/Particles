// Temporarily comment out IdentityKit to test basic auth
// import { IdentityKitAuthType, IdentityKitProvider, IdentityKitTheme } from '@nfid/identitykit';
import { Identity } from '@dfinity/agent';
import { AuthClient } from '@dfinity/auth-client';
import { Principal } from '@dfinity/principal';

export interface AuthResult {
  principal: Principal;
  identity: Identity;
}

export class AuthService {
  private authClient: AuthClient | null = null;
  private identity: Identity | null = null;
  
  // Get the identity provider URL based on environment
  private getIdentityProviderUrl(): string {
    if (import.meta.env.VITE_DFX_NETWORK === 'ic') {
      return 'https://identity.ic0.app';
    }
    // For local development - use subdomain format
    const iiCanisterId = import.meta.env.VITE_INTERNET_IDENTITY_CANISTER_ID || 'rdmx6-jaaaa-aaaaa-aaadq-cai';
    return `http://${iiCanisterId}.localhost:8000`;
  }

  async init(): Promise<void> {
    this.authClient = await AuthClient.create({
      idleOptions: {
        disableIdle: true,
      }
    });
  }

  async connect(provider?: any): Promise<AuthResult> {
    if (!this.authClient) {
      await this.init();
    }

    // Check if already authenticated
    const isAuthenticated = await this.authClient!.isAuthenticated();
    
    if (isAuthenticated) {
      const identity = this.authClient!.getIdentity();
      const principal = identity.getPrincipal();
      this.identity = identity;
      return { principal, identity };
    }

    // Temporarily skip IdentityKit configuration

    const identityProviderUrl = this.getIdentityProviderUrl();

    return new Promise((resolve, reject) => {
      this.authClient!.login({
        identityProvider: identityProviderUrl,
        maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000), // 7 days
        windowOpenerFeatures: `width=525,height=705,left=${window.screen.width / 2 - 525 / 2},top=${window.screen.height / 2 - 705 / 2},toolbar=0,location=0,menubar=0`,
        onSuccess: async () => {
          const identity = this.authClient!.getIdentity();
          const principal = identity.getPrincipal();
          this.identity = identity;
          resolve({ principal, identity });
        },
        onError: (error) => {
          console.error('Authentication failed:', error);
          reject(new Error(error || 'Authentication failed'));
        },
      });
    });
  }

  async connectWithNFID(): Promise<AuthResult> {
    // Temporarily disabled
    return this.connect();
  }

  async disconnect(): Promise<void> {
    if (this.authClient) {
      await this.authClient.logout();
      this.identity = null;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    if (!this.authClient) {
      await this.init();
    }
    return this.authClient!.isAuthenticated();
  }

  getIdentity(): Identity | null {
    return this.identity;
  }

  async getPrincipal(): Promise<Principal | null> {
    const isAuth = await this.isAuthenticated();
    if (isAuth && this.authClient) {
      return this.authClient.getIdentity().getPrincipal();
    }
    return null;
  }

  // Helper to restore session on page reload
  async restoreSession(): Promise<AuthResult | null> {
    if (!this.authClient) {
      await this.init();
    }

    const isAuthenticated = await this.authClient!.isAuthenticated();
    if (isAuthenticated) {
      const identity = this.authClient!.getIdentity();
      const principal = identity.getPrincipal();
      this.identity = identity;
      return { principal, identity };
    }
    
    return null;
  }
}

// Singleton instance
export const authService = new AuthService();