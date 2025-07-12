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
export interface DepositResult {
  'depositId' : bigint,
  'leafIndex' : bigint,
  'merkleRoot' : string,
}
export type Result = { 'ok' : string } |
  { 'err' : string };
export type Result_1 = { 'ok' : DepositResult } |
  { 'err' : string };
export type Result_2 = { 'ok' : Array<string> } |
  { 'err' : string };
export type Time = bigint;
export type TokenId = string;
export interface _SERVICE {
  'acceptCycles' : ActorMethod<[], bigint>,
  'deposit' : ActorMethod<[Amount, TokenId, ChainId, CommitmentHash], Result_1>,
  'getAllDeposits' : ActorMethod<[], Array<Deposit>>,
  'getCommitmentsInOrder' : ActorMethod<[], Array<string>>,
  'getCurrentMerkleRoot' : ActorMethod<[], string>,
  'getCycleBalance' : ActorMethod<[], bigint>,
  'getDeposit' : ActorMethod<[bigint], [] | [Deposit]>,
  'getMerkleProof' : ActorMethod<[bigint], Result_2>,
  'getTotalDeposits' : ActorMethod<[], bigint>,
  'getUserDeposits' : ActorMethod<[Principal], Array<Deposit>>,
  'migrateDeposit' : ActorMethod<
    [bigint, Principal, bigint, string, bigint, string, bigint],
    Result_1
  >,
  'resetMerkleTree' : ActorMethod<[], Result>,
  'verifyMerkleProof' : ActorMethod<
    [string, bigint, Array<string>, string],
    boolean
  >,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
