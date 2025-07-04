// RPC service with multiple endpoint fallback support
import { ethers } from 'ethers';

interface RpcEndpoint {
  url: string;
  name: string;
  priority: number;
}

// Load RPC endpoints from environment variables
const RPC_ENDPOINTS: RpcEndpoint[] = [
  {
    url: import.meta.env.VITE_ETHEREUM_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY',
    name: 'Alchemy',
    priority: 1,
  },
  {
    url: import.meta.env.VITE_ANKR_RPC_URL || 'https://rpc.ankr.com/eth_sepolia/',
    name: 'Ankr',
    priority: 2,
  },
  {
    url: import.meta.env.VITE_INFURA_PROJECT_ID 
      ? `https://sepolia.infura.io/v3/${import.meta.env.VITE_INFURA_PROJECT_ID}`
      : 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
    name: 'Infura',
    priority: 3,
  },
  {
    url: import.meta.env.VITE_PUBLIC_RPC_1 || 'https://rpc.sepolia.org',
    name: 'Sepolia Public',
    priority: 4,
  },
  {
    url: import.meta.env.VITE_PUBLIC_RPC_2 || 'https://ethereum-sepolia.publicnode.com',
    name: 'PublicNode',
    priority: 5,
  },
].filter(endpoint => !endpoint.url.includes('YOUR_')); // Filter out unconfigured endpoints

// Add Ankr API key if provided
if (import.meta.env.VITE_ANKR_API_KEY && RPC_ENDPOINTS[1]) {
  RPC_ENDPOINTS[1].url += import.meta.env.VITE_ANKR_API_KEY;
}

// Track current working endpoint
let currentEndpointIndex = 0;

// Rate limit tracking
const rateLimitTracker = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_THRESHOLD = 10; // Max requests per window

export class RpcService {
  private static instance: RpcService;
  private currentProvider: ethers.JsonRpcProvider | null = null;
  
  private constructor() {}
  
  public static getInstance(): RpcService {
    if (!RpcService.instance) {
      RpcService.instance = new RpcService();
    }
    return RpcService.instance;
  }
  
  // Get a working provider with automatic fallback
  public async getProvider(): Promise<ethers.JsonRpcProvider> {
    if (this.currentProvider) {
      try {
        // Test if current provider is still working
        await this.currentProvider.getBlockNumber();
        return this.currentProvider;
      } catch {
        // Provider failed, try next
        console.warn('Current RPC provider failed, trying fallback...');
      }
    }
    
    // Try each endpoint until we find a working one
    for (let i = 0; i < RPC_ENDPOINTS.length; i++) {
      const index = (currentEndpointIndex + i) % RPC_ENDPOINTS.length;
      const endpoint = RPC_ENDPOINTS[index];
      
      // Check rate limit
      if (this.isRateLimited(endpoint.url)) {
        console.warn(`Rate limit active for ${endpoint.name}, skipping...`);
        continue;
      }
      
      try {
        console.log(`Trying RPC endpoint: ${endpoint.name}`);
        const provider = new ethers.JsonRpcProvider(endpoint.url);
        
        // Test the connection
        await provider.getBlockNumber();
        
        // Success! Update current index and provider
        currentEndpointIndex = index;
        this.currentProvider = provider;
        console.log(`✅ Connected to ${endpoint.name}`);
        return provider;
      } catch (error: any) {
        console.error(`Failed to connect to ${endpoint.name}:`, error.message);
        
        // Track rate limit errors
        if (error.message?.includes('429') || error.message?.includes('rate limit')) {
          this.markRateLimited(endpoint.url);
        }
      }
    }
    
    throw new Error('All RPC endpoints failed. Please try again later.');
  }
  
