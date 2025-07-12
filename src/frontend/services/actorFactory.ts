import { Actor, ActorSubclass, HttpAgent, Identity } from '@dfinity/agent';
import { IDL } from '@dfinity/candid';
import { Principal } from '@dfinity/principal';
import { CANISTER_IDS, IC_HOST, IS_LOCAL } from './config';
import { idlFactory as depositManagerIDL } from '../../declarations/deposit_manager_v2';
import { idlFactory as withdrawalProcessorIDL } from '../../declarations/withdrawal_processor';
import type {
  DepositManagerService,
  WithdrawalProcessorService,
  PatternBreakerService,
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
    getCurrentMerkleRoot: IDL.Func([], [IDL.Opt(IDL.Text)], ['query']),
    getLeafCount: IDL.Func([], [IDL.Nat], ['query']),
    getAllCommitments: IDL.Func([], [IDL.Vec(IDL.Text)], ['query']),
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


// Export a function to get the appropriate actor based on environment
export const getDepositManager = async (identity?: Identity): Promise<DepositManagerService> => {
  if (!CANISTER_IDS.depositManager) {
    throw new Error('Deposit Manager canister ID not configured');
  }
  
  return await getDepositManagerActor(identity);
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
    throw new Error('Withdrawal Processor canister ID not configured');
  }
  
  return await getWithdrawalProcessorActor(identity);
};

// Actor creation for Ethereum Adapter
export const getEthereumAdapterActor = async (identity?: Identity): Promise<ActorSubclass<any>> => {
  const cacheKey = `ethereumAdapter_${identity ? identity.getPrincipal().toString() : 'anonymous'}`;
  
  if (actorCache.has(cacheKey)) {
    return actorCache.get(cacheKey) as ActorSubclass<any>;
  }

  const agent = await createAgent(identity);
  
  // Create IDL factory for Ethereum Adapter
  const ethereumAdapterIDL = ({ IDL }: any) => {
    return IDL.Service({
      checkDeposits: IDL.Func([], [IDL.Variant({ ok: IDL.Vec(IDL.Record({
        commitment: IDL.Text,
        amount: IDL.Nat,
        sender: IDL.Text,
        blockNumber: IDL.Nat,
        txHash: IDL.Text,
        timestamp: IDL.Int,
      })), err: IDL.Text })], []),
      getCurrentMerkleRoot: IDL.Func([], [IDL.Variant({ ok: IDL.Text, err: IDL.Text })], ['query']),
      getPoolAddress: IDL.Func([], [IDL.Text], []),
      getDepositAddress: IDL.Func([IDL.Principal, IDL.Text, IDL.Nat], [IDL.Variant({ ok: IDL.Text, err: IDL.Text })], []),
      getDepositAddressV2: IDL.Func([IDL.Principal, IDL.Text, IDL.Nat], [IDL.Variant({ ok: IDL.Text, err: IDL.Text })], []),
      processDepositAddresses: IDL.Func([], [IDL.Variant({ ok: IDL.Vec(IDL.Text), err: IDL.Text })], []),
      setDepositContract: IDL.Func([IDL.Text], [IDL.Variant({ ok: IDL.Null, err: IDL.Text })], []),
      getDepositInfo: IDL.Func([IDL.Text], [IDL.Opt(IDL.Record({
        commitment: IDL.Text,
        amount: IDL.Nat,
        timestamp: IDL.Int,
        userId: IDL.Principal,
        processed: IDL.Bool,
      }))], ['query']),
      processSingleDeposit: IDL.Func([IDL.Text], [IDL.Variant({ ok: IDL.Text, err: IDL.Text })], []),
      processSingleDepositV2: IDL.Func([IDL.Text], [IDL.Variant({ ok: IDL.Text, err: IDL.Text })], []),
      getDepositGasEstimate: IDL.Func([], [IDL.Variant({ 
        ok: IDL.Record({
          gasLimit: IDL.Nat,
          estimatedGasPrice: IDL.Nat,
          estimatedTotalCost: IDL.Nat,
          estimatedTotalCostEth: IDL.Text,
        }), 
        err: IDL.Text 
      })], []),
      getCycleBalance: IDL.Func([], [IDL.Nat], ['query']),
      acceptCycles: IDL.Func([], [IDL.Nat], []),
    });
  };

  const actor = Actor.createActor<any>(
    ethereumAdapterIDL,
    {
      agent,
      canisterId: CANISTER_IDS.ethereumAdapter,
    }
  );

  actorCache.set(cacheKey, actor);
  return actor;
};


// Export helper functions
export const getEthereumAdapter = async (identity?: Identity) => {
  if (!CANISTER_IDS.ethereumAdapter) {
    throw new Error('Ethereum Adapter canister ID not configured');
  }
  
  console.log('Using Ethereum Adapter canister ID:', CANISTER_IDS.ethereumAdapter);
  console.log('IC_HOST:', IC_HOST);
  console.log('IS_LOCAL:', IS_LOCAL);
  
  return await getEthereumAdapterActor(identity);
};


// Clear cache when identity changes
export const clearActorCache = () => {
  actorCache.clear();
};