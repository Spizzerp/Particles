/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_IC_HOST: string
  readonly VITE_IC_NETWORK: string
  readonly VITE_DEPOSIT_MANAGER_CANISTER_ID: string
  readonly VITE_PARTICLE_ROUTER_CANISTER_ID: string
  readonly VITE_PATTERN_BREAKER_CANISTER_ID: string
  readonly VITE_WITHDRAWAL_PROCESSOR_CANISTER_ID: string
  readonly VITE_CRYPTO_COMPONENTS_CANISTER_ID: string
  readonly DEV: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}