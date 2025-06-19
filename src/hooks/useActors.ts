import { useState, useEffect } from 'react';
import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { idlFactory as depositManagerIDL } from '../declarations/deposit_manager';
import { idlFactory as withdrawalProcessorIDL } from '../declarations/withdrawal_processor';
import { idlFactory as cryptoComponentsIDL } from '../declarations/crypto_components';

const canisterIds = {
  depositManager: 'bd3sg-teaaa-aaaaa-qaaba-cai',
  withdrawalProcessor: 'b77ix-eeaaa-aaaaa-qaada-cai',
  cryptoComponents: 'bkyz2-fmaaa-aaaaa-qaaaq-cai'
};

export const useActors = () => {
  const [actors, setActors] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initActors = async () => {
      try {
        // Create agent
        const isProduction = import.meta.env.MODE === 'production';
        const agent = new HttpAgent({
          host: isProduction ? 'https://ic0.app' : 'http://localhost:4943'
        });

        // Fetch root key for local development
        if (!isProduction) {
          await agent.fetchRootKey();
        }

        // Create actors
        const depositManager = Actor.createActor(depositManagerIDL, {
          agent,
          canisterId: Principal.fromText(canisterIds.depositManager)
        });

        const withdrawalProcessor = Actor.createActor(withdrawalProcessorIDL, {
          agent,
          canisterId: Principal.fromText(canisterIds.withdrawalProcessor)
        });

        const cryptoComponents = Actor.createActor(cryptoComponentsIDL, {
          agent,
          canisterId: Principal.fromText(canisterIds.cryptoComponents)
        });

        setActors({
          depositManager,
          withdrawalProcessor,
          cryptoComponents
        });
      } catch (error) {
        console.error('Error initializing actors:', error);
      } finally {
        setLoading(false);
      }
    };

    initActors();
  }, []);

  return { ...actors, loading };
};