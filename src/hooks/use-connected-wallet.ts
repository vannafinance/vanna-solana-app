import { useMobileWallet } from "@wallet-ui/react-native-web3js";

const UNNAMED = "Your wallet";
// Some wallets report a shortened address instead of a name; that is not worth showing as a name.
const ADDRESS_LIKE = "..";

export function useConnectedWallet(): { name: string; address: string } | null {
  const { account } = useMobileWallet();
  if (!account) return null;
  const label = account.label;
  return { name: label && !label.includes(ADDRESS_LIKE) ? label : UNNAMED, address: account.address.toBase58() };
}
