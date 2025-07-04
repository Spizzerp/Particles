import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface Config {
  'ecdsa_key_name' : string,
  'evm_rpc_canister_id' : Principal,
  'chain_id' : bigint,
}
export interface SignedTransaction { 'tx_hex' : string, 'tx_hash' : string }
export interface TransactionResult { 'tx_hex' : string, 'tx_hash' : string }
export interface _SERVICE {
  'forward_deposit' : ActorMethod<
    [Principal, Uint8Array | number[], string, string, string],
    { 'Ok' : TransactionResult } |
      { 'Err' : string }
  >,
  'generate_address' : ActorMethod<
    [Principal, Uint8Array | number[]],
    { 'Ok' : string } |
      { 'Err' : string }
  >,
  'get_config' : ActorMethod<[], Config>,
  'get_nonce' : ActorMethod<[string], bigint>,
  'greet' : ActorMethod<[string], string>,
  'set_config' : ActorMethod<[Config], { 'Ok' : null } | { 'Err' : string }>,
  'test_sign_transaction' : ActorMethod<
    [Principal, Uint8Array | number[]],
    { 'Ok' : SignedTransaction } |
      { 'Err' : string }
  >,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
