// Simulated latency for sample-data reads that replace on-chain calls.
export const delay = (ms = 220) => new Promise((resolve) => setTimeout(resolve, ms));
