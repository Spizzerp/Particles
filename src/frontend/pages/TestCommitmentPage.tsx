import React, { useState } from 'react';
import { mimc, computeCommitment, computeNullifierHash } from '../utils/mimc';

const TestCommitmentPage: React.FC = () => {
  const [results, setResults] = useState<string[]>([]);
  
  const runTest = () => {
    const testResults: string[] = [];
    
    // Test data from test_data.json
    const testData = {
      secret: "13698080959274281840526872910007157294376119761774757368106597777839440065",
      nullifier: "192561868339365105493539961141657477360825742666710091497763875674648709038",
      amount: "1000000000000000000",
      expectedCommitment: "3455067941780777787455398339347901752849440241658135964778035948007694593178",
      expectedNullifierHash: "7077923660806332978795724426505496650445718668500361339162590946982435664214"
    };
    
    // Convert to hex format
    const secretHex = '0x' + BigInt(testData.secret).toString(16).padStart(64, '0');
    const nullifierHex = '0x' + BigInt(testData.nullifier).toString(16).padStart(64, '0');
    
    testResults.push('Test Data:');
    testResults.push(`Secret: ${secretHex}`);
    testResults.push(`Nullifier: ${nullifierHex}`);
    testResults.push(`Amount: ${testData.amount} wei (1 ETH)`);
    testResults.push('');
    
    // Test commitment calculation
    const commitment = computeCommitment(secretHex, nullifierHex, testData.amount);
    const nullifierHash = computeNullifierHash(nullifierHex);
    
    testResults.push('Results:');
    testResults.push(`Computed commitment: ${commitment}`);
    testResults.push(`Expected commitment: ${testData.expectedCommitment}`);
    testResults.push(`Match: ${commitment === testData.expectedCommitment ? '✅ YES' : '❌ NO'}`);
    testResults.push('');
    
    testResults.push(`Computed nullifier hash: ${nullifierHash}`);
    testResults.push(`Expected nullifier hash: ${testData.expectedNullifierHash}`);
    testResults.push(`Match: ${nullifierHash === testData.expectedNullifierHash ? '✅ YES' : '❌ NO'}`);
    testResults.push('');
    
    // Test formula verification
    testResults.push('Formula Verification:');
    
    // Test without amount (wrong formula)
    const commitmentWithoutAmount = mimc.hash([BigInt(secretHex), BigInt(nullifierHex)]);
    testResults.push(`MiMC(secret, nullifier) = ${commitmentWithoutAmount}`);
    
    // Test with amount (correct formula)
    const commitmentWithAmount = mimc.hash([BigInt(secretHex), BigInt(nullifierHex), BigInt(testData.amount)]);
    testResults.push(`MiMC(secret, nullifier, amount) = ${commitmentWithAmount}`);
    testResults.push('');
    
    if (commitment === commitmentWithAmount.toString()) {
      testResults.push('✅ Frontend is using the CORRECT formula: MiMC(secret, nullifier, amount)');
    } else {
      testResults.push('❌ Frontend is using the WRONG formula');
    }
    
    setResults(testResults);
  };
  
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Test Commitment Formula</h1>
      
      <button 
        onClick={runTest}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          cursor: 'pointer',
          marginBottom: '20px'
        }}
      >
        Run Test
      </button>
      
      {results.length > 0 && (
        <div style={{
          backgroundColor: '#f0f0f0',
          padding: '20px',
          borderRadius: '5px',
          fontFamily: 'monospace',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all'
        }}>
          {results.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TestCommitmentPage;