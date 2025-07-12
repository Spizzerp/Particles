export const idlFactory = ({ IDL }) => {
  return IDL.Service({
    'verify_bytes' : IDL.Func(
        [IDL.Vec(IDL.Nat8), IDL.Vec(IDL.Nat8), IDL.Vec(IDL.Nat8), IDL.Bool],
        [IDL.Bool],
        ['query'],
      ),
    'verify_hex' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Text, IDL.Bool],
        [IDL.Bool],
        ['query'],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
