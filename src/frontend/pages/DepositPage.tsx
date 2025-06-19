import React, { useState } from 'react';
import { Principal } from '@dfinity/principal';
import { getDepositManager } from '../services/actorFactory';
import { useAuth } from '../contexts/AuthContext';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';
import './DepositPage.css';

const DepositPage: React.FC = () => {
  const { identity, isAuthenticated, principal } = useAuth();
  const [amount, setAmount] = useState('');
  const [selectedChain, setSelectedChain] = useState('ICP');
  const [selectedToken, setSelectedToken] = useState('ICP');
  const [commitment, setCommitment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [chainAddress, setChainAddress] = useState('');

  const chains = [
    { id: 'ICP', name: 'Internet Computer' },
    { id: 'BTC', name: 'Bitcoin' },
    { id: '1', name: 'Ethereum' },
    { id: '137', name: 'Polygon' },
    { id: '42161', name: 'Arbitrum' },
  ];

  const getTokensForChain = (chainId: string) => {
    switch(chainId) {
      case 'ICP': return ['ICP'];
      case 'BTC': return ['BTC'];
      case '1': return ['ETH', 'USDC', 'USDT', 'DAI'];
      case '137': return ['MATIC', 'USDC', 'USDT'];
      case '42161': return ['ETH', 'USDC', 'USDT'];
      default: return ['ETH'];
    }
  };

  const tokens = getTokensForChain(selectedChain);

  React.useEffect(() => {
    if (isAuthenticated && principal) {
      generateChainAddress();
    }
  }, [isAuthenticated, principal, selectedChain]);

  const generateChainAddress = async () => {
    if (!principal) return;
    
    // Mock address generation - in production would call ChainFusionManager
    switch (selectedChain) {
      case 'BTC':
        setChainAddress('tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx');
        break;
      case '1': // Ethereum
        setChainAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f6F263');
        break;
      case 'ICP':
        setChainAddress(principal.toString());
        break;
      default:
        setChainAddress('');
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;

    setIsProcessing(true);
    try {
      // Get decimals based on token
      const decimals = selectedToken === 'BTC' ? 8 : 6; // BTC has 8 decimals, others 6
      const amountBigInt = BigInt(Math.floor(parseFloat(amount) * Math.pow(10, decimals)));
      
      // Generate a secure commitment using real cryptography
      const secret = crypto.getRandomValues(new Uint8Array(32));
      const nullifier = crypto.getRandomValues(new Uint8Array(32));
      
      // Create commitment hash: H(secret || nullifier || amount)
      const commitmentInput = new Uint8Array(secret.length + nullifier.length + 8);
      commitmentInput.set(secret);
      commitmentInput.set(nullifier, secret.length);
      // Add amount as 8 bytes
      const amountBytes = new ArrayBuffer(8);
      new DataView(amountBytes).setBigUint64(0, amountBigInt);
      commitmentInput.set(new Uint8Array(amountBytes), secret.length + nullifier.length);
      
      const commitmentHash = sha256(commitmentInput);
      const commitmentValue = `0x${bytesToHex(commitmentHash)}`;
      
      // Get the deposit manager service with user's identity
      const depositManager = await getDepositManager(identity || undefined);
      
      // Make the deposit
      const chainId = selectedChain === 'ICP' ? BigInt(0) : 
                     selectedChain === 'BTC' ? BigInt(999) : 
                     BigInt(selectedChain);
      
      const result = await depositManager.deposit(
        amountBigInt,
        selectedToken,
        chainId,
        commitmentValue
      );
      
      if ('ok' in result) {
        const depositId = result.ok;
        // Store secret and nullifier securely (in production, encrypt this)
        const secretHex = bytesToHex(secret);
        const nullifierHex = bytesToHex(nullifier);
        const fullCommitment = JSON.stringify({
          commitment: commitmentValue,
          depositId: depositId.toString(),
          secret: secretHex,
          nullifier: nullifierHex,
          amount: amount,
          token: selectedToken,
          chain: selectedChain,
        });
        setCommitment(fullCommitment);
        alert('Deposit successful! Save your commitment for withdrawal.');
      } else {
        throw new Error(result.err);
      }
    } catch (error) {
      console.error('Deposit failed:', error);
      alert(`Deposit failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="deposit-page">
      <h1 className="page-title">Deposit</h1>
      
      <div className="deposit-container">
        <form onSubmit={handleDeposit} className="deposit-form card">
          {chainAddress && ['BTC', '1'].includes(selectedChain) && (
            <div className="chain-address-section">
              <h3>Deposit Address</h3>
              <div className="address-display">
                <code>{chainAddress}</code>
                <button
                  type="button"
                  className="copy-btn"
                  onClick={() => navigator.clipboard.writeText(chainAddress)}
                  title="Copy address"
                >
                  Copy
                </button>
              </div>
              <p className="chain-notice">
                Send {selectedToken} to this address. Funds will be automatically bridged to the privacy pool.
              </p>
            </div>
          )}
          
          <div className="input-group">
            <label htmlFor="chain">Select Chain</label>
            <select
              id="chain"
              value={selectedChain}
              onChange={(e) => {
                setSelectedChain(e.target.value);
                // Update token when chain changes
                const newTokens = getTokensForChain(e.target.value);
                if (!newTokens.includes(selectedToken)) {
                  setSelectedToken(newTokens[0]);
                }
              }}
            >
              {chains.map(chain => (
                <option key={chain.id} value={chain.id}>
                  {chain.name}
                </option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label htmlFor="token">Select Token</label>
            <select
              id="token"
              value={selectedToken}
              onChange={(e) => setSelectedToken(e.target.value)}
            >
              {tokens.map(token => (
                <option key={token} value={token}>
                  {token}
                </option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label htmlFor="amount">Amount</label>
            <input
              id="amount"
              type="number"
              step="0.000001"
              placeholder="0.0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            className="btn deposit-btn"
            disabled={isProcessing || !amount || !isAuthenticated}
          >
            {isProcessing ? 'Processing...' : 'Deposit'}
          </button>
        </form>

        {commitment && (
          <div className="commitment-section card">
            <h3>Your Commitment</h3>
            <p className="commitment-warning">
              Save this commitment! You'll need it to withdraw your funds.
            </p>
            <div className="commitment-value">
              {commitment}
            </div>
            <button 
              className="btn copy-btn"
              onClick={() => navigator.clipboard.writeText(commitment)}
            >
              Copy to Clipboard
            </button>
          </div>
        )}

        <div className="info-section card">
          <h3>How Deposits Work</h3>
          <ul>
            <li>Select your chain and token</li>
            <li>Enter the amount you want to deposit</li>
            <li>Approve the transaction in your wallet</li>
            <li>Save the generated commitment hash</li>
            <li>Use the commitment to withdraw anonymously later</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DepositPage;