export type ClaimStatus = "idle" | "pending" | "done" | "error";

export type FaucetMessage = { tone: "positive" | "negative"; text: string };

export type FaucetRow = {
  symbol: "SOL" | "USDC" | "TSLAx" | "GOOGLx" | "AAPLx" | "ANTHROPIC" | "OPENAI";
  detail: string;
  status: ClaimStatus;
};
