export const idlFactory = ({ IDL }) => {
  const CommitmentHash = IDL.Text;
  const Result_5 = IDL.Variant({ 'ok' : IDL.Nat, 'err' : IDL.Text });
  const Result_4 = IDL.Variant({ 'ok' : IDL.Text, 'err' : IDL.Text });
  const Result_3 = IDL.Variant({ 'ok' : CommitmentHash, 'err' : IDL.Text });
  const NullifierHash = IDL.Text;
  const Result_2 = IDL.Variant({ 'ok' : NullifierHash, 'err' : IDL.Text });
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
  const Result_1 = IDL.Variant({ 'ok' : ZKProof, 'err' : IDL.Text });
  const Result = IDL.Variant({
    'ok' : IDL.Vec(CommitmentHash),
    'err' : IDL.Text,
  });
  return IDL.Service({
    'addLeaf' : IDL.Func([CommitmentHash], [Result_5], []),
    'decryptData' : IDL.Func([IDL.Text, IDL.Text], [Result_4], []),
    'encryptData' : IDL.Func([IDL.Text, IDL.Text], [Result_4], []),
    'generateCommitment' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Nat],
        [Result_3],
        [],
      ),
    'generateNullifier' : IDL.Func([IDL.Text, IDL.Nat], [Result_2], []),
    'generateZKProof' : IDL.Func(
        [
          IDL.Text,
          IDL.Text,
          IDL.Text,
          IDL.Nat,
          MerkleRoot,
          IDL.Vec(CommitmentHash),
          IDL.Nat,
        ],
        [Result_1],
        [],
      ),
    'getCurrentMerkleRoot' : IDL.Func([], [IDL.Opt(MerkleRoot)], ['query']),
    'getLeafCount' : IDL.Func([], [IDL.Nat], ['query']),
    'getMerkleProof' : IDL.Func([IDL.Nat], [Result], []),
    'getMerkleRootAtLevel' : IDL.Func(
        [IDL.Nat],
        [IDL.Opt(MerkleRoot)],
        ['query'],
      ),
    'getTreeDepth' : IDL.Func([], [IDL.Nat], ['query']),
    'verifyMerkleProof' : IDL.Func(
        [CommitmentHash, IDL.Vec(CommitmentHash), MerkleRoot, IDL.Nat],
        [IDL.Bool],
        [],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
