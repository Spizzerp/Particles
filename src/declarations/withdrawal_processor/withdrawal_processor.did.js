export const idlFactory = ({ IDL }) => {
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
  const PlonkProof = IDL.Record({
    'h' : IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
    'z' : IDL.Tuple(IDL.Text, IDL.Text),
    'lro' : IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
    'zshifted_proof' : IDL.Record({
      'h' : IDL.Tuple(IDL.Text, IDL.Text),
      'claimed_value' : IDL.Text,
    }),
    'bsb22_commitments' : IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
    'batched_proof' : IDL.Record({
      'h' : IDL.Tuple(IDL.Text, IDL.Text),
      'claimed_values' : IDL.Vec(IDL.Text),
    }),
  });
  const Result_1 = IDL.Variant({ 'ok' : IDL.Nat, 'err' : IDL.Text });
  const Result = IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text });
  return IDL.Service({
    'getPendingWithdrawals' : IDL.Func([], [IDL.Vec(Withdrawal)], ['query']),
    'getProcessedWithdrawals' : IDL.Func([], [IDL.Vec(Withdrawal)], ['query']),
    'getVerificationCost' : IDL.Func(
        [],
        [
          IDL.Record({
            'instructions' : IDL.Nat,
            'cycles' : IDL.Nat,
            'usdCost' : IDL.Float64,
          }),
        ],
        ['query'],
      ),
    'getWithdrawal' : IDL.Func([IDL.Nat], [IDL.Opt(Withdrawal)], ['query']),
    'initiateWithdrawal' : IDL.Func(
        [
          NullifierHash,
          IDL.Text,
          Amount,
          TokenId,
          ChainId,
          MerkleRoot,
          PlonkProof,
        ],
        [Result_1],
        [],
      ),
    'isNullifierUsed' : IDL.Func([NullifierHash], [IDL.Bool], ['query']),
    'processWithdrawal' : IDL.Func([IDL.Nat], [Result], []),
    'setPlonkVerificationKey' : IDL.Func([IDL.Vec(IDL.Nat8)], [Result], []),
  });
};
export const init = ({ IDL }) => { return []; };
