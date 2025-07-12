export const idlFactory = ({ IDL }) => {
  const HashRequest = IDL.Record({ 'data' : IDL.Vec(IDL.Nat8) });
  const HashResponse = IDL.Record({ 'hash' : IDL.Vec(IDL.Nat8) });
  return IDL.Service({
    'health' : IDL.Func([], [IDL.Text], ['query']),
    'keccak256' : IDL.Func([HashRequest], [HashResponse], []),
    'keccak256_hex' : IDL.Func([HashRequest], [IDL.Text], []),
    'version' : IDL.Func([], [IDL.Text], ['query']),
  });
};
export const init = ({ IDL }) => { return []; };
