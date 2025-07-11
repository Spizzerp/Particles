export const idlFactory = ({ IDL }) => {
  const Amount = IDL.Nat;
  const TokenId = IDL.Text;
  const ChainId = IDL.Nat;
  const CommitmentHash = IDL.Text;
  const DepositResult = IDL.Record({
    'depositId' : IDL.Nat,
    'leafIndex' : IDL.Nat,
    'merkleRoot' : IDL.Text,
  });
  const Result = IDL.Variant({ 'ok' : DepositResult, 'err' : IDL.Text });
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
  const Result_1 = IDL.Variant({ 'ok' : IDL.Vec(IDL.Text), 'err' : IDL.Text });
  return IDL.Service({
    'deposit' : IDL.Func(
        [Amount, TokenId, ChainId, CommitmentHash],
        [Result],
        [],
      ),
    'getAllDeposits' : IDL.Func([], [IDL.Vec(Deposit)], ['query']),
    'getCommitmentsInOrder' : IDL.Func([], [IDL.Vec(IDL.Text)], ['query']),
    'getCurrentMerkleRoot' : IDL.Func([], [IDL.Text], ['query']),
    'getDeposit' : IDL.Func([IDL.Nat], [IDL.Opt(Deposit)], ['query']),
    'getMerkleProof' : IDL.Func([IDL.Nat], [Result_1], ['query']),
    'getTotalDeposits' : IDL.Func([], [IDL.Nat], ['query']),
    'getUserDeposits' : IDL.Func(
        [IDL.Principal],
        [IDL.Vec(Deposit)],
        ['query'],
      ),
    'migrateDeposit' : IDL.Func(
        [IDL.Nat, IDL.Principal, IDL.Nat, IDL.Text, IDL.Nat, IDL.Text, IDL.Int],
        [Result],
        [],
      ),
    'verifyMerkleProof' : IDL.Func(
        [IDL.Text, IDL.Nat, IDL.Vec(IDL.Text), IDL.Text],
        [IDL.Bool],
        ['query'],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
