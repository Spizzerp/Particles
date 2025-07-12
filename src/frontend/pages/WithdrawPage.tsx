import React, { useState, useEffect } from 'react';
import { getWithdrawalProcessor, getDepositManager } from '../services/actorFactory';
import { 
  parseDepositData, 
  generateWithdrawalProof, 
  formatRecipientAddress,
  estimateWithdrawalFees,
  DepositData,
  WithdrawalProof
} from '../services/zkProofService';
import { formatAmount } from '../utils/crypto';
import ProofStatus from '../components/ProofStatus';
import './WithdrawPage.css';

const WithdrawPage: React.FC = () => {
  const [commitmentInput, setCommitmentInput] = useState('');
  const [recipient, setRecipient] = useState('');
  const [selectedChain, setSelectedChain] = useState('ICP');
  const [isProcessing, setIsProcessing] = useState(false);
  const [withdrawalStatus, setWithdrawalStatus] = useState('');
  const [depositData, setDepositData] = useState<DepositData | null>(null);
  const [fees, setFees] = useState<{ networkFee: string; protocolFee: string; total: string } | null>(null);
  const [proofStatus, setProofStatus] = useState<'idle' | 'generating' | 'verifying' | 'complete' | 'error'>('idle');

  const chains = [
    { id: 'ICP', name: 'Internet Computer' },
    { id: 'BTC', name: 'Bitcoin' },
    { id: '1', name: 'Ethereum' },
    { id: '137', name: 'Polygon' },
    { id: '42161', name: 'Arbitrum' },
  ];

  useEffect(() => {
    if (depositData && selectedChain) {
      estimateFees();
    }
  }, [depositData, selectedChain]);

  const handleCommitmentChange = (value: string) => {
    setCommitmentInput(value);
    const parsed = parseDepositData(value);
    if (parsed) {
      // Ensure we have both the display amount and the wei amount
      const depositDataWithWei = {
        ...parsed,
        amountWei: parsed.amountWei || parsed.amount // Fallback to amount if amountWei not stored
      };
      setDepositData(depositDataWithWei);
      // Auto-select the chain from deposit if available
      if (parsed.chain) {
        setSelectedChain(parsed.chain);
      }
    }
  };

  const estimateFees = async () => {
    if (!depositData) return;
    
    try {
      const feeEstimate = await estimateWithdrawalFees(selectedChain, depositData.amount);
      setFees(feeEstimate);
    } catch (error) {
      console.error('Failed to estimate fees:', error);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositData || !recipient) return;

    setIsProcessing(true);
    setWithdrawalStatus('Validating deposit data...');

    try {
      // Validate recipient address
      const formattedRecipient = formatRecipientAddress(recipient, selectedChain);
      
      // Validate deposit data
      if (!depositData.depositId) {
        throw new Error('Deposit ID is missing. Please ensure you paste the complete deposit data.');
      }
      
      // Get deposit info from canister
      setWithdrawalStatus('Fetching deposit information...');
      const depositManager = await getDepositManager();
      const depositId = BigInt(depositData.depositId);
      const depositInfo = await depositManager.getDeposit(depositId);
      
      if (depositInfo.length === 0) {
        throw new Error('Deposit not found');
      }

      const deposit = depositInfo[0];
      
      // Get merkle root and proof from DepositManager
      setWithdrawalStatus('Generating merkle proof...');
      const merkleRootResult = await depositManager.getCurrentMerkleRoot();
      
      if (!merkleRootResult) {
        throw new Error('No merkle root found');
      }
      
      // Ensure merkleRoot is a string
      let merkleRoot = Array.isArray(merkleRootResult) ? merkleRootResult[0] : merkleRootResult;
      console.log('Merkle root fetched:', merkleRoot, 'Type:', typeof merkleRoot);
      
      // Get total deposits to check for edge cases
      const totalDeposits = await depositManager.getTotalDeposits();
      console.log('Total deposits in system:', totalDeposits.toString());
      
      // The merkle root is now correctly computed in the canister
      console.log('Using merkle root:', merkleRoot);
      
      // Use the deposit's leafIndex
      const leafIndex = Number(deposit.leafIndex);
      console.log('Using leaf index from deposit:', leafIndex);
      
      // Get merkle proof from the canister
      console.log('Fetching merkle proof from canister for leaf index', leafIndex);
      const merkleProofResult = await depositManager.getMerkleProof(depositId);
      
      if ('err' in merkleProofResult) {
        throw new Error(`Failed to get merkle proof: ${merkleProofResult.err}`);
      }
      
      const merkleProof = merkleProofResult.ok;
      console.log('Merkle proof fetched from canister:', merkleProof);

      // Generate ZK proof
      setWithdrawalStatus('Generating zero-knowledge proof...');
      setProofStatus('generating');
      
      let withdrawalProof;
      try {
        withdrawalProof = await generateWithdrawalProof(
          depositData,
          formattedRecipient,
          merkleRoot, // Use the appropriate root for the proof
          merkleProof,
          leafIndex // Pass the leaf index we found
        );
        
        setProofStatus('verifying');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate verification
        setProofStatus('complete');
      } catch (proofError) {
        console.error('Proof generation failed:', proofError);
        setProofStatus('error');
        throw proofError;
      }

      // Submit withdrawal
      setWithdrawalStatus('Submitting withdrawal transaction...');
      const withdrawalProcessor = await getWithdrawalProcessor();
      
      // The withdrawalProof already contains a valid PLONK proof in the full gnark format
      if (!withdrawalProof.proof || !withdrawalProof.proof.lro) {
        throw new Error('Invalid proof generated');
      }
      
      // Log the proof structure for debugging
      console.log('PLONK proof structure:');
      console.log('- lro points:', (withdrawalProof.proof as any).lro.length);
      console.log('- z point:', (withdrawalProof.proof as any).z);
      console.log('- h array:', (withdrawalProof.proof as any).h?.length || 'N/A');
      console.log('- bsb22_commitments:', (withdrawalProof.proof as any).bsb22_commitments?.length || 'N/A');
      console.log('- batched_proof.claimed_values:', (withdrawalProof.proof as any).batched_proof?.claimed_values?.length || 'N/A');
      
      // Format public signals to ensure they're all valid for BigInt conversion
      // The canister expects all values to be parseable as BigInt
      const formatSignalForBigInt = (signal: string): string => {
        // Remove 0x prefix if present
        const cleanSignal = signal.startsWith('0x') ? signal.slice(2) : signal;
        
        // If it's already a decimal number, return as-is
        if (/^\d+$/.test(cleanSignal)) {
          return cleanSignal;
        }
        
        // If it's hex, convert to decimal
        if (/^[0-9a-fA-F]+$/.test(cleanSignal)) {
          return BigInt('0x' + cleanSignal).toString();
        }
        
        throw new Error(`Invalid signal format: ${signal}`);
      };
      
      // Log the public signals for debugging
      if (withdrawalProof.publicSignals) {
        console.log('Raw public signals:', withdrawalProof.publicSignals);
        const formattedSignals = withdrawalProof.publicSignals.map(formatSignalForBigInt);
        console.log('Formatted public signals:', formattedSignals);
      }
      
      // Convert amount to wei if it's in ETH format
      let amountInWei: bigint;
      if (depositData.amountWei) {
        // Use the exact amount that was used in the commitment
        amountInWei = BigInt(depositData.amountWei);
      } else if (withdrawalProof.amount.includes('.')) {
        // Amount is in ETH, convert to wei
        const decimals = depositData.token === 'ETH' ? 18 : 
                        depositData.token === 'BTC' ? 8 : 
                        6; // Default for others
        amountInWei = BigInt(Math.floor(parseFloat(withdrawalProof.amount) * Math.pow(10, decimals)));
      } else {
        // Amount is already in smallest unit
        amountInWei = BigInt(withdrawalProof.amount);
      }
      
      // Use the pre-computed nullifierHash if available
      const nullifierHashToUse = depositData.nullifierHash || withdrawalProof.nullifier;
      
      // Map chain names to chain IDs
      const getChainId = (chain: string): bigint => {
        const chainMap: { [key: string]: bigint } = {
          'ETH': 1n,        // Ethereum mainnet
          'ethereum': 1n,
          '1': 1n,
          'ICP': 0n,        // ICP uses 0 as chain ID
          'BTC': 0n,        // Bitcoin (not EVM)
          '137': 137n,      // Polygon
          '42161': 42161n,  // Arbitrum
        };
        
        const normalizedChain = chain.toLowerCase();
        if (chainMap[normalizedChain] !== undefined) {
          return chainMap[normalizedChain];
        }
        if (chainMap[chain] !== undefined) {
          return chainMap[chain];
        }
        
        // Try to parse as number if not in map
        try {
          return BigInt(chain);
        } catch {
          console.warn(`Unknown chain: ${chain}, defaulting to Ethereum mainnet (1)`);
          return 1n; // Default to Ethereum mainnet
        }
      };
      
      const chainId = getChainId(withdrawalProof.chainId || depositData.chain || selectedChain);
      
      // Debug log all parameters before sending to canister
      console.log('=== CANISTER CALL PARAMETERS ===');
      console.log('nullifierHash:', nullifierHashToUse);
      console.log('recipient:', formattedRecipient);
      console.log('amount:', amountInWei.toString());
      console.log('token:', depositData.token);
      console.log('chainId:', chainId.toString());
      console.log('merkleRoot:', merkleRoot);
      console.log('merkleRoot type:', typeof merkleRoot);
      console.log('Is merkleRoot array?', Array.isArray(merkleRoot));
      
      // IMPORTANT: Always use the original merkle root from the canister
      // The withdrawal processor validates against what's stored in deposit manager
      const result = await withdrawalProcessor.initiateWithdrawal(
        nullifierHashToUse,
        formattedRecipient,
        amountInWei,
        depositData.token,
        chainId,
        merkleRoot, // Use the original root, not actualRoot
        withdrawalProof.proof
      );

      if ('ok' in result) {
        setWithdrawalStatus(`Withdrawal successful! Transaction ID: ${result.ok.toString()}`);
        // Clear form
        setCommitmentInput('');
        setRecipient('');
        setDepositData(null);
        setTimeout(() => setProofStatus('idle'), 5000);
      } else {
        throw new Error(result.err);
      }
    } catch (error) {
      console.error('Withdrawal failed:', error);
      setWithdrawalStatus(`Withdrawal failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (proofStatus !== 'idle') {
        setProofStatus('error');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="withdraw-page">
      <h1 className="page-title">Withdraw</h1>
      
      <div className="withdraw-container">
        <form onSubmit={handleWithdraw} className="withdraw-form card">
          <div className="input-group">
            <label htmlFor="commitment">Deposit Data (JSON or Commitment)</label>
            <textarea
              id="commitment"
              placeholder={`Paste your saved deposit data JSON. Example format:
{
  "commitment": "0x...",
  "depositId": "123",
  "secret": "0x...",
  "nullifier": "0x...",
  "amount": "1000000",
  "token": "ICP",
  "chain": "ICP"
}`}
              value={commitmentInput}
              onChange={(e) => handleCommitmentChange(e.target.value)}
              rows={8}
            />
            {depositData && (
              <div className="deposit-info">
                <p>Amount: {formatAmount(depositData.amount, selectedChain === 'BTC' ? 0 : selectedChain === 'ICP' ? 2 : 1)} {depositData.token}</p>
                <p>Original Chain: {depositData.chain}</p>
              </div>
            )}
          </div>

          <div className="input-group">
            <label htmlFor="recipient">Recipient Address</label>
            <input
              id="recipient"
              type="text"
              placeholder={selectedChain === 'ICP' ? 'Principal ID' : selectedChain === 'BTC' ? 'Bitcoin address' : '0x...'}
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label htmlFor="chain">Destination Chain</label>
            <select
              id="chain"
              value={selectedChain}
              onChange={(e) => setSelectedChain(e.target.value)}
            >
              {chains.map(chain => (
                <option key={chain.id} value={chain.id}>
                  {chain.name}
                </option>
              ))}
            </select>
          </div>

          {fees && depositData && (
            <div className="fee-info">
              <h4>Estimated Fees</h4>
              <p>Network Fee: {formatAmount(fees.networkFee, selectedChain === 'BTC' ? 0 : selectedChain === 'ICP' ? 2 : 1)}</p>
              <p>Protocol Fee: {formatAmount(fees.protocolFee, selectedChain === 'BTC' ? 0 : selectedChain === 'ICP' ? 2 : 1)}</p>
              <p className="total-fee">Total Fee: {formatAmount(fees.total, selectedChain === 'BTC' ? 0 : selectedChain === 'ICP' ? 2 : 1)}</p>
              <p className="receive-amount">
                You will receive: {(() => {
                  // Convert amounts to BigInt, handling decimal formats
                  let depositAmountWei: bigint;
                  let feeTotalWei: bigint;
                  
                  if (depositData.amount.includes('.')) {
                    const decimals = depositData.token === 'ETH' ? 18 : 
                                    depositData.token === 'BTC' ? 8 : 
                                    6;
                    depositAmountWei = BigInt(Math.floor(parseFloat(depositData.amount) * Math.pow(10, decimals)));
                  } else {
                    depositAmountWei = BigInt(depositData.amount);
                  }
                  
                  if (fees.total.includes('.')) {
                    const decimals = depositData.token === 'ETH' ? 18 : 
                                    depositData.token === 'BTC' ? 8 : 
                                    6;
                    feeTotalWei = BigInt(Math.floor(parseFloat(fees.total) * Math.pow(10, decimals)));
                  } else {
                    feeTotalWei = BigInt(fees.total);
                  }
                  
                  const receiveAmount = (depositAmountWei - feeTotalWei).toString();
                  return formatAmount(
                    receiveAmount,
                    selectedChain === 'BTC' ? 0 : selectedChain === 'ICP' ? 2 : 1
                  );
                })()} {depositData.token}
              </p>
            </div>
          )}

          <button 
            type="submit" 
            className="btn withdraw-btn"
            disabled={isProcessing || !depositData || !recipient}
          >
            {isProcessing ? 'Processing...' : 'Withdraw'}
          </button>
        </form>

        <ProofStatus status={proofStatus} />

        {withdrawalStatus && (
          <div className={`status-section card ${withdrawalStatus.includes('successful') ? 'success' : ''}`}>
            <p>{withdrawalStatus}</p>
          </div>
        )}

        <div className="info-section card">
          <h3>How Withdrawals Work</h3>
          <ul>
            <li>Paste your saved deposit data (JSON format)</li>
            <li>Provide the recipient address on your chosen chain</li>
            <li>The system generates a zero-knowledge proof</li>
            <li>Your withdrawal is processed privately</li>
            <li>Funds are sent to the recipient without revealing the depositor</li>
          </ul>
        </div>

        <div className="privacy-section card">
          <h3>Privacy Features</h3>
          <ul>
            <li>Zero-knowledge proofs ensure complete anonymity</li>
            <li>No on-chain link between deposits and withdrawals</li>
            <li>Cross-chain withdrawals break tracking patterns</li>
            <li>Timing and amount variations prevent analysis</li>
            <li>One-time nullifiers prevent double spending</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default WithdrawPage;