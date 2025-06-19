import { Actor, ActorSubclass, HttpAgent, Identity } from '@dfinity/agent';
import { IDL } from '@dfinity/candid';
import { Principal } from '@dfinity/principal';
import { CANISTER_IDS, IC_HOST, IS_LOCAL } from './config';
import { idlFactory as depositManagerIDL } from './candid/depositManager.did.js';
import { idlFactory as withdrawalProcessorIDL } from './candid/withdrawalProcessor.did.js';
import type {
  DepositManagerService,
  ParticleRouterService,
  WithdrawalProcessorService,
  PatternBreakerService,
  CryptoComponentsService,
} from './types';

// Cache for actors to avoid recreating them
const actorCache = new Map<string, ActorSubclass<any>>();

// IDL factories for each canister (these would normally be auto-generated)
// For now, we'll create basic versions
const createDepositManagerIDL = (): IDL.InterfaceFactory => {
  return ({ IDL }) => {
  const Deposit = IDL.Record({
    id: IDL.Nat,
    user: IDL.Principal,
    amount: IDL.Nat,
    tokenId: IDL.Text,
    chainId: IDL.Nat,
    commitment: IDL.Text,
    timestamp: IDL.Int,
    leafIndex: IDL.Nat,
  });

    return IDL.Service({
    deposit: IDL.Func(
      [IDL.Nat, IDL.Text, IDL.Nat, IDL.Text],
      [IDL.Variant({ ok: IDL.Nat, err: IDL.Text })],
      []
    ),
    getDeposit: IDL.Func([IDL.Nat], [IDL.Opt(Deposit)], ['query']),
    getUserDeposits: IDL.Func([IDL.Principal], [IDL.Vec(Deposit)], ['query']),
    getTotalDeposits: IDL.Func([], [IDL.Nat], ['query']),
    getMerkleRoot: IDL.Func([IDL.Nat], [IDL.Opt(IDL.Text)], ['query']),
    updateMerkleTree: IDL.Func(
      [IDL.Nat, IDL.Text],
      [IDL.Variant({ ok: IDL.Null, err: IDL.Text })],
      []
    ),
    });
  };
};

// Create agent with optional identity
const createAgent = async (identity?: Identity): Promise<HttpAgent> => {
  const agent = new HttpAgent({
    host: IC_HOST,
    identity,
  });

  if (IS_LOCAL) {
    await agent.fetchRootKey();
  }

  return agent;
};

// Actor creation functions
export const getDepositManagerActor = async (identity?: Identity): Promise<ActorSubclass<DepositManagerService>> => {
  const cacheKey = `depositManager_${identity ? identity.getPrincipal().toString() : 'anonymous'}`;
  
  if (actorCache.has(cacheKey)) {
    return actorCache.get(cacheKey) as ActorSubclass<DepositManagerService>;
  }

  const agent = await createAgent(identity);
  const actor = Actor.createActor<DepositManagerService>(
    depositManagerIDL,
    {
      agent,
      canisterId: CANISTER_IDS.depositManager,
    }
  );

  actorCache.set(cacheKey, actor);
  return actor;
};

// For now, we'll create a mock service for development
export const createMockDepositManagerActor = (): DepositManagerService => {
  return {
    deposit: async (amount, tokenId, chainId, commitment) => {
      console.log('Mock deposit:', { amount, tokenId, chainId, commitment });
      return { ok: BigInt(Math.floor(Math.random() * 1000)) };
    },
    getDeposit: async (depositId) => {
      console.log('Mock getDeposit:', depositId);
      // Return a mock deposit for testing
      return {
        id: depositId,
        user: Principal.fromText('2vxsx-fae'), // Anonymous principal
        amount: BigInt(1000000), // 1 token with 6 decimals
        tokenId: 'ICP',
        chainId: BigInt(0),
        commitment: '0x' + Array(64).fill('a').join(''),
        timestamp: BigInt(Date.now()),
        leafIndex: BigInt(0)
      };
    },
    getUserDeposits: async (user) => {
      console.log('Mock getUserDeposits:', user.toString());
      return [];
    },
    getTotalDeposits: async () => {
      return BigInt(0);
    },
    getMerkleRoot: async (level) => {
      // Return a mock merkle root
      return '0x' + Array(64).fill('a').join('');
    },
    getMerkleProof: async (commitment) => {
      // Return a mock merkle proof
      console.log('Mock getMerkleProof:', commitment);
      return [
        '0x' + Array(64).fill('b').join(''),
        '0x' + Array(64).fill('c').join(''),
        '0x' + Array(64).fill('d').join('')
      ];
    },
    updateMerkleTree: async (level, root) => {
      return { ok: null };
    },
  };
};

