export const idlFactory = ({ IDL }) => {
  // Define custom types
  const TokenId = IDL.Text;
  const ChainId = IDL.Nat;
  const Amount = IDL.Nat;
  const CommitmentHash = IDL.Text;
  const MerkleRoot = IDL.Text;
  
  const Deposit = IDL.Record({
    id: IDL.Nat,
    user: IDL.Principal,
    amount: Amount,
    tokenId: TokenId,
    chainId: ChainId,
    commitment: CommitmentHash,
    timestamp: IDL.Nat,
    leafIndex: IDL.Nat,
  });
  
  const Result = IDL.Variant({
    ok: IDL.Nat,
    err: IDL.Text,
  });
  
  const Result_1 = IDL.Variant({
    ok: IDL.Null,
    err: IDL.Text,
  });
  
  // Define the service interface
  return IDL.Service({
    deposit: IDL.Func(
      [Amount, TokenId, ChainId, CommitmentHash],
      [Result],
      []
    ),
    getDeposit: IDL.Func(
      [IDL.Nat],
      [IDL.Opt(Deposit)],
      ['query']
    ),
    getUserDeposits: IDL.Func(
      [IDL.Principal],
      [IDL.Vec(Deposit)],
      ['query']
    ),
    getTotalDeposits: IDL.Func(
      [],
      [IDL.Nat],
      ['query']
    ),
    getMerkleRoot: IDL.Func(
      [IDL.Opt(IDL.Nat)],
      [IDL.Opt(MerkleRoot)],
      ['query']
    ),
    getMerkleProof: IDL.Func(
      [CommitmentHash],
      [IDL.Vec(IDL.Text)],
      ['query']
    ),
    updateMerkleTree: IDL.Func(
      [IDL.Nat, MerkleRoot],
      [Result_1],
      []
    ),
  });
};

export const init = ({ IDL }) => {
  return [];
};