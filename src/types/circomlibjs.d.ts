declare module 'circomlibjs' {
  export function buildPoseidon(): Promise<{
    (inputs: bigint[]): bigint;
    F: {
      toString(num: bigint, radix: number): string;
    };
  }>;
}