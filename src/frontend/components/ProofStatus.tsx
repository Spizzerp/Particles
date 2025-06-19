import React from 'react';
import './ProofStatus.css';

interface ProofStatusProps {
  status: 'idle' | 'generating' | 'verifying' | 'complete' | 'error';
  message?: string;
}

const ProofStatus: React.FC<ProofStatusProps> = ({ status, message }) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'idle':
        return '⏸️';
      case 'generating':
        return '🔐';
      case 'verifying':
        return '🔍';
      case 'complete':
        return '✅';
      case 'error':
        return '❌';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'idle':
        return 'Ready to generate proof';
      case 'generating':
        return 'Generating zero-knowledge proof...';
      case 'verifying':
        return 'Verifying proof...';
      case 'complete':
        return 'Proof generated successfully!';
      case 'error':
        return message || 'Proof generation failed';
    }
  };

  if (status === 'idle') return null;

  return (
    <div className={`proof-status ${status}`}>
      <div className="proof-status-icon">{getStatusIcon()}</div>
      <div className="proof-status-content">
        <div className="proof-status-text">{getStatusText()}</div>
        {status === 'generating' && (
          <div className="proof-status-details">
            <div className="proof-progress">
              <div className="proof-progress-bar" />
            </div>
            <p>This may take a few seconds...</p>
          </div>
        )}
        {status === 'complete' && (
          <div className="proof-status-details">
            <p>Your transaction is private and ready to submit!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProofStatus;