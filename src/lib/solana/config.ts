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
