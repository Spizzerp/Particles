import React, { useState, useEffect } from 'react';
import { Principal } from '@dfinity/principal';
import { getDepositManager, getEthereumAdapter } from '../services/actorFactory';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';
import './DepositPage.css';

type DepositStep = 'select' | 'address' | 'waiting' | 'complete';

const DepositPage: React.FC = () => {
  const [step, setStep] = useState<DepositStep>('select');
  const [selectedChain, setSelectedChain] = useState('');
  const [selectedToken, setSelectedToken] = useState('');
  const [selectedAmount, setSelectedAmount] = useState('');
  const [depositAddress, setDepositAddress] = useState('');
  const [commitment, setCommitment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes

  const chains = [
    { id: 'ICP', name: 'Internet Computer', icon: '🌐' },
    { id: 'BTC', name: 'Bitcoin', icon: '₿' },
    { id: 'ETH', name: 'Ethereum', icon: 'Ξ' },
    { id: 'SOL', name: 'Solana', icon: '◎' },
  ];

  const getTokensForChain = (chainId: string) => {
    switch(chainId) {
      case 'ICP': return [{ id: 'ICP', name: 'ICP', icon: '🌐' }];
      case 'BTC': return [{ id: 'BTC', name: 'Bitcoin', icon: '₿' }];
      case 'ETH': return [{ id: 'ETH', name: 'Ethereum', icon: 'Ξ' }];
      case 'SOL': return [{ id: 'SOL', name: 'Solana', icon: '◎' }];
      default: return [];
    }
  };

  const getAmountsForToken = (tokenId: string) => {
    switch(tokenId) {
      case 'BTC': return ['0.001', '0.01', '0.1', '1'];
      case 'ETH': return ['0.01', '0.1', '1', '10']; // Added 0.01 for testing
      case 'SOL': return ['1', '10', '100', '1000'];
      case 'ICP': return ['1', '10', '100', '1000'];
      default: return ['0.1', '1', '10', '100'];
    }
  };

  const tokens = selectedChain ? getTokensForChain(selectedChain) : [];
  const amounts = selectedToken ? getAmountsForToken(selectedToken) : [];

  // Timer for deposit window
  useEffect(() => {
    if (step === 'waiting' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [step, timeLeft]);

  // Generate unique deposit address when moving to address step
  const generateDepositAddress = async () => {
    try {
      let address = '';
      switch(selectedChain) {
        case 'ETH':
          // Use real Ethereum adapter to generate unique address
          console.log('🔐 === GENERATING UNIQUE DEPOSIT ADDRESS ===');
          console.log('Getting Ethereum adapter...');
          const ethereumAdapter = await getEthereumAdapter();
          console.log('✅ Ethereum adapter obtained');
          
          // Generate a unique principal for this deposit
          const depositSeed = crypto.getRandomValues(new Uint8Array(29));
          const depositPrincipal = Principal.fromUint8Array(depositSeed);
          console.log('🎲 Generated unique deposit principal:', depositPrincipal.toString());
          
          // Get pending deposit data for commitment
          const pendingData = JSON.parse(sessionStorage.getItem('pending_deposit') || '{}');
          console.log('📝 Commitment for this deposit:', pendingData.commitment);
          console.log('💰 Amount:', selectedAmount, 'ETH');
          
          const decimals = 18; // ETH has 18 decimals
          const amountBigInt = BigInt(Math.floor(parseFloat(selectedAmount) * Math.pow(10, decimals)));
          
          console.log('🔄 Calling getDepositAddressV2 with:');
          console.log('  - Principal:', depositPrincipal.toString());
          console.log('  - Commitment:', pendingData.commitment);
          console.log('  - Amount (wei):', amountBigInt.toString());
          
          const addressResult = await ethereumAdapter.getDepositAddressV2(
            depositPrincipal,
            pendingData.commitment,
            amountBigInt
          );
          
          if ('ok' in addressResult) {
            address = addressResult.ok;
            setDepositAddress(address);
            
            // Check if this address has been used before
            const previousAddresses = JSON.parse(localStorage.getItem('deposit_addresses') || '[]');
            const isNewAddress = !previousAddresses.includes(address);
            
            console.log('✨ Generated Ethereum address:', address);
            console.log('🆕 Is this a new unique address?', isNewAddress ? 'YES ✅' : 'NO ❌ (already used)');
            
            if (isNewAddress) {
              previousAddresses.push(address);
              localStorage.setItem('deposit_addresses', JSON.stringify(previousAddresses));
              console.log('📊 Total unique addresses generated:', previousAddresses.length);
            }
            
            sessionStorage.setItem('eth_deposit_principal', depositPrincipal.toString());
            console.log('💾 Saved deposit principal for tracking');
            console.log('🔐 === ADDRESS GENERATION COMPLETE ===');
          } else {
            throw new Error(addressResult.err);
          }
          break;
          
        case 'BTC':
          // Bitcoin integration not yet implemented
          const btcSeed = crypto.getRandomValues(new Uint8Array(20));
          address = `1${btoa(String.fromCharCode(...btcSeed))
            .replace(/[+/=]/g, '')
            .slice(0, 33)}`;
          setDepositAddress(address);
          break;
          
        case 'SOL':
          // Solana integration not yet implemented
          const solSeed = crypto.getRandomValues(new Uint8Array(32));
          address = btoa(String.fromCharCode(...solSeed))
            .replace(/[+/=]/g, '')
            .slice(0, 44);
          setDepositAddress(address);
          break;
          
        case 'ICP':
          // Generate ICP subaccount
          const icpSeed = crypto.getRandomValues(new Uint8Array(29));
          address = Principal.fromUint8Array(icpSeed).toString();
          setDepositAddress(address);
          break;
      }
      return address;
    } catch (error) {
      console.error('Failed to generate deposit address:', error);
      throw error;
    }
  };

  const handleContinue = async () => {
    if (!selectedChain || !selectedToken || !selectedAmount) return;
    
    setIsProcessing(true);
    try {
      // Generate commitment data FIRST
      const secret = crypto.getRandomValues(new Uint8Array(32));
      const nullifier = crypto.getRandomValues(new Uint8Array(32));
      const decimals = selectedToken === 'BTC' ? 8 : 
                       selectedToken === 'ETH' ? 18 : 
                       6; // Default for others
      const amountBigInt = BigInt(Math.floor(parseFloat(selectedAmount) * Math.pow(10, decimals)));
      
      // Create commitment hash
      const commitmentInput = new Uint8Array(secret.length + nullifier.length + 8);
      commitmentInput.set(secret);
      commitmentInput.set(nullifier, secret.length);
      const amountBytes = new ArrayBuffer(8);
      new DataView(amountBytes).setBigUint64(0, amountBigInt);
      commitmentInput.set(new Uint8Array(amountBytes), secret.length + nullifier.length);
      
      const commitmentHash = sha256(commitmentInput);
      const commitmentValue = `0x${bytesToHex(commitmentHash)}`;
      
      // Store commitment data temporarily BEFORE generating address
      sessionStorage.setItem('pending_deposit', JSON.stringify({
        commitment: commitmentValue,
        secret: bytesToHex(secret),
        nullifier: bytesToHex(nullifier),
        amount: selectedAmount,
        token: selectedToken,
        chain: selectedChain,
        timestamp: Date.now()
      }));
      
      // NOW generate deposit address with the commitment
      const address = await generateDepositAddress();
      
      // Update session storage with the address
      const pendingData = JSON.parse(sessionStorage.getItem('pending_deposit') || '{}');
      pendingData.address = address;
      sessionStorage.setItem('pending_deposit', JSON.stringify(pendingData));
      
      setStep('address');
      setTimeLeft(600); // Reset timer
    } catch (error) {
      console.error('Failed to generate deposit data:', error);
      alert('Failed to generate deposit address. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDepositDetected = async () => {
    setStep('waiting');
    console.log('🔍 === MONITORING FOR DEPOSIT ===');
    console.log('📍 Deposit address:', depositAddress);
    console.log('💰 Expected amount:', selectedAmount, 'ETH');
    
    if (selectedChain === 'ETH') {
      // Real Ethereum monitoring
      const ethereumAdapter = await getEthereumAdapter();
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes (5 seconds per check)
      
      const checkForDeposit = async () => {
        try {
          console.log(`🔄 Checking for deposit... (Attempt ${attempts + 1}/${maxAttempts})`);
          
          // First check if funds have arrived at the deposit address
          const depositInfo = await ethereumAdapter.getDepositInfo(depositAddress);
          if (depositInfo && depositInfo.length > 0) {
            console.log('💰 Funds detected at deposit address!');
            console.log('📊 Deposit info:', depositInfo[0]);
          }
          
          // Process single deposit address to avoid consensus issues
          console.log('🔄 Processing single deposit address with V2:', depositAddress);
          const processResult = await ethereumAdapter.processSingleDepositV2(depositAddress);
          console.log('📊 Process result:', processResult);
          
          if ('ok' in processResult) {
            // Deposit was forwarded to contract!
            const txHash = processResult.ok; // Get the forwarding tx hash
            console.log('✅ DEPOSIT DETECTED AND FORWARDED!');
            console.log('📜 Forwarding transaction hash:', txHash);
            await registerDeposit(txHash);
            return;
          } else {
            console.log('⚠️ Processing error:', processResult.err);
          }
          
          // Also check contract events in case deposit was already forwarded
          const depositsResult = await ethereumAdapter.checkDeposits();
          if ('ok' in depositsResult && depositsResult.ok.length > 0) {
            const pendingData = JSON.parse(sessionStorage.getItem('pending_deposit') || '{}');
            const ourDeposit = depositsResult.ok.find((d: any) => 
              d.commitment === pendingData.commitment
            );
            
            if (ourDeposit) {
              await registerDeposit(ourDeposit.txHash);
              return;
            }
          }
          
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(checkForDeposit, 5000); // Check every 5 seconds
          } else {
            alert('Deposit timeout. Please try again.');
            setStep('address');
          }
        } catch (error) {
          console.error('Error checking deposits:', error);
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(checkForDeposit, 5000);
          }
        }
      };
      
      // Start monitoring
      setTimeout(checkForDeposit, 5000);
    } else {
      // For other chains, simulate for now
      setTimeout(async () => {
        await registerDeposit();
      }, 5000);
    }
  };

  const registerDeposit = async (txHash?: string) => {
    try {
      const pendingData = JSON.parse(sessionStorage.getItem('pending_deposit') || '{}');
      
      // Register deposit on-chain
      const depositManager = await getDepositManager();
      const chainId = selectedChain === 'ICP' ? BigInt(0) : 
                     selectedChain === 'BTC' ? BigInt(1) : 
                     selectedChain === 'ETH' ? BigInt(2) : 
                     selectedChain === 'SOL' ? BigInt(3) : 
                     BigInt(0);
      
      const decimals = selectedToken === 'BTC' ? 8 : 
                       selectedToken === 'ETH' ? 18 : 
                       6; // Default for others
      const amountBigInt = BigInt(Math.floor(parseFloat(selectedAmount) * Math.pow(10, decimals)));
      
      const result = await depositManager.deposit(
        amountBigInt,
        selectedToken,
        chainId,
        pendingData.commitment
      );
      
      if ('ok' in result) {
        const depositId = result.ok;
        const fullCommitment = JSON.stringify({
          ...pendingData,
          depositId: depositId.toString()
        });
        
        setCommitment(fullCommitment);
        setTxHash(txHash || '0x' + bytesToHex(crypto.getRandomValues(new Uint8Array(32))));
        setStep('complete');
        
        // Clear temporary storage
        sessionStorage.removeItem('pending_deposit');
      } else {
        throw new Error(result.err);
      }
    } catch (error) {
      console.error('Failed to register deposit:', error);
      alert('Failed to register deposit. Please contact support.');
      setStep('select');
    }
  };

  const resetDeposit = () => {
    setStep('select');
    setSelectedChain('');
    setSelectedToken('');
    setSelectedAmount('');
    setDepositAddress('');
    setCommitment('');
    setTxHash('');
    setTimeLeft(600);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="deposit-page">
      <h1 className="page-title">Deposit</h1>
      
      <div className="deposit-container">
        {step === 'select' && (
          <div className="deposit-form card">
            <h2>Select Deposit Details</h2>
            
            <div className="selection-group">
              <label>Select Chain</label>
              <div className="chain-options">
                {chains.map(chain => (
                  <button
                    key={chain.id}
                    className={`chain-option ${selectedChain === chain.id ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedChain(chain.id);
                      setSelectedToken('');
                      setSelectedAmount('');
                    }}
                  >
                    <span className="chain-icon">{chain.icon}</span>
                    <span className="chain-name">{chain.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {selectedChain && (
              <div className="selection-group">
                <label>Select Token</label>
                <div className="token-options">
                  {tokens.map(token => (
                    <button
                      key={token.id}
                      className={`token-option ${selectedToken === token.id ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedToken(token.id);
                        setSelectedAmount('');
                      }}
                    >
                      <span className="token-icon">{token.icon}</span>
                      <span className="token-name">{token.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedToken && (
              <div className="selection-group">
                <label>Select Amount</label>
                <div className="amount-options">
                  {amounts.map(amount => (
                    <button
                      key={amount}
                      className={`amount-option ${selectedAmount === amount ? 'selected' : ''}`}
                      onClick={() => setSelectedAmount(amount)}
                    >
                      {amount} {selectedToken}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button 
              className="btn deposit-btn"
              onClick={handleContinue}
              disabled={!selectedChain || !selectedToken || !selectedAmount || isProcessing}
            >
              {isProcessing ? 'Generating Address...' : 'Continue'}
            </button>
          </div>
        )}

        {step === 'address' && (
          <div className="deposit-address-view card">
            <h2>Deposit {selectedAmount} {selectedToken}</h2>
            
            <div className="deposit-info">
              <p className="deposit-instruction">
                Send exactly <strong>{selectedAmount} {selectedToken}</strong> to the address below:
              </p>
              
              <div className="address-display">
                <code className="deposit-address">{depositAddress}</code>
                <button
                  className="copy-btn"
                  onClick={() => navigator.clipboard.writeText(depositAddress)}
                >
                  Copy
                </button>
              </div>

              <div className="qr-placeholder">
                <div className="qr-code">QR Code</div>
              </div>

              <div className="timer-section">
                <p>Time remaining: <strong>{formatTime(timeLeft)}</strong></p>
                <div className="timer-bar">
                  <div 
                    className="timer-progress" 
                    style={{ width: `${(timeLeft / 600) * 100}%` }}
                  />
                </div>
              </div>

              <p className="warning-text">
                ⚠️ Only send {selectedToken} on {selectedChain === 'ETH' ? 'Sepolia Testnet' : chains.find(c => c.id === selectedChain)?.name} network
              </p>
              
              {selectedChain === 'ETH' && (
                <div className="network-info">
                  <p>This is a Sepolia testnet address. Get test ETH from:</p>
                  <a href="https://sepoliafaucet.com/" target="_blank" rel="noopener noreferrer">
                    Sepolia Faucet
                  </a>
                </div>
              )}
            </div>

            <div className="action-buttons">
              <button className="btn btn-secondary" onClick={resetDeposit}>
                Cancel
              </button>
              <button className="btn deposit-btn" onClick={handleDepositDetected}>
                I've Made the Deposit
              </button>
            </div>
          </div>
        )}

        {step === 'waiting' && (
          <div className="waiting-view card">
            <h2>Waiting for Confirmation</h2>
            
            <div className="loading-spinner">
              <div className="spinner"></div>
            </div>
            
            <p>Scanning {chains.find(c => c.id === selectedChain)?.name} network for your deposit...</p>
            <p className="sub-text">This usually takes 10-30 seconds</p>
          </div>
        )}

        {step === 'complete' && (
          <div className="complete-view card">
            <div className="success-icon">✅</div>
            <h2>Deposit Complete!</h2>
            
            <div className="transaction-info">
              <p>Transaction Hash:</p>
              <code className="tx-hash">{txHash}</code>
            </div>

            <div className="commitment-section">
              <h3>Your Private Note</h3>
              <p className="commitment-warning">
                ⚠️ Save this note! You'll need it to withdraw your funds.
              </p>
              <div className="commitment-display">
                <code className="commitment-value">{commitment}</code>
              </div>
              <button 
                className="btn copy-btn"
                onClick={() => navigator.clipboard.writeText(commitment)}
              >
                Copy Private Note
              </button>
            </div>

            <button className="btn btn-secondary" onClick={resetDeposit}>
              Make Another Deposit
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DepositPage;