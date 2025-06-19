export const idlFactory = ({ IDL }) => {
  const ChainId = IDL.Nat;
  const TokenId = IDL.Text;
  const Amount = IDL.Nat;
  const Result = IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text });
  const Result_2 = IDL.Variant({ 'ok' : IDL.Text, 'err' : IDL.Text });
  const Route = IDL.Record({
    'fee' : Amount,
    'tokenId' : TokenId,
    'sourceChain' : ChainId,
    'amount' : Amount,
    'destChain' : ChainId,
  });
  const Result_1 = IDL.Variant({ 'ok' : Route, 'err' : IDL.Text });
  return IDL.Service({
    'addLiquidity' : IDL.Func([ChainId, TokenId, Amount], [Result], []),
    'createRoute' : IDL.Func(
        [ChainId, ChainId, TokenId, Amount],
        [Result_2],
        [],
      ),
    'findOptimalRoute' : IDL.Func(
        [ChainId, ChainId, TokenId, Amount],
        [Result_1],
        [],
      ),
    'getAvailableRoutes' : IDL.Func([ChainId], [IDL.Vec(Route)], ['query']),
    'getLiquidity' : IDL.Func([ChainId, TokenId], [IDL.Nat], ['query']),
    'getRoute' : IDL.Func(
        [ChainId, ChainId, TokenId],
        [IDL.Opt(Route)],
        ['query'],
      ),
    'removeLiquidity' : IDL.Func([ChainId, TokenId, Amount], [Result], []),
  });
};
export const init = ({ IDL }) => { return []; };
