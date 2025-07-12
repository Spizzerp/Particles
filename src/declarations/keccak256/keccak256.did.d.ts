import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface HashRequest { 'data' : Uint8Array | number[] }
export interface HashResponse { 'hash' : Uint8Array | number[] }
export interface _SERVICE {
  'health' : ActorMethod<[], string>,
  'keccak256' : ActorMethod<[HashRequest], HashResponse>,
  'keccak256_hex' : ActorMethod<[HashRequest], string>,
  'version' : ActorMethod<[], string>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
