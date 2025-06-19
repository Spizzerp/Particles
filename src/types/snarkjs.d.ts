declare module 'snarkjs' {
  export interface Proof {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
    protocol: string;
    curve: string;
  }

  export interface PublicSignals extends Array<string> {}

  export const groth16: {
    fullProve: (
      input: any,
      wasmPath: string,
      zkeyPath: string
    ) => Promise<{
      proof: Proof;
      publicSignals: PublicSignals;
    }>;
    
    verify: (
      vKey: any,
      publicSignals: PublicSignals,
      proof: Proof
    ) => Promise<boolean>;
    
    exportSolidityCallData: (
      proof: Proof,
      publicSignals: PublicSignals
    ) => Promise<string>;
  };
}