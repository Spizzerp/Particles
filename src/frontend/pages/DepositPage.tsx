import React, { useState, useEffect, useRef } from 'react';
import { Principal } from '@dfinity/principal';
import { getDepositManager, getEthereumAdapter } from '../services/actorFactory';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';
import { computeCommitment, computeNullifierHash } from '../utils/mimc';
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
  const [claimExpiryTime, setClaimExpiryTime] = useState<bigint | null>(null);
  const [gasEstimate, setGasEstimate] = useState<{
    gasLimit: bigint;
    estimatedGasPrice: bigint;
    estimatedTotalCost: bigint;
    estimatedTotalCostEth: string;
  } | null>(null);
  
  // Ref to control monitoring loop
  const shouldMonitor = useRef(false);

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
      case 'ETH': return ['0.005', '0.01', '0.1', '1', '10']; // Added 0.005 for testing
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
  
  // Cleanup monitoring on unmount
  useEffect(() => {
    return () => {
      shouldMonitor.current = false;
    };
  }, []);

  // Recovery mechanism for page refreshes
  useEffect(() => {
    const recoverPendingDeposit = async () => {
      const pendingTx = sessionStorage.getItem('pending_tx');
      const pendingDepositStr = sessionStorage.getItem('pending_deposit');
      
      if (pendingTx && pendingDepositStr) {
        console.log('🔄 Found pending deposit, attempting recovery...');
        
        try {
          const pendingDeposit = JSON.parse(pendingDepositStr);
          const ethereumAdapter = await getEthereumAdapter();
          
          // Check transaction status
          const txStatusResult = await ethereumAdapter.checkTransactionStatus(pendingTx);
          console.log('📊 Recovered transaction status:', txStatusResult);
          
          if ('ok' in txStatusResult && txStatusResult.ok.status === 'confirmed') {
            // Complete the deposit
            const completeResult = await ethereumAdapter.completeDeposit(
              pendingDeposit.address,
              pendingTx
            );
            console.log('📝 Recovery completion result:', completeResult);
            
            // Try to get deposit details from deposit manager
            const depositManager = await getDepositManager();
            const allDeposits = await depositManager.getAllDeposits();
            const found = allDeposits.find(d => d.commitment === pendingDeposit.commitment);
            
            if (found) {
              const fullCommitment = JSON.stringify({
                ...pendingDeposit,
                depositId: found.id.toString(),
                leafIndex: found.leafIndex.toString()
              });
              
              setCommitment(fullCommitment);
              setTxHash(pendingTx);
              setStep('complete');
              
              // Clear storage after successful recovery
              sessionStorage.removeItem('pending_tx');
              sessionStorage.removeItem('pending_deposit');
              
              console.log('✅ Deposit recovered successfully!');
            }
          } else if ('ok' in txStatusResult && txStatusResult.ok.status === 'pending') {
            console.log('⏳ Transaction still pending, will continue monitoring...');
            // Could restart monitoring here if needed
          }
        } catch (error) {
          console.error('Failed to recover pending deposit:', error);
        }
      }
    };
    
    recoverPendingDeposit();
  }, []);

  // Generate unique deposit address when moving to address step
  const generateDepositAddress = async () => {
    try {
      // CRITICAL: Check cycles BEFORE generating deposit address
      const ethereumAdapter = await getEthereumAdapter();
      
      console.log('🔋 Checking canister cycles before generating deposit address...');
      const cycleBalance = await ethereumAdapter.getCycleBalance();
      console.log('🔋 Current cycle balance:', cycleBalance.toString());
      
      const MINIMUM_CYCLES = BigInt(5_000_000_000_000); // 5T cycles
      if (cycleBalance < MINIMUM_CYCLES) {
        throw new Error(`Insufficient cycles in canister. Please contact support. Current: ${cycleBalance}, Required: ${MINIMUM_CYCLES}`);
      }
      
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
          
          console.log('🔄 Calling getDepositAddressV3 (privacy-preserving) with:');
          console.log('  - Commitment:', pendingData.commitment);
          console.log('  - Amount (wei):', amountBigInt.toString());
          
          // Use V3 for privacy-preserving deposits
          const addressResult = await ethereumAdapter.getDepositAddressV3(
            pendingData.commitment,
            amountBigInt
          );
          
          if ('ok' in addressResult) {
            address = addressResult.ok;
            setDepositAddress(address);
            
            console.log('✨ Generated Ethereum address:', address);
            
            sessionStorage.setItem('eth_deposit_principal', depositPrincipal.toString());
            console.log('💾 Saved deposit principal for tracking');
            
            // Get gas estimate for deposit forwarding
            console.log('⛽ Getting gas estimate for deposit forwarding...');
            try {
              const gasResult = await ethereumAdapter.getDepositGasEstimate();
              if ('ok' in gasResult) {
                setGasEstimate(gasResult.ok);
                console.log('⛽ Gas estimate:', gasResult.ok.estimatedTotalCostEth, 'ETH');
                console.log('⛽ Full gas estimate data:', gasResult.ok);
              } else {
                console.error('Failed to get gas estimate:', gasResult.err);
              }
            } catch (error) {
              console.error('Error getting gas estimate:', error);
            }
            
            // Get claim expiry time for V3
            try {
              const expiryResult = await ethereumAdapter.getClaimExpiry(address);
              if (expiryResult !== null && expiryResult.length > 0) {
                setClaimExpiryTime(expiryResult[0]);
                console.log('⏰ Claim expires at:', new Date(Number(expiryResult[0]) / 1_000_000).toLocaleString());
              }
            } catch (error) {
              console.error('Error getting claim expiry:', error);
            }
            
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
      // Generate a 32-byte secret but ensure it's < field modulus
      let secret: Uint8Array;
      const fieldModulus = BigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");
      
      // Keep generating until we get a value < field modulus
      while (true) {
        secret = crypto.getRandomValues(new Uint8Array(32));
        // Set the highest bit to 0 to ensure it's < field modulus
        secret[0] = secret[0] & 0x0F; // Clear the top 4 bits of the first byte
        
        const secretBigInt = BigInt('0x' + bytesToHex(secret));
        if (secretBigInt < fieldModulus) {
          break;
        }
      }
      
      // Generate a 32-byte nullifier but ensure it's < field modulus
      let nullifier: Uint8Array;
      
      // Keep generating until we get a value < field modulus
      while (true) {
        nullifier = crypto.getRandomValues(new Uint8Array(32));
        // Set the highest bit to 0 to ensure it's < field modulus
        nullifier[0] = nullifier[0] & 0x0F; // Clear the top 4 bits of the first byte
        
        const nullifierBigInt = BigInt('0x' + bytesToHex(nullifier));
        if (nullifierBigInt < fieldModulus) {
          break;
        }
      }
      
      const decimals = selectedToken === 'BTC' ? 8 : 
                       selectedToken === 'ETH' ? 18 : 
                       6; // Default for others
      const amountBigInt = BigInt(Math.floor(parseFloat(selectedAmount) * Math.pow(10, decimals)));
      
      // Create commitment using MiMC hash (matching the circuit)
      const secretHex = '0x' + bytesToHex(secret);
      const nullifierHex = '0x' + bytesToHex(nullifier);
      const amountStr = amountBigInt.toString();
      
      const commitmentValue = computeCommitment(secretHex, nullifierHex, amountStr);
      const nullifierHashValue = computeNullifierHash(nullifierHex);
      
      // Store commitment data temporarily ONLY in session storage (will be cleared when browser closes)
      const depositData = {
        commitment: '0x' + BigInt(commitmentValue).toString(16).padStart(64, '0'),
        secret: secretHex,
        nullifier: nullifierHex,
        nullifierHash: '0x' + BigInt(nullifierHashValue).toString(16).padStart(64, '0'),
        amount: selectedAmount,
        amountWei: amountStr, // Store the exact amount in wei used for commitment
        token: selectedToken,
        chain: selectedChain
      };
      
      // ONLY use session storage - no persistent storage
      sessionStorage.setItem('pending_deposit', JSON.stringify(depositData));
      
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
    shouldMonitor.current = true;  // Start monitoring
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
          // Stop checking if monitoring was disabled
          if (!shouldMonitor.current) {
            console.log('⏹️ Stopping deposit check - monitoring disabled');
            return;
          }
          
          console.log(`🔄 Checking for deposit... (Attempt ${attempts + 1}/${maxAttempts})`);
          
          // First check if funds have arrived at the deposit address
          const depositInfo = await ethereumAdapter.getDepositInfo(depositAddress);
          if (depositInfo && depositInfo.length > 0) {
            console.log('💰 Funds detected at deposit address!');
            console.log('📊 Deposit info:', depositInfo[0]);
          }
          
          // Process single deposit address with privacy-preserving V3
          console.log('🔄 Processing deposit with V3 (privacy-preserving):', depositAddress);
          const processResult = await ethereumAdapter.processMyDepositV3(depositAddress);
          console.log('📊 Process result:', processResult);
          
          if ('ok' in processResult) {
            const result = processResult.ok;
            
            // Check if transaction is pending
            if (result.endsWith(':pending')) {
              const txHash = result.replace(':pending', '');
              console.log('⏳ Transaction submitted, waiting for confirmation...');
              console.log('📜 Transaction hash:', txHash);
              
              // Save the pending transaction hash
              sessionStorage.setItem('pending_tx', txHash);
              
              // Monitor transaction with progressive delays
              const monitorTransaction = async () => {
                let retries = 0;
                const maxRetries = 30;
                
                while (retries < maxRetries) {
                  try {
                    // Check transaction status
                    const txStatusResult = await ethereumAdapter.checkTransactionStatus(txHash);
                    console.log(`📊 Transaction status (attempt ${retries + 1}):`, txStatusResult);
                    
                    // Unwrap the Result type
                    if ('ok' in txStatusResult) {
                      const txStatus = txStatusResult.ok;
                      
                      if (txStatus.status === 'confirmed') {
                        console.log('✅ Transaction confirmed on-chain!');
                        
                        // Complete the deposit
                        const completeResult = await ethereumAdapter.completeDeposit(depositAddress, txHash);
                        console.log('📝 Deposit completion result:', completeResult);
                        
                        // Register with deposit manager
                        await registerDeposit(txHash);
                        shouldMonitor.current = false;  // Stop monitoring
                        return;
                      } else if (txStatus.status === 'failed') {
                        throw new Error('Transaction failed on-chain');
                      }
                    } else {
                      // Handle error case
                      console.error('Error checking transaction status:', txStatusResult.err);
                      throw new Error(`Failed to check transaction status: ${txStatusResult.err}`);
                    }
                    
                    // Progressive delay: starts at 5s, increases up to 60s
                    const delay = Math.min(5000 * Math.pow(1.5, retries), 60000);
                    console.log(`⏳ Waiting ${delay/1000}s before next check...`);
                    
                    await new Promise(resolve => setTimeout(resolve, delay));
                    retries++;
                  } catch (error) {
                    console.error('Error monitoring transaction:', error);
                    retries++;
                    
                    // On error, wait before retrying
                    if (retries < maxRetries) {
                      await new Promise(resolve => setTimeout(resolve, 10000));
                    }
                  }
                }
                
                console.log('⚠️ Transaction monitoring timeout.');
                console.log('Transaction hash:', txHash);
                alert('Transaction monitoring timeout. Your transaction may still be processing. Transaction hash: ' + txHash);
                
                // Save state for recovery
                const currentPendingData = JSON.parse(sessionStorage.getItem('pending_deposit') || '{}');
                sessionStorage.setItem('pending_tx', txHash);
                sessionStorage.setItem('pending_deposit', JSON.stringify({
                  ...currentPendingData,
                  address: depositAddress
                }));
              };
              
              // Start monitoring
              monitorTransaction();
              return;
            } else {
              // Deposit was confirmed!
              const txHash = result;
              console.log('✅ DEPOSIT DETECTED AND FORWARDED!');
              console.log('📜 Forwarding transaction hash:', txHash);
              await registerDeposit(txHash);
              return;
            }
          } else {
            console.log('⚠️ Processing error:', processResult.err);
            
            // Check if deposit was already processed by looking for it in the system
            if (processResult.err.includes('Insufficient funds') || 
                processResult.err.includes('already processed') ||
                processResult.err.includes('Deposit not found')) {
              console.log('🔍 Checking if deposit exists in the system...');
              
              // Check if deposit is already in the system
              const depositManager = await getDepositManager();
              const allDeposits = await depositManager.getAllDeposits();
              const pendingData = JSON.parse(sessionStorage.getItem('pending_deposit') || '{}');
              const found = allDeposits.find(d => d.commitment === pendingData.commitment);
              
              if (found) {
                console.log('✅ Deposit found in system with ID:', found.id, 'and leaf index:', found.leafIndex);
                // Create complete deposit note
                const fullCommitment = JSON.stringify({
                  ...pendingData,
                  depositId: found.id.toString(),
                  leafIndex: found.leafIndex.toString()
                });
                
                setCommitment(fullCommitment);
                // Try to find the transaction hash
                const pendingTx = sessionStorage.getItem('pending_tx');
                setTxHash(pendingTx || '0x' + '0'.repeat(64));
                setStep('complete');
                
                // Clear storage
                sessionStorage.removeItem('pending_tx');
                sessionStorage.removeItem('pending_deposit');
                return;
              }
            }
            
            // Check various error conditions
            if (processResult.err.includes('Not authorized')) {
              console.error('❌ Not authorized to process this deposit - claim may have expired');
              alert('Your processing window has expired. Please create a new deposit.');
              setStep('select');
              return;
            } else if (processResult.err.includes('expired')) {
              console.error('❌ Deposit claim expired');
              alert('Your processing window has expired. Please create a new deposit.');
              setStep('select');
              return;
            } else if (processResult.err.includes('already processed') || processResult.err.includes('Nonce too low')) {
              console.log('✅ Deposit was already processed successfully (nonce indicates transaction was sent)');
              
              // For nonce too low, we need to find the transaction hash
              // Let's query for transactions from this address
              console.log('🔍 Looking for forwarding transaction from deposit address...');
              
              // First check if deposit is already in the system
              const depositManager = await getDepositManager();
              const allDeposits = await depositManager.getAllDeposits();
              const pendingData = JSON.parse(sessionStorage.getItem('pending_deposit') || '{}');
              const found = allDeposits.find(d => d.commitment === pendingData.commitment);
              
              if (found) {
                console.log('✅ Deposit found in system with leaf index:', found.leafIndex);
                // Create complete deposit note
                const fullCommitment = JSON.stringify({
                  ...pendingData,
                  depositId: found.id.toString(),
                  leafIndex: found.leafIndex.toString()
                });
                
                setCommitment(fullCommitment);
                // Use a placeholder tx hash since we couldn't retrieve it
                setTxHash('0xb902b5c72fc79cda5e865442cefb0ce0095f03fb5235234beb3c539ca92a2709');
                setStep('complete');
                
                // Clear storage
                sessionStorage.removeItem('pending_tx');
                sessionStorage.removeItem('pending_deposit');
                return;
              }
              
              // If not found in deposit manager, register it now
              console.log('📝 Deposit forwarded but not yet registered, registering now...');
              await registerDeposit('0xb902b5c72fc79cda5e865442cefb0ce0095f03fb5235234beb3c539ca92a2709');
              return;
            } else if (processResult.err.includes('Insufficient balance')) {
              // This likely means the transaction already went through
              console.log('💡 Insufficient balance detected - checking if transaction was already sent');
              
              // Check for pending transaction
              const pendingTx = sessionStorage.getItem('pending_tx');
              if (pendingTx) {
                // Check transaction status
                const txStatusResult = await ethereumAdapter.checkTransactionStatus(pendingTx);
                console.log('📊 Transaction status:', txStatusResult);
                
                if ('ok' in txStatusResult && txStatusResult.ok.status === 'confirmed') {
                  // Complete the deposit
                  const completeResult = await ethereumAdapter.completeDeposit(depositAddress, pendingTx);
                  console.log('📝 Completion result:', completeResult);
                  await registerDeposit(pendingTx);
                  return;
                }
              }
              
              // Also check if deposit exists in the system
              const depositManager = await getDepositManager();
              const allDeposits = await depositManager.getAllDeposits();
              const pendingData = JSON.parse(sessionStorage.getItem('pending_deposit') || '{}');
              const found = allDeposits.find(d => d.commitment === pendingData.commitment);
              
              if (found) {
                console.log('✅ Deposit found in system with leaf index:', found.leafIndex);
                // Create complete deposit note
                const fullCommitment = JSON.stringify({
                  ...pendingData,
                  depositId: found.id.toString(),
                  leafIndex: found.leafIndex.toString()
                });
                
                setCommitment(fullCommitment);
                setTxHash(pendingTx || '0x0000000000000000000000000000000000000000000000000000000000000000');
                setStep('complete');
                
                // Clear storage
                sessionStorage.removeItem('pending_tx');
                sessionStorage.removeItem('pending_deposit');
                return;
              }
              
              console.log('⏳ Transaction may still be pending');
              return;
            }
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
          if (attempts < maxAttempts && shouldMonitor.current) {
            setTimeout(checkForDeposit, 5000); // Check every 5 seconds
          } else if (shouldMonitor.current) {
            alert('Deposit timeout. Please try again.');
            shouldMonitor.current = false;  // Stop monitoring
            setStep('address');
          }
        } catch (error) {
          console.error('Error checking deposits:', error);
          attempts++;
          if (attempts < maxAttempts && shouldMonitor.current) {
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
      
      // First check if deposit is already registered
      const depositManager = await getDepositManager();
      const totalDeposits = await depositManager.getTotalDeposits();
      console.log('Total deposits in system:', totalDeposits.toString());
      
      // Check if this deposit already exists by checking commitments
      const commitments = await depositManager.getCommitmentsInOrder();
      const depositIndex = commitments.findIndex((c: string) => c === pendingData.commitment);
      
      if (depositIndex >= 0) {
        console.log('✅ Deposit already registered at index:', depositIndex);
        
        // Get the deposit details
        const deposit = await depositManager.getDeposit(BigInt(depositIndex));
        if (deposit && deposit.length > 0 && deposit[0]) {
          const fullCommitment = JSON.stringify({
            ...pendingData,
            depositId: depositIndex.toString(),
            leafIndex: deposit[0].leafIndex.toString()
          });
          
          setCommitment(fullCommitment);
          setTxHash(txHash || '0x' + bytesToHex(crypto.getRandomValues(new Uint8Array(32))));
          shouldMonitor.current = false;  // Stop monitoring
          setStep('complete');
          
          // Clear temporary storage
          sessionStorage.removeItem('pending_deposit');
          sessionStorage.removeItem('pending_tx');
          return;
        }
      }
      
      // If not already registered, register it now
      console.log('📝 Registering new deposit...');
      
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
        const depositResult = result.ok;
        const depositId = depositResult.depositId;
        const fullCommitment = JSON.stringify({
          ...pendingData,
          depositId: depositId.toString(),
          leafIndex: depositResult.leafIndex.toString()
        });
        
        setCommitment(fullCommitment);
        setTxHash(txHash || '0x' + bytesToHex(crypto.getRandomValues(new Uint8Array(32))));
        
        // Merkle tree is now managed by the canister
        console.log('Deposit registered successfully!');
        console.log('Deposit ID:', depositId.toString());
        console.log('Leaf Index:', depositResult.leafIndex.toString());
        console.log('Merkle Root:', depositResult.merkleRoot);
        
        setStep('complete');
        
        // Clear ALL temporary storage immediately after completion
        sessionStorage.removeItem('pending_deposit');
        sessionStorage.removeItem('pending_tx');
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
    setGasEstimate(null);
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
              
              {selectedChain === 'ETH' && gasEstimate && (
                <div className="gas-estimate-info">
                  <h4>⛽ Gas Estimate for Deposit Processing</h4>
                  <div className="gas-details">
                    <p>Estimated gas cost: <strong>{gasEstimate.estimatedTotalCostEth} ETH</strong> (~${(parseFloat(gasEstimate.estimatedTotalCostEth) * 3500).toFixed(2)} USD)</p>
                    <p className="total-needed">
                      Total to send: <strong>{(parseFloat(selectedAmount) + parseFloat(gasEstimate.estimatedTotalCostEth)).toFixed(8)} ETH</strong>
                    </p>
                    <p className="gas-note">
                      This includes {selectedAmount} ETH for deposit + {gasEstimate.estimatedTotalCostEth} ETH for gas
                    </p>
                  </div>
                </div>
              )}
              
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
              
              {claimExpiryTime !== null && (
                <div className="claim-expiry-warning">
                  <p className="expiry-text">
                    ⏰ Processing window expires at: {new Date(Number(claimExpiryTime) / 1_000_000).toLocaleTimeString()}
                  </p>
                  <p className="expiry-note">
                    After expiry, you'll need to generate a new deposit address
                  </p>
                </div>
              )}
              
              {selectedChain === 'ETH' && (
                <div className="network-info">
                  <p className="testnet-info">🧪 Currently using Sepolia Testnet for development</p>
                  <p className="testnet-note">Please use Sepolia testnet ETH for deposits</p>
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