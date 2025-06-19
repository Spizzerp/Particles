import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export type CommitmentHash = string;
export type MerkleRoot = string;
export type NullifierHash = string;
export type Result = { 'ok' : Array<CommitmentHash> } |
  { 'err' : string };
export type Result_1 = { 'ok' : ZKProof } |
  { 'err' : string };
export type Result_2 = { 'ok' : NullifierHash } |
  { 'err' : string };
export type Result_3 = { 'ok' : CommitmentHash } |
  { 'err' : string };
export type Result_4 = { 'ok' : string } |
  { 'err' : string };
export type Result_5 = { 'ok' : bigint } |
  { 'err' : string };
export interface ZKProof {
  'a' : [string, string],
  'b' : [[string, string], [string, string]],
  'c' : [string, string],
  'publicSignals' : Array<string>,
}
export interface _SERVICE {
  'addLeaf' : ActorMethod<[CommitmentHash], Result_5>,
  'decryptData' : ActorMethod<[string, string], Result_4>,
  'encryptData' : ActorMethod<[string, string], Result_4>,
  'generateCommitment' : ActorMethod<[string, string, bigint], Result_3>,
  'generateNullifier' : ActorMethod<[string, bigint], Result_2>,
  'generateZKProof' : ActorMethod<
    [string, string, string, bigint, MerkleRoot, Array<CommitmentHash>, bigint],
    Result_1
  >,
  'getCurrentMerkleRoot' : ActorMethod<[], [] | [MerkleRoot]>,
  'getLeafCount' : ActorMethod<[], bigint>,
  'getMerkleProof' : ActorMethod<[bigint], Result>,
  'getMerkleRootAtLevel' : ActorMethod<[bigint], [] | [MerkleRoot]>,
  'getTreeDepth' : ActorMethod<[], bigint>,
  'verifyMerkleProof' : ActorMethod<
    [CommitmentHash, Array<CommitmentHash>, MerkleRoot, bigint],
    boolean
  >,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
