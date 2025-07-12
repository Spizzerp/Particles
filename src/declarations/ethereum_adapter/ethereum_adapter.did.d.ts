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
export type Result = {
    'ok' : {
      'generatedAddress' : string,
      'derivedFromSigning' : string,
      'canSign' : boolean,
      'addressMatches' : boolean,
      'storedTimestamp' : bigint,
    }
  } |
  { 'err' : string };
export type Result_1 = { 'ok' : string } |
  { 'err' : string };
export type Result_2 = { 'ok' : bigint } |
  { 'err' : string };
export type Result_3 = { 'ok' : null } |
  { 'err' : string };
export type Result_4 = { 'ok' : Array<string> } |
  { 'err' : string };
export type Result_5 = {
    'ok' : {
      'estimatedTotalCost' : bigint,
      'estimatedTotalCostEth' : string,
      'estimatedGasPrice' : bigint,
      'gasLimit' : bigint,
    }
  } |
  { 'err' : string };
export type Result_6 = {
    'ok' : { 'publicKey' : string, 'legacy' : string, 'proper' : string }
  } |
  { 'err' : string };
export type Result_7 = { 'ok' : { 'publicKey' : string, 'address' : string } } |
  { 'err' : string };
export type Result_8 = { 'ok' : Array<DepositEvent> } |
  { 'err' : string };
export interface _SERVICE {
  'acceptCycles' : ActorMethod<[], bigint>,
  'checkDeposits' : ActorMethod<[], Result_8>,
  'debugAddressGeneration' : ActorMethod<[Principal], Result_7>,
  'debugCompareAddressGeneration' : ActorMethod<[Principal], Result_6>,
  'forceProcessDeposit' : ActorMethod<[string], Result_1>,
  'getCurrentMerkleRoot' : ActorMethod<[], Result_1>,
  'getCycleBalance' : ActorMethod<[], bigint>,
  'getDepositAddress' : ActorMethod<[Principal, string, bigint], Result_1>,
  'getDepositAddressV2' : ActorMethod<[Principal, string, bigint], Result_1>,
  'getDepositContract' : ActorMethod<[], string>,
  'getDepositGasEstimate' : ActorMethod<[], Result_5>,
  'getDepositInfo' : ActorMethod<[string], [] | [DepositInfo]>,
  'getKeccak256CanisterId' : ActorMethod<[], string>,
  'getPendingDeposits' : ActorMethod<[], Array<[string, DepositInfo]>>,
  'getPoolAddress' : ActorMethod<[], string>,
  'markDepositAsProcessed' : ActorMethod<[string, string], Result_1>,
  'migrateOldDeposit' : ActorMethod<[string], Result_1>,
  'processDepositAddresses' : ActorMethod<[], Result_4>,
  'processSingleDeposit' : ActorMethod<[string], Result_1>,
  'processSingleDepositEIP1559' : ActorMethod<[string], Result_1>,
  'processSingleDepositV2' : ActorMethod<[string], Result_1>,
  'recoverStuckFunds' : ActorMethod<[string, string], Result_1>,
  'resetDepositStatus' : ActorMethod<[string], Result_1>,
  'retryV2Deposit' : ActorMethod<[string], Result_1>,
  'setDepositContract' : ActorMethod<[string], Result_3>,
  'setKeccak256CanisterId' : ActorMethod<[string], Result_3>,
  'testGetNonce' : ActorMethod<[string], Result_2>,
  'testRustForwarding' : ActorMethod<[string], Result_1>,
  'testRustForwardingEIP1559' : ActorMethod<[string], Result_1>,
  'testSimpleTransfer' : ActorMethod<[string], Result_1>,
  'verifyV2AddressDerivation' : ActorMethod<[string], Result>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
