export const idlFactory = ({ IDL }) => {
  const TokenId = IDL.Text;
  const Time = IDL.Int;
  const ChainId = IDL.Nat;
  const Amount = IDL.Nat;
  const CommitmentHash = IDL.Text;
  const Deposit = IDL.Record({
    'id' : IDL.Nat,
    'tokenId' : TokenId,
    'user' : IDL.Principal,
    'leafIndex' : IDL.Nat,
    'timestamp' : Time,
    'chainId' : ChainId,
    'amount' : Amount,
    'commitment' : CommitmentHash,
  });
  const NullifierHash = IDL.Text;
  const MerkleRoot = IDL.Text;
  const ZKProof = IDL.Record({
    'a' : IDL.Tuple(IDL.Text, IDL.Text),
    'b' : IDL.Tuple(
      IDL.Tuple(IDL.Text, IDL.Text),
      IDL.Tuple(IDL.Text, IDL.Text),
    ),
    'c' : IDL.Tuple(IDL.Text, IDL.Text),
    'publicSignals' : IDL.Vec(IDL.Text),
  });
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
  const Result = IDL.Variant({ 'ok' : IDL.Vec(IDL.Text), 'err' : IDL.Text });
  const Route = IDL.Record({
    'fee' : Amount,
    'tokenId' : TokenId,
    'sourceChain' : ChainId,
    'amount' : Amount,
    'destChain' : ChainId,
  });
  const Result_1 = IDL.Variant({ 'ok' : Route, 'err' : IDL.Text });
  const PatternData = IDL.Record({
    'patterns' : IDL.Vec(IDL.Text),
    'user' : IDL.Principal,
    'withdrawals' : IDL.Vec(Withdrawal),
    'deposits' : IDL.Vec(Deposit),
  });
  return IDL.Service({
    'analyzeUserPattern' : IDL.Func(
        [IDL.Principal, IDL.Vec(Deposit), IDL.Vec(Withdrawal)],
        [Result],
        [],
      ),
    'applyObfuscation' : IDL.Func([Route, IDL.Vec(IDL.Text)], [Result_1], []),
    'generateObfuscationStrategy' : IDL.Func([IDL.Vec(IDL.Text)], [Result], []),
    'getGlobalPatternFrequency' : IDL.Func([IDL.Text], [IDL.Nat], ['query']),
    'getMostCommonPatterns' : IDL.Func(
        [],
        [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Nat))],
        ['query'],
      ),
    'getUserPatterns' : IDL.Func(
        [IDL.Principal],
        [IDL.Opt(PatternData)],
        ['query'],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
