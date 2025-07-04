export const idlFactory = ({ IDL }) => {
  const DepositEvent = IDL.Record({
    'blockNumber' : IDL.Nat,
    'sender' : IDL.Text,
    'timestamp' : IDL.Int,
    'txHash' : IDL.Text,
    'amount' : IDL.Nat,
    'commitment' : IDL.Text,
  });
  const Result_5 = IDL.Variant({
    'ok' : IDL.Vec(DepositEvent),
    'err' : IDL.Text,
  });
  const Result_4 = IDL.Variant({
    'ok' : IDL.Record({ 'publicKey' : IDL.Text, 'address' : IDL.Text }),
    'err' : IDL.Text,
  });
  const Result = IDL.Variant({ 'ok' : IDL.Text, 'err' : IDL.Text });
  const DepositInfo = IDL.Record({
    'userId' : IDL.Principal,
    'timestamp' : IDL.Int,
    'processed' : IDL.Bool,
    'amount' : IDL.Nat,
    'commitment' : IDL.Text,
  });
  const Result_3 = IDL.Variant({ 'ok' : IDL.Vec(IDL.Text), 'err' : IDL.Text });
  const Result_2 = IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text });
  const Result_1 = IDL.Variant({ 'ok' : IDL.Nat, 'err' : IDL.Text });
  return IDL.Service({
    'checkDeposits' : IDL.Func([], [Result_5], []),
    'debugAddressGeneration' : IDL.Func([IDL.Principal], [Result_4], []),
    'getCurrentMerkleRoot' : IDL.Func([], [Result], []),
    'getDepositAddress' : IDL.Func(
        [IDL.Principal, IDL.Text, IDL.Nat],
        [Result],
        [],
      ),
    'getDepositContract' : IDL.Func([], [IDL.Text], ['query']),
    'getDepositInfo' : IDL.Func([IDL.Text], [IDL.Opt(DepositInfo)], ['query']),
    'getKeccak256CanisterId' : IDL.Func([], [IDL.Text], ['query']),
    'getPendingDeposits' : IDL.Func(
        [],
        [IDL.Vec(IDL.Tuple(IDL.Text, DepositInfo))],
        ['query'],
      ),
    'getPoolAddress' : IDL.Func([], [IDL.Text], []),
    'processDepositAddresses' : IDL.Func([], [Result_3], []),
    'processSingleDeposit' : IDL.Func([IDL.Text], [Result], []),
    'processSingleDepositEIP1559' : IDL.Func([IDL.Text], [Result], []),
    'setDepositContract' : IDL.Func([IDL.Text], [Result_2], []),
    'setKeccak256CanisterId' : IDL.Func([IDL.Text], [Result_2], []),
    'testGetNonce' : IDL.Func([IDL.Text], [Result_1], []),
    'testRustForwarding' : IDL.Func([IDL.Text], [Result], []),
    'testRustForwardingEIP1559' : IDL.Func([IDL.Text], [Result], []),
    'testSimpleTransfer' : IDL.Func([IDL.Text], [Result], []),
  });
};
export const init = ({ IDL }) => { return []; };
