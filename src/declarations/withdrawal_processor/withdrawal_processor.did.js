export const idlFactory = ({ IDL }) => {
  const Result_2 = IDL.Variant({ 'ok' : IDL.Vec(IDL.Nat), 'err' : IDL.Text });
  const TokenId = IDL.Text;
  const NullifierHash = IDL.Text;
  const MerkleRoot = IDL.Text;
  const Time = IDL.Int;
  const ZKProof = IDL.Record({
    'a' : IDL.Tuple(IDL.Text, IDL.Text),
    'b' : IDL.Tuple(
      IDL.Tuple(IDL.Text, IDL.Text),
      IDL.Tuple(IDL.Text, IDL.Text),
    ),
    'c' : IDL.Tuple(IDL.Text, IDL.Text),
    'publicSignals' : IDL.Vec(IDL.Text),
  });
  const ChainId = IDL.Nat;
  const Amount = IDL.Nat;
  const Withdrawal = IDL.Record({
    'id' : IDL.Nat,
    'tokenId' : TokenId,
    'nullifier' : NullifierHash,
    'recipient' : IDL.Text,
    'merkleRoot' : MerkleRoot,
    'timestamp' : Time,
    'proof' : ZKProof,
    'chainId' : ChainId,
    'amount' : Amount,
  });
  const Result_1 = IDL.Variant({ 'ok' : IDL.Nat, 'err' : IDL.Text });
  const Result = IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text });
  return IDL.Service({
    'batchProcessWithdrawals' : IDL.Func([IDL.Vec(IDL.Nat)], [Result_2], []),
    'getPendingWithdrawals' : IDL.Func([], [IDL.Vec(Withdrawal)], ['query']),
    'getProcessedWithdrawals' : IDL.Func([], [IDL.Vec(Withdrawal)], ['query']),
    'getWithdrawal' : IDL.Func([IDL.Nat], [IDL.Opt(Withdrawal)], ['query']),
    'getWithdrawalStats' : IDL.Func(
        [],
        [
          IDL.Record({
            'total' : IDL.Nat,
            'pending' : IDL.Nat,
            'processed' : IDL.Nat,
          }),
        ],
        ['query'],
      ),
    'getWithdrawalsByChain' : IDL.Func(
        [ChainId],
        [IDL.Vec(Withdrawal)],
        ['query'],
      ),
    'initiateWithdrawal' : IDL.Func(
        [
          NullifierHash,
          IDL.Text,
          Amount,
          TokenId,
          ChainId,
          MerkleRoot,
          ZKProof,
        ],
        [Result_1],
        [],
      ),
    'isNullifierUsed' : IDL.Func([NullifierHash], [IDL.Bool], ['query']),
    'processWithdrawal' : IDL.Func([IDL.Nat], [Result], []),
  });
};
export const init = ({ IDL }) => { return []; };
