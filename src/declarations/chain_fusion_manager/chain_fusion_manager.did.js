export const idlFactory = ({ IDL }) => {
  const Satoshi = IDL.Nat64;
  const Result_1 = IDL.Variant({ 'ok' : IDL.Text, 'err' : IDL.Text });
  const Wei = IDL.Nat;
  const BitcoinAddress = IDL.Text;
  const Result_5 = IDL.Variant({ 'ok' : BitcoinAddress, 'err' : IDL.Text });
  const EthereumAddress = IDL.Text;
  const Result_4 = IDL.Variant({ 'ok' : EthereumAddress, 'err' : IDL.Text });
  const Result_3 = IDL.Variant({ 'ok' : Satoshi, 'err' : IDL.Text });
  const Result_2 = IDL.Variant({ 'ok' : Wei, 'err' : IDL.Text });
  const BitcoinNetwork = IDL.Variant({
    'mainnet' : IDL.Null,
    'regtest' : IDL.Null,
    'testnet' : IDL.Null,
  });
  const Result = IDL.Variant({ 'ok' : IDL.Vec(IDL.Nat8), 'err' : IDL.Text });
  const ChainFusionManager = IDL.Service({
    'bridgeFromBitcoin' : IDL.Func(
        [IDL.Principal, Satoshi, IDL.Text],
        [Result_1],
        [],
      ),
    'bridgeFromEthereum' : IDL.Func(
        [IDL.Principal, Wei, IDL.Text],
        [Result_1],
        [],
      ),
    'generateBitcoinAddress' : IDL.Func([IDL.Principal], [Result_5], []),
    'generateEthereumAddress' : IDL.Func([IDL.Principal], [Result_4], []),
    'getBitcoinBalance' : IDL.Func([BitcoinAddress], [Result_3], []),
    'getEthereumBalance' : IDL.Func([EthereumAddress], [Result_2], []),
    'getKeyName' : IDL.Func([], [IDL.Text], ['query']),
    'getSupportedChains' : IDL.Func([], [IDL.Vec(IDL.Text)], ['query']),
    'sendBitcoinTransaction' : IDL.Func(
        [IDL.Principal, BitcoinAddress, Satoshi, BitcoinNetwork],
        [Result_1],
        [],
      ),
    'sendEthereumTransaction' : IDL.Func(
        [IDL.Principal, EthereumAddress, Wei],
        [Result_1],
        [],
      ),
    'signWithEcdsa' : IDL.Func(
        [IDL.Principal, IDL.Vec(IDL.Nat8)],
        [Result],
        [],
      ),
  });
  return ChainFusionManager;
};
export const init = ({ IDL }) => {
  return [IDL.Record({ 'ethereum_rpc' : IDL.Text, 'key_name' : IDL.Text })];
};
