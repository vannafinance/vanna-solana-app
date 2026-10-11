import AsyncStorage from "@react-native-async-storage/async-storage";
import { PublicKey } from "@solana/web3.js";
import { toUint8Array, type Account, type WalletAuthorizationCache } from "@wallet-ui/react-native-web3js";

const STORAGE_KEY = "vanna-wallet-authorization-mainnet";

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function readAccount(value: unknown): Account {
  if (!record(value) || typeof value.addressBase64 !== "string") throw new Error("Invalid wallet account");
  const bytes = toUint8Array(value.addressBase64);
  if (bytes.length !== 32) throw new Error("Invalid wallet address");
  const address = new PublicKey(bytes);
  return {
    address,
    publicKey: address,
    addressBase64: value.addressBase64,
    label: typeof value.label === "string" ? value.label : undefined,
  };
}

// Wallet UI 4.3.0 revives publicKey but leaves address as a string after a restart.
export const walletCache: WalletAuthorizationCache = {
  async get() {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (!stored) return undefined;
    try {
      const value: unknown = JSON.parse(stored);
      if (!record(value) || typeof value.authToken !== "string" || !Array.isArray(value.accounts)) {
        throw new Error("Invalid wallet authorization");
      }
      const accounts = value.accounts.map(readAccount);
      const selected = readAccount(value.selectedAccount);
      const selectedAccount = accounts.find((account) => account.address.equals(selected.address));
      if (!selectedAccount) throw new Error("Selected wallet account is missing");
      return { accounts, selectedAccount, authToken: value.authToken };
    } catch {
      await AsyncStorage.removeItem(STORAGE_KEY);
      return undefined;
    }
  },
  async set(value) {
    if (!value) return this.clear();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  },
  async clear() {
    await AsyncStorage.removeItem(STORAGE_KEY);
  },
};
