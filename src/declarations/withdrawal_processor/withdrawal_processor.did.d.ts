import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export type Amount = bigint;
export type ChainId = bigint;
export type MerkleRoot = string;
export type NullifierHash = string;
export interface PlonkProof {
  'h' : Array<[string, string]>,
  'z' : [string, string],
  'lro' : Array<[string, string]>,
  'zshifted_proof' : { 'h' : [string, string], 'claimed_value' : string },
  'bsb22_commitments' : Array<[string, string]>,
  'batched_proof' : {
    'h' : [string, string],
    'claimed_values' : Array<string>,
  },
}
export type Result = { 'ok' : null } |
  { 'err' : string };
export type Result_1 = { 'ok' : bigint } |
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
export interface _SERVICE {
  'getPendingWithdrawals' : ActorMethod<[], Array<Withdrawal>>,
  'getProcessedWithdrawals' : ActorMethod<[], Array<Withdrawal>>,
  'getVerificationCost' : ActorMethod<
    [],
    { 'instructions' : bigint, 'cycles' : bigint, 'usdCost' : number }
  >,
  'getWithdrawal' : ActorMethod<[bigint], [] | [Withdrawal]>,
  'initiateWithdrawal' : ActorMethod<
    [NullifierHash, string, Amount, TokenId, ChainId, MerkleRoot, PlonkProof],
    Result_1
  >,
  'isNullifierUsed' : ActorMethod<[NullifierHash], boolean>,
  'processWithdrawal' : ActorMethod<[bigint], Result>,
  'setPlonkVerificationKey' : ActorMethod<[Uint8Array | number[]], Result>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