// Mock Withdrawal Processor Service
export const createMockWithdrawalProcessorActor = (): WithdrawalProcessorService => {
  const usedNullifiers = new Set<string>();
  
  return {
    initiateWithdrawal: async (nullifier, recipient, amount, tokenId, chainId, merkleRoot, proof) => {
      console.log('Mock initiateWithdrawal:', { nullifier, recipient, amount });
      if (usedNullifiers.has(nullifier)) {
        return { err: 'Nullifier already used' };
      }
      usedNullifiers.add(nullifier);
      return { ok: BigInt(Math.floor(Math.random() * 1000)) };
    },
    processWithdrawal: async (withdrawalId) => {
      console.log('Mock processWithdrawal:', withdrawalId);
      return { ok: null };
    },
    batchProcessWithdrawals: async (withdrawalIds) => {
      console.log('Mock batchProcessWithdrawals:', withdrawalIds);
      return { ok: withdrawalIds };
    },
    getWithdrawal: async (withdrawalId) => {
      console.log('Mock getWithdrawal:', withdrawalId);
      return undefined;
    },
    getPendingWithdrawals: async () => {
      return [];
    },
    getProcessedWithdrawals: async () => {
      return [];
    },
    isNullifierUsed: async (nullifier) => {
      return usedNullifiers.has(nullifier);
    },
    getWithdrawalsByChain: async (chainId) => {
      return [];
    },
    getWithdrawalStats: async () => {
      return {
        total: BigInt(0),
        pending: BigInt(0),
        processed: BigInt(0),
      };
    },
  };
};

// Export a function to get the appropriate actor based on environment
export const getDepositManager = async (identity?: Identity): Promise<DepositManagerService> => {
  // For now, always return mock while we don't have deployed canisters
  if (!CANISTER_IDS.depositManager) {
    return createMockDepositManagerActor();
  }
  
  try {
    return await getDepositManagerActor(identity);
  } catch (error) {
    console.error('Failed to create actor, falling back to mock:', error);
    return createMockDepositManagerActor();
  }
};

// Actor creation for withdrawal processor
export const getWithdrawalProcessorActor = async (identity?: Identity): Promise<ActorSubclass<WithdrawalProcessorService>> => {
  const cacheKey = `withdrawalProcessor_${identity ? identity.getPrincipal().toString() : 'anonymous'}`;
  
  if (actorCache.has(cacheKey)) {
    return actorCache.get(cacheKey) as ActorSubclass<WithdrawalProcessorService>;
  }

  const agent = await createAgent(identity);
  const actor = Actor.createActor<WithdrawalProcessorService>(
    withdrawalProcessorIDL,
    {
      agent,
      canisterId: CANISTER_IDS.withdrawalProcessor,
    }
  );

  actorCache.set(cacheKey, actor);
  return actor;
};

// Export a function to get the withdrawal processor
export const getWithdrawalProcessor = async (identity?: Identity): Promise<WithdrawalProcessorService> => {
  if (!CANISTER_IDS.withdrawalProcessor) {
    return createMockWithdrawalProcessorActor();
  }
  
  try {
    return await getWithdrawalProcessorActor(identity);
  } catch (error) {
    console.error('Failed to create withdrawal processor actor, falling back to mock:', error);
    return createMockWithdrawalProcessorActor();
  }
};

// Clear cache when identity changes
export const clearActorCache = () => {
  actorCache.clear();
};