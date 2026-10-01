import { useMobileWallet } from "@wallet-ui/react-native-web3js";

import { DEV_WALLET_ADDRESS } from "@/lib/solana/config";

// In development a public address from the environment stands in for the connected wallet,
// so a funded fork wallet can be inspected without importing its key into an emulator wallet.
export function useWalletAddress(): string | null {
  const { account } = useMobileWallet();
  return DEV_WALLET_ADDRESS ?? account?.address.toBase58() ?? null;
}
