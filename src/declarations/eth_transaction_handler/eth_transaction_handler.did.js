export const idlFactory = ({ IDL }) => {
  const TransactionResult = IDL.Record({
    'tx_hex' : IDL.Text,
    'tx_hash' : IDL.Text,
  });
  const Config = IDL.Record({
    'ecdsa_key_name' : IDL.Text,
    'evm_rpc_canister_id' : IDL.Principal,
    'chain_id' : IDL.Nat64,
  });
  const SignedTransaction = IDL.Record({
    'tx_hex' : IDL.Text,
    'tx_hash' : IDL.Text,
  });
  return IDL.Service({
    'forward_deposit' : IDL.Func(
        [IDL.Principal, IDL.Vec(IDL.Nat8), IDL.Text, IDL.Text, IDL.Text],
        [IDL.Variant({ 'Ok' : TransactionResult, 'Err' : IDL.Text })],
        [],
      ),
    'generate_address' : IDL.Func(
        [IDL.Principal, IDL.Vec(IDL.Nat8)],
        [IDL.Variant({ 'Ok' : IDL.Text, 'Err' : IDL.Text })],
        [],
      ),
    'get_config' : IDL.Func([], [Config], ['query']),
    'get_nonce' : IDL.Func([IDL.Text], [IDL.Nat64], ['query']),
    'greet' : IDL.Func([IDL.Text], [IDL.Text], ['query']),
    'set_config' : IDL.Func(
        [Config],
        [IDL.Variant({ 'Ok' : IDL.Null, 'Err' : IDL.Text })],
        [],
      ),
    'test_sign_transaction' : IDL.Func(
        [IDL.Principal, IDL.Vec(IDL.Nat8)],
        [IDL.Variant({ 'Ok' : SignedTransaction, 'Err' : IDL.Text })],
        [],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
