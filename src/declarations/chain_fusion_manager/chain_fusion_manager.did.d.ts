import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export type BitcoinAddress = string;
export type BitcoinNetwork = { 'mainnet' : null } |
  { 'regtest' : null } |
  { 'testnet' : null };
export interface ChainFusionManager {
  'bridgeFromBitcoin' : ActorMethod<[Principal, Satoshi, string], Result_1>,
  'bridgeFromEthereum' : ActorMethod<[Principal, Wei, string], Result_1>,
  'generateBitcoinAddress' : ActorMethod<[Principal], Result_5>,
  'generateEthereumAddress' : ActorMethod<[Principal], Result_4>,
  'getBitcoinBalance' : ActorMethod<[BitcoinAddress], Result_3>,
  'getEthereumBalance' : ActorMethod<[EthereumAddress], Result_2>,
  'getKeyName' : ActorMethod<[], string>,
  'getSupportedChains' : ActorMethod<[], Array<string>>,
  'sendBitcoinTransaction' : ActorMethod<
    [Principal, BitcoinAddress, Satoshi, BitcoinNetwork],
    Result_1
  >,
  'sendEthereumTransaction' : ActorMethod<
    [Principal, EthereumAddress, Wei],
    Result_1
  >,
  'signWithEcdsa' : ActorMethod<[Principal, Uint8Array | number[]], Result>,
}
export type EthereumAddress = string;
export type Result = { 'ok' : Uint8Array | number[] } |
  { 'err' : string };
export type Result_1 = { 'ok' : string } |
  { 'err' : string };
export type Result_2 = { 'ok' : Wei } |
  { 'err' : string };
export type Result_3 = { 'ok' : Satoshi } |
  { 'err' : string };
export type Result_4 = { 'ok' : EthereumAddress } |
  { 'err' : string };
export type Result_5 = { 'ok' : BitcoinAddress } |
  { 'err' : string };
export type Satoshi = bigint;
export type Wei = bigint;
export interface _SERVICE extends ChainFusionManager {}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
