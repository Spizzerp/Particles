import { Principal } from '@dfinity/principal';

// Base types
export type TokenId = string;
export type ChainId = bigint;
export type Amount = bigint;
export type CommitmentHash = string;
export type NullifierHash = string;
export type MerkleRoot = string;

// Deposit type
export interface Deposit {
  id: bigint;
  user: Principal;
  amount: Amount;
  tokenId: TokenId;
  chainId: ChainId;
  commitment: CommitmentHash;
  timestamp: bigint;
  leafIndex: bigint;
}

// Withdrawal type
export interface Withdrawal {
  id: bigint;
  nullifier: NullifierHash;
  recipient: string;
  amount: Amount;
  tokenId: TokenId;
  chainId: ChainId;
  merkleRoot: MerkleRoot;
  proof: ZKProof;
  timestamp: bigint;
}

// ZK Proof type (legacy format)
export interface ZKProof {
  a: [string, string];
  b: [[string, string], [string, string]];
  c: [string, string];
  publicSignals: string[];
}

// PLONK Proof type (simplified format)
export interface PlonkProof {
  lro: [string, string][];
  z: [string, string];
  h1: [string, string];
  h2: [string, string];
  wire_values_at_z: string[];
  wire_values_at_z_omega: string[];
}

// Full Gnark PLONK Proof type (as expected by canister)
export interface GnarkPlonkProof {
  lro: [string, string][];
  z: [string, string];
  h: [string, string][];
  bsb22_commitments: [string, string][];
  batched_proof: {
    h: [string, string];
    claimed_values: string[];
  };
  zshifted_proof: {
    h: [string, string];
    claimed_value: string;
  };
}

// Witness data for proof generation
export interface WitnessData {
  Secret: string;
  Nullifier: string;
  Amount: string;
  MerklePath: string[];
  MerkleIndices: string[];
  MerkleRoot: string;
  NullifierHash: string;
  Recipient: string;
  Relayer: string;
  Fee: string;
  Refund: string;
}

// Route type
export interface Route {
  sourceChain: ChainId;
  destChain: ChainId;
  tokenId: TokenId;
  amount: Amount;
  fee: Amount;
}

// Pattern data type
export interface PatternData {
  user: Principal;
  deposits: Deposit[];
  withdrawals: Withdrawal[];
  patterns: string[];
}

// Result types for canister responses
export type Result<T, E> = { ok: T } | { err: E };

// Service interfaces for each canister
export interface DepositResult {
  depositId: bigint;
  leafIndex: bigint;
  merkleRoot: string;
}

export interface DepositManagerService {
  deposit: (
    amount: Amount,
    tokenId: TokenId,
    chainId: ChainId,
    commitment: CommitmentHash
  ) => Promise<Result<DepositResult, string>>;
  getDeposit: (depositId: bigint) => Promise<[] | [Deposit]>;
  getUserDeposits: (user: Principal) => Promise<Deposit[]>;
  getTotalDeposits: () => Promise<bigint>;
  getCurrentMerkleRoot: () => Promise<string>;
  getAllDeposits: () => Promise<Deposit[]>;
  getCommitmentsInOrder: () => Promise<string[]>;
  getMerkleProof: (leafIndex: bigint) => Promise<Result<string[], string>>;
  verifyMerkleProof: (
    commitment: string,
    leafIndex: bigint,
    proof: string[],
    root: string
  ) => Promise<boolean>;
  getCycleBalance: () => Promise<bigint>;
  acceptCycles: () => Promise<bigint>;
  migrateDeposit: (
    id: bigint,
    user: Principal,
    amount: bigint,
    tokenId: string,
    chainId: bigint,
    commitment: string,
    timestamp: bigint
  ) => Promise<Result<DepositResult, string>>;
}


export interface WithdrawalProcessorService {
  initiateWithdrawal: (
    nullifier: NullifierHash,
    recipient: string,
    amount: Amount,
    tokenId: TokenId,
    chainId: ChainId,
    merkleRoot: MerkleRoot,
    proof: GnarkPlonkProof
  ) => Promise<Result<bigint, string>>;
  processWithdrawal: (withdrawalId: bigint) => Promise<Result<null, string>>;
  batchProcessWithdrawals: (withdrawalIds: bigint[]) => Promise<Result<bigint[], string>>;
  getWithdrawal: (withdrawalId: bigint) => Promise<Withdrawal | undefined>;
  getPendingWithdrawals: () => Promise<Withdrawal[]>;
  getProcessedWithdrawals: () => Promise<Withdrawal[]>;
  isNullifierUsed: (nullifier: NullifierHash) => Promise<boolean>;
  getWithdrawalsByChain: (chainId: ChainId) => Promise<Withdrawal[]>;
  getWithdrawalStats: () => Promise<{
    total: bigint;
    pending: bigint;
    processed: bigint;
  }>;
}

export interface PatternBreakerService {
  analyzeUserPattern: (
    user: Principal,
    deposits: Deposit[],
    withdrawals: Withdrawal[]
  ) => Promise<Result<string[], string>>;
  generateObfuscationStrategy: (patterns: string[]) => Promise<Result<string[], string>>;
  applyObfuscation: (
    transaction: Route,
    strategies: string[]
  ) => Promise<Result<Route, string>>;
  getUserPatterns: (user: Principal) => Promise<PatternData | undefined>;
  getGlobalPatternFrequency: (pattern: string) => Promise<bigint>;
  getMostCommonPatterns: () => Promise<[string, bigint][]>;
}

