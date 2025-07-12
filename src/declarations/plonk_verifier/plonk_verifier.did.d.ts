import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface _SERVICE {
  'verify_bytes' : ActorMethod<
    [
      Uint8Array | number[],
      Uint8Array | number[],
      Uint8Array | number[],
      boolean,
    ],
    boolean
  >,
  'verify_hex' : ActorMethod<[string, string, string, boolean], boolean>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
