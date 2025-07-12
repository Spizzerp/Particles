import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export type Amount = bigint;
export type ChainId = bigint;
export type CommitmentHash = string;
export interface Deposit {
  'id' : bigint,
  'tokenId' : TokenId,
  'user' : Principal,
  'leafIndex' : bigint,
  'timestamp' : Time,
  'chainId' : ChainId,
  'amount' : Amount,
  'commitment' : CommitmentHash,
}
export type MerkleRoot = string;
export type Result = { 'ok' : null } |
  { 'err' : string };
export type Result_1 = { 'ok' : bigint } |
  { 'err' : string };
export type Time = bigint;
export type TokenId = string;
export interface _SERVICE {
  'deposit' : ActorMethod<[Amount, TokenId, ChainId, CommitmentHash], Result_1>,
  'getAllCommitments' : ActorMethod<[], Array<string>>,
  'getCurrentMerkleRoot' : ActorMethod<[], [] | [MerkleRoot]>,
  'getDeposit' : ActorMethod<[bigint], [] | [Deposit]>,
  'getLeafCount' : ActorMethod<[], bigint>,
  'getMerkleRoot' : ActorMethod<[bigint], [] | [MerkleRoot]>,
  'getTotalDeposits' : ActorMethod<[], bigint>,
  'getUserDeposits' : ActorMethod<[Principal], Array<Deposit>>,
  'updateMerkleTree' : ActorMethod<[bigint, MerkleRoot], Result>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
