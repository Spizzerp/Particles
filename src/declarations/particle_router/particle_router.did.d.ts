import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export type Amount = bigint;
export type ChainId = bigint;
export type Result = { 'ok' : null } |
  { 'err' : string };
export type Result_1 = { 'ok' : Route } |
  { 'err' : string };
export type Result_2 = { 'ok' : string } |
  { 'err' : string };
export interface Route {
  'fee' : Amount,
  'tokenId' : TokenId,
  'sourceChain' : ChainId,
  'amount' : Amount,
  'destChain' : ChainId,
}
export type TokenId = string;
export interface _SERVICE {
  'addLiquidity' : ActorMethod<[ChainId, TokenId, Amount], Result>,
  'createRoute' : ActorMethod<[ChainId, ChainId, TokenId, Amount], Result_2>,
  'findOptimalRoute' : ActorMethod<
    [ChainId, ChainId, TokenId, Amount],
    Result_1
  >,
  'getAvailableRoutes' : ActorMethod<[ChainId], Array<Route>>,
  'getLiquidity' : ActorMethod<[ChainId, TokenId], bigint>,
  'getRoute' : ActorMethod<[ChainId, ChainId, TokenId], [] | [Route]>,
  'removeLiquidity' : ActorMethod<[ChainId, TokenId, Amount], Result>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
