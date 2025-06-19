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
export type NullifierHash = string;
export interface PatternData {
  'patterns' : Array<string>,
  'user' : Principal,
  'withdrawals' : Array<Withdrawal>,
  'deposits' : Array<Deposit>,
}
export type Result = { 'ok' : Array<string> } |
  { 'err' : string };
export type Result_1 = { 'ok' : Route } |
  { 'err' : string };
export interface Route {
  'fee' : Amount,
  'tokenId' : TokenId,
  'sourceChain' : ChainId,
  'amount' : Amount,
  'destChain' : ChainId,
}
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
  'analyzeUserPattern' : ActorMethod<
    [Principal, Array<Deposit>, Array<Withdrawal>],
    Result
  >,
  'applyObfuscation' : ActorMethod<[Route, Array<string>], Result_1>,
  'generateObfuscationStrategy' : ActorMethod<[Array<string>], Result>,
  'getGlobalPatternFrequency' : ActorMethod<[string], bigint>,
  'getMostCommonPatterns' : ActorMethod<[], Array<[string, bigint]>>,
  'getUserPatterns' : ActorMethod<[Principal], [] | [PatternData]>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
