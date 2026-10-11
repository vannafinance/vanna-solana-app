import { Connection } from "@solana/web3.js";

import { RPC_URL } from "./config";
import { retryingFetch } from "./rpc-retry";

export const rpcConnection = new Connection(RPC_URL, { commitment: "confirmed", fetch: retryingFetch() });
