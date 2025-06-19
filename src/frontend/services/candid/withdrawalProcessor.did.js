export const idlFactory = ({ IDL }) => {
  // Define custom types
  const TokenId = IDL.Text;
  const ChainId = IDL.Nat;
  const Amount = IDL.Nat;
  const NullifierHash = IDL.Text;
  const MerkleRoot = IDL.Text;
  
  const ZKProof = IDL.Record({
    a: IDL.Tuple(IDL.Text, IDL.Text),
    b: IDL.Tuple(
      IDL.Tuple(IDL.Text, IDL.Text),
      IDL.Tuple(IDL.Text, IDL.Text)
    ),
    c: IDL.Tuple(IDL.Text, IDL.Text),
    publicSignals: IDL.Vec(IDL.Text),
  });
  
  const Withdrawal = IDL.Record({
    id: IDL.Nat,
    nullifier: NullifierHash,
    recipient: IDL.Text,
    amount: Amount,
    tokenId: TokenId,
    chainId: ChainId,
    merkleRoot: MerkleRoot,
    proof: ZKProof,
    timestamp: IDL.Nat,
  });
  
  const Result = IDL.Variant({
    ok: IDL.Nat,
    err: IDL.Text,
  });
  
  const Result_1 = IDL.Variant({
    ok: IDL.Null,
    err: IDL.Text,
  });
  
  const Result_2 = IDL.Variant({
    ok: IDL.Vec(IDL.Nat),
    err: IDL.Text,
  });
  
  const WithdrawalStats = IDL.Record({
    total: IDL.Nat,
    pending: IDL.Nat,
    processed: IDL.Nat,
  });
  
  // Define the service interface
  return IDL.Service({
    initiateWithdrawal: IDL.Func(
      [NullifierHash, IDL.Text, Amount, TokenId, ChainId, MerkleRoot, ZKProof],
      [Result],
      []
    ),
    processWithdrawal: IDL.Func(
      [IDL.Nat],
      [Result_1],
      []
    ),
    batchProcessWithdrawals: IDL.Func(
      [IDL.Vec(IDL.Nat)],
      [Result_2],
      []
    ),
    getWithdrawal: IDL.Func(
      [IDL.Nat],
      [IDL.Opt(Withdrawal)],
      ['query']
    ),
    getPendingWithdrawals: IDL.Func(
      [],
      [IDL.Vec(Withdrawal)],
      ['query']
    ),
    getProcessedWithdrawals: IDL.Func(
      [],
      [IDL.Vec(Withdrawal)],
      ['query']
    ),
    isNullifierUsed: IDL.Func(
      [NullifierHash],
      [IDL.Bool],
      ['query']
    ),
    getWithdrawalsByChain: IDL.Func(
      [ChainId],
      [IDL.Vec(Withdrawal)],
      ['query']
    ),
    getWithdrawalStats: IDL.Func(
      [],
      [WithdrawalStats],
      ['query']
    ),
  });
};

export const init = ({ IDL }) => {
  return [];
};