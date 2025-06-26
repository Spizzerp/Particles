import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export type Amount = bigint;
export type ChainId = bigint;
export type MerkleRoot = string;
export type NullifierHash = string;
export type Result = { 'ok' : null } |
  { 'err' : string };
export type Result_1 = { 'ok' : bigint } |
  { 'err' : string };
export type Result_2 = { 'ok' : Array<bigint> } |
  { 'err' : string };
export type Time = bigint;
export type TokenId = string;
export interface Withdrawal {
  'id' : bigint,
  'tokenId' : TokenId,
  'nullifier' : NullifierHash,
  'recipient' : string,
  'merkleRoot' : MerkleRoot,
  'timestamp' : Time,
  'proof' : ZKProof,
  'chainId' : ChainId,
  'amount' : Amount,
}
export interface ZKProof {
  'a' : [string, string],
  'b' : [[string, string], [string, string]],
  'c' : [string, string],
  'publicSignals' : Array<string>,
}
export interface PlonkProof {
  'lro' : Array<[string, string]>,
  'z' : [string, string],
  'h' : Array<[string, string]>,
  'batched_proof' : {
    'h' : [string, string],
    'claimed_values' : Array<string>,
  },
  'zshifted_proof' : {
    'h' : [string, string],
    'claimed_value' : string,
  },
  'bsb22_commitments' : Array<[string, string]>,
}
export interface _SERVICE {
  'batchProcessWithdrawals' : ActorMethod<[Array<bigint>], Result_2>,
  'getPendingWithdrawals' : ActorMethod<[], Array<Withdrawal>>,
  'getProcessedWithdrawals' : ActorMethod<[], Array<Withdrawal>>,
  'getWithdrawal' : ActorMethod<[bigint], [] | [Withdrawal]>,
  'getWithdrawalStats' : ActorMethod<
    [],
    { 'total' : bigint, 'pending' : bigint, 'processed' : bigint }
  >,
  'getWithdrawalsByChain' : ActorMethod<[ChainId], Array<Withdrawal>>,
  'initiateWithdrawal' : ActorMethod<
    [NullifierHash, string, Amount, TokenId, ChainId, MerkleRoot, PlonkProof],
    Result_1
  >,
  'isNullifierUsed' : ActorMethod<[NullifierHash], boolean>,
  'processWithdrawal' : ActorMethod<[bigint], Result>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