  // Check Ethereum balance with automatic fallback
  public async checkBalance(address: string): Promise<bigint> {
    const provider = await this.getProvider();
    
    try {
      const balance = await provider.getBalance(address);
      this.trackRequest(provider._getConnection().url);
      return balance;
    } catch (error: any) {
      // If rate limited, mark and retry with next provider
      if (error.message?.includes('429') || error.message?.includes('rate limit')) {
        const url = provider._getConnection().url;
        this.markRateLimited(url);
        this.currentProvider = null; // Force provider switch
        return this.checkBalance(address); // Retry with next provider
      }
      throw error;
    }
  }
  
  // Check for pending transactions with automatic fallback
  public async checkForDeposit(
    depositAddress: string,
    minAmount: bigint,
    startBlock?: number
  ): Promise<{ found: boolean; txHash?: string; amount?: bigint }> {
    const provider = await this.getProvider();
    
    try {
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = startBlock || currentBlock - 1000; // Look back 1000 blocks if no start specified
      
      // Get transaction history
      const filter = {
        address: null, // We want transactions TO this address
        fromBlock,
        toBlock: currentBlock,
      };
      
      // Since we can't filter by 'to' address in logs, we'll check recent blocks
      for (let blockNum = currentBlock; blockNum > fromBlock && blockNum > currentBlock - 50; blockNum--) {
        const block = await provider.getBlock(blockNum, true);
        if (!block || !block.transactions) continue;
        
        for (const tx of block.transactions) {
          if (typeof tx === 'string') continue;
          
          // Type assertion to ensure TypeScript knows this is a TransactionResponse
          const txResponse = tx as ethers.TransactionResponse;
          
          if (txResponse.to?.toLowerCase() === depositAddress.toLowerCase() && txResponse.value >= minAmount) {
            this.trackRequest(provider._getConnection().url);
            return {
              found: true,
              txHash: txResponse.hash,
              amount: txResponse.value,
            };
          }
        }
      }
      
      this.trackRequest(provider._getConnection().url);
      return { found: false };
    } catch (error: any) {
      // Handle rate limiting
      if (error.message?.includes('429') || error.message?.includes('rate limit')) {
        const url = provider._getConnection().url;
        this.markRateLimited(url);
        this.currentProvider = null;
        return this.checkForDeposit(depositAddress, minAmount, startBlock);
      }
      throw error;
    }
  }
  
  // Get transaction receipt with automatic fallback
  public async getTransactionReceipt(txHash: string): Promise<ethers.TransactionReceipt | null> {
    const provider = await this.getProvider();
    
    try {
      const receipt = await provider.getTransactionReceipt(txHash);
      this.trackRequest(provider._getConnection().url);
      return receipt;
    } catch (error: any) {
      if (error.message?.includes('429') || error.message?.includes('rate limit')) {
        const url = provider._getConnection().url;
        this.markRateLimited(url);
        this.currentProvider = null;
        return this.getTransactionReceipt(txHash);
      }
      throw error;
    }
  }
  
  // Rate limiting helpers
  private isRateLimited(url: string): boolean {
    const tracking = rateLimitTracker.get(url);
    if (!tracking) return false;
    
    if (Date.now() > tracking.resetTime) {
      rateLimitTracker.delete(url);
      return false;
    }
    
    return tracking.count >= RATE_LIMIT_THRESHOLD;
  }
  
  private markRateLimited(url: string): void {
    rateLimitTracker.set(url, {
      count: RATE_LIMIT_THRESHOLD,
      resetTime: Date.now() + RATE_LIMIT_WINDOW,
    });
  }
  
  private trackRequest(url: string): void {
    const tracking = rateLimitTracker.get(url) || { count: 0, resetTime: Date.now() + RATE_LIMIT_WINDOW };
    
    if (Date.now() > tracking.resetTime) {
      tracking.count = 1;
      tracking.resetTime = Date.now() + RATE_LIMIT_WINDOW;
    } else {
      tracking.count++;
    }
    
    rateLimitTracker.set(url, tracking);
  }
  
  // Reset provider (useful for testing or forcing endpoint switch)
  public resetProvider(): void {
    this.currentProvider = null;
    currentEndpointIndex = 0;
  }
}

// Export singleton instance
export const rpcService = RpcService.getInstance();