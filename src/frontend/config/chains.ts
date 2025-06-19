// Chain configuration for multi-chain support
export interface ChainConfig {
  id: number;
  name: string;
  symbol: string;
  icon: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrl?: string;
  explorerUrl: string;
  testnet: boolean;
}

export const CHAIN_CONFIGS: Record<number, ChainConfig> = {
  0: {
    id: 0,
    name: 'Bitcoin',
    symbol: 'BTC',
    icon: '₿',
    nativeCurrency: {
      name: 'Bitcoin',
      symbol: 'BTC',
      decimals: 8,
    },
    explorerUrl: 'https://blockstream.info/testnet',
    testnet: true,
  },
  1: {
    id: 1,
    name: 'Ethereum',
    symbol: 'ETH',
    icon: 'Ξ',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrl: import.meta.env.VITE_ETHEREUM_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/demo',
    explorerUrl: 'https://sepolia.etherscan.io',
    testnet: true,
  },
  2: {
    id: 2,
    name: 'Internet Computer',
    symbol: 'ICP',
    icon: '∞',
    nativeCurrency: {
      name: 'ICP',
      symbol: 'ICP',
      decimals: 8,
    },
    explorerUrl: 'https://dashboard.internetcomputer.org',
    testnet: import.meta.env.VITE_DFX_NETWORK !== 'ic',
  },
};

export function getChainConfig(chainId: number): ChainConfig | undefined {
  return CHAIN_CONFIGS[chainId];
}

export function getSupportedChains(): ChainConfig[] {
  return Object.values(CHAIN_CONFIGS);
}

export function getChainName(chainId: number): string {
  return CHAIN_CONFIGS[chainId]?.name || 'Unknown';
}

export function getChainSymbol(chainId: number): string {
  return CHAIN_CONFIGS[chainId]?.symbol || 'UNKNOWN';
}

export function getExplorerUrl(chainId: number, txHash: string): string {
  const config = CHAIN_CONFIGS[chainId];
  if (!config) return '';

  switch (chainId) {
    case 0: // Bitcoin
      return `${config.explorerUrl}/tx/${txHash}`;
    case 1: // Ethereum
      return `${config.explorerUrl}/tx/${txHash}`;
    case 2: // ICP
      return `${config.explorerUrl}/transaction/${txHash}`;
    default:
      return '';
  }
}

export function getAddressExplorerUrl(chainId: number, address: string): string {
  const config = CHAIN_CONFIGS[chainId];
  if (!config) return '';

  switch (chainId) {
    case 0: // Bitcoin
      return `${config.explorerUrl}/address/${address}`;
    case 1: // Ethereum
      return `${config.explorerUrl}/address/${address}`;
    case 2: // ICP
      return `${config.explorerUrl}/account/${address}`;
    default:
      return '';
  }
}