import type { AppIdentity } from "@wallet-ui/react-native-web3js";

export const RPC_URL = process.env.EXPO_PUBLIC_SOLANA_RPC_URL || "https://rpc-devnet.solana.vanna.finance";
export const CHAIN = "solana:mainnet";
export const APP_IDENTITY: AppIdentity = {
  name: "Vanna",
  uri: "https://devnet.solana.vanna.finance",
  icon: "favicon.ico",
};
