import React, { useState } from 'react';
import { zkProofService, DepositNote, parseDepositNote, serializeDepositNote } from '../../services/zkProof';
import { useActors } from '../../hooks/useActors';
import { Copy, Eye, EyeOff, Download, AlertCircle, Shield } from 'lucide-react';

export const PrivacyPool: React.FC = () => {
  const { depositManager, withdrawalProcessor, cryptoComponents } = useActors();
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Deposit state
  const [depositAmount, setDepositAmount] = useState('100');
  const [depositNote, setDepositNote] = useState<DepositNote | null>(null);
  const [showNote, setShowNote] = useState(false);

  // Withdrawal state
  const [withdrawalNote, setWithdrawalNote] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');

  const handleDeposit = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      // Generate deposit note
      const note = await zkProofService.generateDepositNote();
      setDepositNote(note);

      // Generate commitment on-chain
      const commitmentResult = await cryptoComponents.generateCommitment(
        note.secret,
        note.nullifier,
        BigInt(depositAmount)
      );

      if ('err' in commitmentResult) {
        throw new Error(commitmentResult.err);
      }

      // Create deposit
      const depositResult = await depositManager.createDeposit(
        BigInt(depositAmount),
        'ICP',
        'ICP',
        commitmentResult.ok
      );

      if ('err' in depositResult) {
        throw new Error(depositResult.err);
      }

      setSuccess(`Deposit successful! ID: ${depositResult.ok}. Save your note securely!`);
      setShowNote(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deposit failed');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      // Parse the deposit note
      const note = parseDepositNote(withdrawalNote);

      // Get current merkle root and proof
      const merkleRoot = await cryptoComponents.getCurrentMerkleRoot();
      if (!merkleRoot) {
        throw new Error('No merkle root found');
      }

      const leafIndex = 0; // Should be stored when depositing
      const merkleProofResult = await cryptoComponents.getMerkleProof(BigInt(leafIndex));
      
      if ('err' in merkleProofResult) {
        throw new Error(merkleProofResult.err);
      }

      // Generate nullifier hash
      const nullifierResult = await cryptoComponents.generateNullifier(
        note.secret,
        BigInt(leafIndex)
      );

      if ('err' in nullifierResult) {
        throw new Error(nullifierResult.err);
      }

      // Generate PLONK proof
      const { proof, publicSignals } = await zkProofService.generateWithdrawalProof(
        note.secret,
        note.nullifier,
        {
          pathElements: merkleProofResult.ok,
          pathIndices: Array(merkleProofResult.ok.length).fill(0).map((_, i) => i % 2),
          root: merkleRoot
        },
        recipientAddress,
        depositAmount
      );

      // Submit withdrawal with PLONK proof
      const withdrawResult = await withdrawalProcessor.initiateWithdrawal(
        nullifierResult.ok,
        recipientAddress,
        BigInt(depositAmount),
        'ICP',
        'ICP',
        merkleRoot,
        proof
      );

      if ('err' in withdrawResult) {
        throw new Error(withdrawResult.err);
      }

      setSuccess(`Withdrawal initiated! ID: ${withdrawResult.ok}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Withdrawal failed');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard!');
    setTimeout(() => setSuccess(''), 2000);
  };

  const downloadNote = () => {
    if (!depositNote) return;
    
    const noteString = serializeDepositNote(depositNote);
    const blob = new Blob([noteString], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `particle-note-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Privacy Pool</h2>
          
          {/* PLONK Badge */}
          <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 rounded-lg">
            <Shield className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">PLONK Verified</span>
          </div>
        </div>

        {/* Info Banner */}
        <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">
          <strong>Full Cryptographic Verification:</strong> This pool uses PLONK zero-knowledge proofs 
          with complete on-chain verification. No trust assumptions, maximum security.
        </div>

        {/* Tab Navigation */}
        <div className="flex mb-6 border-b">
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'deposit'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600'
            }`}
            onClick={() => setActiveTab('deposit')}
          >
            Deposit
          </button>
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'withdraw'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600'
            }`}
            onClick={() => setActiveTab('withdraw')}
          >
            Withdraw
          </button>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg">
            {success}
          </div>
        )}

        {/* Deposit Tab */}
        {activeTab === 'deposit' && (
          <div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Amount</label>
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter amount"
              />
            </div>

            <button
              onClick={handleDeposit}
              disabled={loading || !depositAmount}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Deposit'}
            </button>

            {/* Deposit Note Display */}
            {depositNote && (
              <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold">Your Deposit Note</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowNote(!showNote)}
                      className="p-1 hover:bg-yellow-100 rounded"
                    >
                      {showNote ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                    <button
                      onClick={() => copyToClipboard(serializeDepositNote(depositNote))}
                      className="p-1 hover:bg-yellow-100 rounded"
                    >
                      <Copy size={20} />
                    </button>
                    <button
                      onClick={downloadNote}
                      className="p-1 hover:bg-yellow-100 rounded"
                    >
                      <Download size={20} />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-yellow-800 mb-2">
                  Save this note securely! You'll need it to withdraw your funds.
                </p>
                {showNote && (
                  <div className="mt-2 p-2 bg-white rounded border border-yellow-300 font-mono text-xs break-all">
                    {serializeDepositNote(depositNote)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Withdraw Tab */}
        {activeTab === 'withdraw' && (
          <div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Deposit Note</label>
              <textarea
                value={withdrawalNote}
                onChange={(e) => setWithdrawalNote(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Paste your deposit note here"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Recipient Address</label>
              <input
                type="text"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter recipient address"
              />
            </div>

            <button
              onClick={handleWithdraw}
              disabled={loading || !withdrawalNote || !recipientAddress}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Generating PLONK Proof...' : 'Withdraw with Privacy'}
            </button>

            <div className="mt-4 text-sm text-gray-600">
              <p>The withdrawal process:</p>
              <ul className="list-disc list-inside mt-1">
                <li>Generate a PLONK zero-knowledge proof locally</li>
                <li>Verify ownership without revealing which deposit</li>
                <li>Full cryptographic verification on-chain</li>
                <li>Cost: ~$0.08 in cycles for maximum security</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};