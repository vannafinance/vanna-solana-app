export function explorerAccountUrl(address: string): string {
  return `https://solscan.io/account/${address}`;
}

export function explorerTransactionUrl(signature: string): string {
  return `https://solscan.io/tx/${signature}`;
}
