import { Connection } from "@solana/web3.js";

import { RPC_URL } from "./config";

export const rpcConnection = new Connection(RPC_URL, "confirmed");
