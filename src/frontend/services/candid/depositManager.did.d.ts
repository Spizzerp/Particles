import { IDL } from '@dfinity/candid';

export const idlFactory: IDL.InterfaceFactory;
export const init: ({ IDL }: { IDL: IDL }) => IDL.Type[];