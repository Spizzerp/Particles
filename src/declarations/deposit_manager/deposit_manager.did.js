export const idlFactory = ({ IDL }) => {
  const Amount = IDL.Nat;
  const TokenId = IDL.Text;
  const ChainId = IDL.Nat;
  const CommitmentHash = IDL.Text;
  const Result_1 = IDL.Variant({ 'ok' : IDL.Nat, 'err' : IDL.Text });
  const Time = IDL.Int;
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
  const MerkleRoot = IDL.Text;
  const Result = IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text });
  return IDL.Service({
    'deposit' : IDL.Func(
        [Amount, TokenId, ChainId, CommitmentHash],
        [Result_1],
        [],
      ),
    'getDeposit' : IDL.Func([IDL.Nat], [IDL.Opt(Deposit)], ['query']),
    'getMerkleRoot' : IDL.Func([IDL.Nat], [IDL.Opt(MerkleRoot)], ['query']),
    'getTotalDeposits' : IDL.Func([], [IDL.Nat], ['query']),
    'getUserDeposits' : IDL.Func(
        [IDL.Principal],
        [IDL.Vec(Deposit)],
        ['query'],
      ),
    'updateMerkleTree' : IDL.Func([IDL.Nat, MerkleRoot], [Result], []),
  });
};
export const init = ({ IDL }) => { return []; };
