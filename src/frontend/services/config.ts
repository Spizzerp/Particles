import { HttpAgent } from '@dfinity/agent';

// Canister IDs - these will be populated after deployment
export const CANISTER_IDS = {
  depositManager: import.meta.env.VITE_DEPOSIT_MANAGER_CANISTER_ID || 'bd3sg-teaaa-aaaaa-qaaba-cai',
  particleRouter: import.meta.env.VITE_PARTICLE_ROUTER_CANISTER_ID || 'br5f7-7uaaa-aaaaa-qaaca-cai',
  patternBreaker: import.meta.env.VITE_PATTERN_BREAKER_CANISTER_ID || 'bw4dl-smaaa-aaaaa-qaacq-cai',
  withdrawalProcessor: import.meta.env.VITE_WITHDRAWAL_PROCESSOR_CANISTER_ID || 'b77ix-eeaaa-aaaaa-qaada-cai',
  cryptoComponents: import.meta.env.VITE_CRYPTO_COMPONENTS_CANISTER_ID || 'bkyz2-fmaaa-aaaaa-qaaaq-cai',
  chainFusionManager: import.meta.env.VITE_CHAIN_FUSION_MANAGER_CANISTER_ID || 'avqkn-guaaa-aaaaa-qaaea-cai',
};

// Network configuration
export const IC_HOST = import.meta.env.VITE_IC_HOST || 'http://localhost:8000';
export const IS_LOCAL = import.meta.env.VITE_IC_NETWORK === 'local' || !import.meta.env.VITE_IC_NETWORK;

// Create and configure the HTTP agent
export const createAgent = async (): Promise<HttpAgent> => {
  const agent = new HttpAgent({
    host: IC_HOST,
  });

  // Fetch root key for local development
  if (IS_LOCAL) {
    await agent.fetchRootKey();
  }

  return agent;
};

// Helper to check if we're in development mode
export const isDevelopment = (): boolean => {
  return import.meta.env.DEV || IS_LOCAL;
};