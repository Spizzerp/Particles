import React, { useState } from 'react';
import './PoolsPage.css';

interface Pool {
  id: string;
  chainId: string;
  chainName: string;
  token: string;
  liquidity: string;
  apy: string;
  volume24h: string;
}

const PoolsPage: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<'pools' | 'provide'>('pools');

  const mockPools: Pool[] = [
    {
      id: '1',
      chainId: '1',
      chainName: 'Ethereum',
      token: 'ETH',
      liquidity: '$0',
      apy: '0%',
      volume24h: '$0'
    },
    {
      id: '2',
      chainId: '56',
      chainName: 'BSC',
      token: 'BNB',
      liquidity: '$0',
      apy: '0%',
      volume24h: '$0'
    },
    {
      id: '3',
      chainId: '137',
      chainName: 'Polygon',
      token: 'MATIC',
      liquidity: '$0',
      apy: '0%',
      volume24h: '$0'
    }
  ];

  return (
    <div className="pools-page">
      <h1 className="page-title">Liquidity Pools</h1>
      
      <div className="tabs">
        <button 
          className={`tab ${selectedTab === 'pools' ? 'active' : ''}`}
          onClick={() => setSelectedTab('pools')}
        >
          View Pools
        </button>
        <button 
          className={`tab ${selectedTab === 'provide' ? 'active' : ''}`}
          onClick={() => setSelectedTab('provide')}
        >
          Provide Liquidity
        </button>
      </div>

      {selectedTab === 'pools' ? (
        <div className="pools-list">
          <div className="pools-header">
            <span>Chain</span>
            <span>Token</span>
            <span>Liquidity</span>
            <span>APY</span>
            <span>24h Volume</span>
          </div>
          
          {mockPools.map(pool => (
            <div key={pool.id} className="pool-item card">
              <span>{pool.chainName}</span>
              <span>{pool.token}</span>
              <span>{pool.liquidity}</span>
              <span>{pool.apy}</span>
              <span>{pool.volume24h}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="provide-liquidity card">
          <h2>Provide Liquidity</h2>
          <p className="info-text">
            Earn fees by providing liquidity to the privacy pools. Your funds help enable private cross-chain transfers.
          </p>
          
          <form className="liquidity-form">
            <div className="input-group">
              <label>Select Chain</label>
              <select>
                <option>Ethereum</option>
                <option>BSC</option>
                <option>Polygon</option>
              </select>
            </div>
            
            <div className="input-group">
              <label>Token</label>
              <select>
                <option>ETH</option>
                <option>USDC</option>
                <option>USDT</option>
              </select>
            </div>
            
            <div className="input-group">
              <label>Amount</label>
              <input type="number" placeholder="0.0" />
            </div>
            
            <button type="submit" className="btn provide-btn">
              Provide Liquidity
            </button>
          </form>
          
          <div className="rewards-info">
            <h3>Rewards</h3>
            <ul>
              <li>Earn 0.3% of all transaction fees</li>
              <li>Additional incentive rewards</li>
              <li>Withdraw anytime</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default PoolsPage;