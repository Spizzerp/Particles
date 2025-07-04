import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface DepositEvent {
  'blockNumber' : bigint,
  'sender' : string,
  'timestamp' : bigint,
  'txHash' : string,
  'amount' : bigint,
  'commitment' : string,
}
export interface DepositInfo {
  'userId' : Principal,
  'timestamp' : bigint,
  'processed' : boolean,
  'amount' : bigint,
  'commitment' : string,
}
export type Result = { 'ok' : string } |
  { 'err' : string };
export type Result_1 = { 'ok' : bigint } |
  { 'err' : string };
export type Result_2 = { 'ok' : null } |
  { 'err' : string };
export type Result_3 = { 'ok' : Array<string> } |
  { 'err' : string };
export type Result_4 = { 'ok' : { 'publicKey' : string, 'address' : string } } |
  { 'err' : string };
export type Result_5 = { 'ok' : Array<DepositEvent> } |
  { 'err' : string };
export interface _SERVICE {
  'checkDeposits' : ActorMethod<[], Result_5>,
  'debugAddressGeneration' : ActorMethod<[Principal], Result_4>,
  'getCurrentMerkleRoot' : ActorMethod<[], Result>,
  'getDepositAddress' : ActorMethod<[Principal, string, bigint], Result>,
  'getDepositContract' : ActorMethod<[], string>,
  'getDepositInfo' : ActorMethod<[string], [] | [DepositInfo]>,
  'getKeccak256CanisterId' : ActorMethod<[], string>,
  'getPendingDeposits' : ActorMethod<[], Array<[string, DepositInfo]>>,
  'getPoolAddress' : ActorMethod<[], string>,
  'processDepositAddresses' : ActorMethod<[], Result_3>,
  'processSingleDeposit' : ActorMethod<[string], Result>,
  'processSingleDepositEIP1559' : ActorMethod<[string], Result>,
  'setDepositContract' : ActorMethod<[string], Result_2>,
  'setKeccak256CanisterId' : ActorMethod<[string], Result_2>,
  'testGetNonce' : ActorMethod<[string], Result_1>,
  'testRustForwarding' : ActorMethod<[string], Result>,
  'testRustForwardingEIP1559' : ActorMethod<[string], Result>,
  'testSimpleTransfer' : ActorMethod<[string], Result>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
