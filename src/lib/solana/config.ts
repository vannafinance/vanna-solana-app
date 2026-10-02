import type { AppIdentity } from "@wallet-ui/react-native-web3js";

export const RPC_URL = process.env.EXPO_PUBLIC_SOLANA_RPC_URL || "https://rpc-devnet.solana.vanna.finance";
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "https://devnet.solana.vanna.finance";
export const DEV_WALLET_ADDRESS = __DEV__ ? process.env.EXPO_PUBLIC_DEV_WALLET_ADDRESS || undefined : undefined;
export const VANNA_PROGRAM_ID = process.env.EXPO_PUBLIC_VANNA_PROGRAM_ID || "BZ812nUv4Qhr2p1JVgmoJGjYTGk1brAXckyhFSCNH3Zg";
export const CHAIN = "solana:mainnet";
export const APP_IDENTITY: AppIdentity = {
  name: "Vanna",
  uri: "https://devnet.solana.vanna.finance",
  icon: "favicon.ico",
};
export const FORK_FAUCET_ENABLED = process.env.EXPO_PUBLIC_FORK_FAUCET !== "off";
// Fork-only cheatcodes (re-cloning stale swap pools). A real cluster has none, so a build for one sets this to "off".
export const FORK_CHEATCODES_ENABLED = process.env.EXPO_PUBLIC_FORK_CHEATCODES !== "off";
export const NETWORK_LABEL = "Solana mainnet fork";
// The base fee for a one signature transaction; the app adds no priority fee.
export const NETWORK_FEE_ESTIMATE = "≈ 0.000005 SOL";
