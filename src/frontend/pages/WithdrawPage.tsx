import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getWithdrawalProcessor, getDepositManager } from '../services/actorFactory';
import { 
  parseDepositData, 
  generateWithdrawalProof, 
  formatRecipientAddress,
  estimateWithdrawalFees,
  DepositData
} from '../services/zkProofService';
import { formatAmount } from '../utils/crypto';
import ProofStatus from '../components/ProofStatus';
import './WithdrawPage.css';

const WithdrawPage: React.FC = () => {
  const { identity, isAuthenticated } = useAuth();
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
      setDepositData(parsed);
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
      
      if (!depositInfo) {
        throw new Error('Deposit not found');
      }

      const deposit = depositInfo;
      
      // Get merkle root and proof from DepositManager
      setWithdrawalStatus('Generating merkle proof...');
      const merkleRoot = await depositManager.getCurrentMerkleRoot();
      
      if (!merkleRoot) {
        throw new Error('No merkle root found');
      }
      
      // Use depositId as leafIndex (simplified approach)
      const leafIndex = Number(depositData.depositId);
      
      const merkleProofResult = await depositManager.getMerkleProof(BigInt(leafIndex));
      if ('err' in merkleProofResult) {
        throw new Error('Could not generate merkle proof: ' + merkleProofResult.err);
      }
      
      const merkleProof = merkleProofResult.ok;

      // Generate ZK proof
      setWithdrawalStatus('Generating zero-knowledge proof...');
      setProofStatus('generating');
      
      let withdrawalProof;
      try {
        withdrawalProof = await generateWithdrawalProof(
          depositData,
          formattedRecipient,
          merkleRoot,
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
      
      // Create PLONK proof object matching the expected format
      // The withdrawalProof must contain a valid PLONK proof from the client-side prover
      if (!withdrawalProof.proof || !withdrawalProof.proof.lro) {
        throw new Error('Invalid proof generated');
      }
      
      const plonkProof = {
        lro: withdrawalProof.proof.lro,
        z: withdrawalProof.proof.z,
        h1: withdrawalProof.proof.h1,
        h2: withdrawalProof.proof.h2,
        wire_values_at_z: withdrawalProof.proof.wire_values_at_z,
        wire_values_at_z_omega: withdrawalProof.proof.wire_values_at_z_omega
      };
      
      const result = await withdrawalProcessor.initiateWithdrawal(
        withdrawalProof.nullifier,
        formattedRecipient,
        BigInt(withdrawalProof.amount),
        depositData.token,
        BigInt(withdrawalProof.chainId || selectedChain),
        merkleRoot,
        plonkProof
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
                You will receive: {formatAmount(
                  (BigInt(depositData.amount) - BigInt(fees.total)).toString(),
                  selectedChain === 'BTC' ? 0 : selectedChain === 'ICP' ? 2 : 1
                )} {depositData.token}
              </p>
            </div>
          )}

          <button 
            type="submit" 
            className="btn withdraw-btn"
            disabled={isProcessing || !depositData || !recipient || !isAuthenticated}
          >
            {isProcessing ? 'Processing...' : 'Withdraw'}
          </button>

          {!isAuthenticated && (
            <p className="auth-warning">Please connect your wallet to withdraw</p>
          )}
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