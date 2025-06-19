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

// ZK Proof type
export interface ZKProof {
  a: [string, string];
  b: [[string, string], [string, string]];
  c: [string, string];
  publicSignals: string[];
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
export interface DepositManagerService {
  deposit: (
    amount: Amount,
    tokenId: TokenId,
    chainId: ChainId,
    commitment: CommitmentHash
  ) => Promise<Result<bigint, string>>;
  getDeposit: (depositId: bigint) => Promise<Deposit | undefined>;
  getUserDeposits: (user: Principal) => Promise<Deposit[]>;
  getTotalDeposits: () => Promise<bigint>;
  getMerkleRoot: (level?: bigint) => Promise<MerkleRoot | undefined>;
  getMerkleProof: (commitment: CommitmentHash) => Promise<string[]>;
  updateMerkleTree: (level: bigint, root: MerkleRoot) => Promise<Result<null, string>>;
}

export interface ParticleRouterService {
  createRoute: (
    sourceChain: ChainId,
    destChain: ChainId,
    tokenId: TokenId,
    baseFee: Amount
  ) => Promise<Result<string, string>>;
  findOptimalRoute: (
    sourceChain: ChainId,
    destChain: ChainId,
    tokenId: TokenId,
    amount: Amount
  ) => Promise<Result<Route, string>>;
  addLiquidity: (
    chainId: ChainId,
    tokenId: TokenId,
    amount: Amount
  ) => Promise<Result<null, string>>;
  removeLiquidity: (
    chainId: ChainId,
    tokenId: TokenId,
    amount: Amount
  ) => Promise<Result<null, string>>;
  getRoute: (
    sourceChain: ChainId,
    destChain: ChainId,
    tokenId: TokenId
  ) => Promise<Route | undefined>;
  getLiquidity: (chainId: ChainId, tokenId: TokenId) => Promise<bigint>;
  getAvailableRoutes: (sourceChain: ChainId) => Promise<Route[]>;
}

export interface WithdrawalProcessorService {
  initiateWithdrawal: (
    nullifier: NullifierHash,
    recipient: string,
    amount: Amount,
    tokenId: TokenId,
    chainId: ChainId,
    merkleRoot: MerkleRoot,
    proof: ZKProof
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

export interface CryptoComponentsService {
  generateCommitment: (
    secret: string,
    nullifier: string,
    amount: bigint
  ) => Promise<Result<CommitmentHash, string>>;
  generateNullifier: (
    secret: string,
    leafIndex: bigint
  ) => Promise<Result<NullifierHash, string>>;
  addLeaf: (commitment: CommitmentHash) => Promise<Result<bigint, string>>;
  getMerkleProof: (leafIndex: bigint) => Promise<Result<CommitmentHash[], string>>;
  verifyMerkleProof: (
    leaf: CommitmentHash,
    proof: CommitmentHash[],
    root: MerkleRoot,
    leafIndex: bigint
  ) => Promise<boolean>;
  generateZKProof: (
    secret: string,
    nullifier: string,
    recipient: string,
    amount: bigint,
    merkleRoot: MerkleRoot,
    merkleProof: CommitmentHash[],
    leafIndex: bigint
  ) => Promise<Result<ZKProof, string>>;
  getCurrentMerkleRoot: () => Promise<MerkleRoot | undefined>;
  getMerkleRootAtLevel: (level: bigint) => Promise<MerkleRoot | undefined>;
  getTreeDepth: () => Promise<bigint>;
  getLeafCount: () => Promise<bigint>;
}