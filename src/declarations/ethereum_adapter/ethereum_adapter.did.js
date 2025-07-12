export const idlFactory = ({ IDL }) => {
  const DepositEvent = IDL.Record({
    'blockNumber' : IDL.Nat,
    'sender' : IDL.Text,
    'timestamp' : IDL.Int,
    'txHash' : IDL.Text,
    'amount' : IDL.Nat,
    'commitment' : IDL.Text,
  });
  const Result_8 = IDL.Variant({
    'ok' : IDL.Vec(DepositEvent),
    'err' : IDL.Text,
  });
  const Result_7 = IDL.Variant({
    'ok' : IDL.Record({ 'publicKey' : IDL.Text, 'address' : IDL.Text }),
    'err' : IDL.Text,
  });
  const Result_6 = IDL.Variant({
    'ok' : IDL.Record({
      'publicKey' : IDL.Text,
      'legacy' : IDL.Text,
      'proper' : IDL.Text,
    }),
    'err' : IDL.Text,
  });
  const Result_1 = IDL.Variant({ 'ok' : IDL.Text, 'err' : IDL.Text });
  const Result_5 = IDL.Variant({
    'ok' : IDL.Record({
      'estimatedTotalCost' : IDL.Nat,
      'estimatedTotalCostEth' : IDL.Text,
      'estimatedGasPrice' : IDL.Nat,
      'gasLimit' : IDL.Nat,
    }),
    'err' : IDL.Text,
  });
  const DepositInfo = IDL.Record({
    'userId' : IDL.Principal,
    'timestamp' : IDL.Int,
    'processed' : IDL.Bool,
    'amount' : IDL.Nat,
    'commitment' : IDL.Text,
  });
  const Result_4 = IDL.Variant({ 'ok' : IDL.Vec(IDL.Text), 'err' : IDL.Text });
  const Result_3 = IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text });
  const Result_2 = IDL.Variant({ 'ok' : IDL.Nat, 'err' : IDL.Text });
  const Result = IDL.Variant({
    'ok' : IDL.Record({
      'generatedAddress' : IDL.Text,
      'derivedFromSigning' : IDL.Text,
      'canSign' : IDL.Bool,
      'addressMatches' : IDL.Bool,
      'storedTimestamp' : IDL.Int,
    }),
    'err' : IDL.Text,
  });
  return IDL.Service({
    'acceptCycles' : IDL.Func([], [IDL.Nat], []),
    'checkDeposits' : IDL.Func([], [Result_8], []),
    'debugAddressGeneration' : IDL.Func([IDL.Principal], [Result_7], []),
    'debugCompareAddressGeneration' : IDL.Func([IDL.Principal], [Result_6], []),
    'forceProcessDeposit' : IDL.Func([IDL.Text], [Result_1], []),
    'getCurrentMerkleRoot' : IDL.Func([], [Result_1], []),
    'getCycleBalance' : IDL.Func([], [IDL.Nat], ['query']),
    'getDepositAddress' : IDL.Func(
        [IDL.Principal, IDL.Text, IDL.Nat],
        [Result_1],
        [],
      ),
    'getDepositAddressV2' : IDL.Func(
        [IDL.Principal, IDL.Text, IDL.Nat],
        [Result_1],
        [],
      ),
    'getDepositContract' : IDL.Func([], [IDL.Text], ['query']),
    'getDepositGasEstimate' : IDL.Func([], [Result_5], []),
    'getDepositInfo' : IDL.Func([IDL.Text], [IDL.Opt(DepositInfo)], ['query']),
    'getKeccak256CanisterId' : IDL.Func([], [IDL.Text], ['query']),
    'getPendingDeposits' : IDL.Func(
        [],
        [IDL.Vec(IDL.Tuple(IDL.Text, DepositInfo))],
        ['query'],
      ),
    'getPoolAddress' : IDL.Func([], [IDL.Text], []),
    'markDepositAsProcessed' : IDL.Func([IDL.Text, IDL.Text], [Result_1], []),
    'migrateOldDeposit' : IDL.Func([IDL.Text], [Result_1], []),
    'processDepositAddresses' : IDL.Func([], [Result_4], []),
    'processSingleDeposit' : IDL.Func([IDL.Text], [Result_1], []),
    'processSingleDepositEIP1559' : IDL.Func([IDL.Text], [Result_1], []),
    'processSingleDepositV2' : IDL.Func([IDL.Text], [Result_1], []),
    'recoverStuckFunds' : IDL.Func([IDL.Text, IDL.Text], [Result_1], []),
    'resetDepositStatus' : IDL.Func([IDL.Text], [Result_1], []),
    'retryV2Deposit' : IDL.Func([IDL.Text], [Result_1], []),
    'setDepositContract' : IDL.Func([IDL.Text], [Result_3], []),
    'setKeccak256CanisterId' : IDL.Func([IDL.Text], [Result_3], []),
    'testGetNonce' : IDL.Func([IDL.Text], [Result_2], []),
    'testRustForwarding' : IDL.Func([IDL.Text], [Result_1], []),
    'testRustForwardingEIP1559' : IDL.Func([IDL.Text], [Result_1], []),
    'testSimpleTransfer' : IDL.Func([IDL.Text], [Result_1], []),
    'verifyV2AddressDerivation' : IDL.Func([IDL.Text], [Result], []),
  });
};
export const init = ({ IDL }) => { return []; };
