import { HttpAgent } from '@dfinity/agent';

// Canister IDs - these will be populated after deployment
// Using IC mainnet canister IDs
export const CANISTER_IDS = {
  depositManager: import.meta.env.VITE_DEPOSIT_MANAGER_CANISTER_ID || 'hhveh-piaaa-aaaaj-a2dga-cai',
  patternBreaker: import.meta.env.VITE_PATTERN_BREAKER_CANISTER_ID || 'avqkn-guaaa-aaaaa-qaaea-cai',
  withdrawalProcessor: import.meta.env.VITE_WITHDRAWAL_PROCESSOR_CANISTER_ID || 'hauct-cqaaa-aaaaj-a2dgq-cai',
  ethereumAdapter: import.meta.env.VITE_ETHEREUM_ADAPTER_CANISTER_ID || '55iy2-vaaaa-aaaas-amn7a-cai',
  internetIdentity: import.meta.env.VITE_INTERNET_IDENTITY_CANISTER_ID || 'rdmx6-jaaaa-aaaaa-aaadq-cai'
};

// Network configuration
// Check if we have a mainnet canister ID configured
const isUsingMainnetCanister = CANISTER_IDS.ethereumAdapter === '55iy2-vaaaa-aaaas-amn7a-cai';
export const IC_HOST = import.meta.env.VITE_IC_HOST || (isUsingMainnetCanister ? 'https://ic0.app' : 'http://localhost:8000');
export const IS_LOCAL = import.meta.env.VITE_IC_NETWORK === 'local' || (!import.meta.env.VITE_IC_NETWORK && !isUsingMainnetCanister && import.meta.env.DEV);

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