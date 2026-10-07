// Creates Vanna's address lookup table on Solana MAINNET: the protocol's fixed accounts (program, and for every asset its
// mint, asset config, reserve and price feed), the same for every user. Transactions that name them through this table use
// one byte per address instead of 32, so a heavy margin account's perps swap fits in one transaction without a lookup table
// made on the fork (which strict wallets such as Solflare refuse). Our fork copies mainnet accounts on first use, so the
// same table works there too.
//
// Spends real SOL only with --send. Run from the repo root:
//   node scripts/create-vanna-lookup-table.cjs            dry run: address list, authority wallet, balance, cost
//   node scripts/create-vanna-lookup-table.cjs --send     create the table and add the addresses
// Options: --keypair <file> (default ~/.config/vanna/vanna-alt-authority.json, outside the repo; created if missing; keep it,
//                            it is the only key that can add addresses to the table)
//          --rpc <url>      (default https://api.mainnet-beta.solana.com)
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { AddressLookupTableProgram, Connection, Keypair, PublicKey, TransactionMessage, VersionedTransaction } = require("@solana/web3.js");
const { loadTs } = require(path.resolve("scripts/load-ts.cjs"));

const arg = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index > -1 ? process.argv[index + 1] : fallback;
};
const SEND = process.argv.includes("--send");
const RPC = arg("--rpc", "https://api.mainnet-beta.solana.com");
const KEY_FILE = path.resolve(arg("--keypair", path.join(os.homedir(), ".config", "vanna", "vanna-alt-authority.json")));
const ADDRESSES_PER_EXTEND = 20;
const MIN_BALANCE_LAMPORTS = 12_000_000; // rent for 33 addresses (~0.0063 SOL) plus fees, with room to spare

const config = { RPC_URL: RPC, API_BASE_URL: "", VANNA_PROGRAM_ID: "BZ812nUv4Qhr2p1JVgmoJGjYTGk1brAXckyhFSCNH3Zg", CHAIN: "solana:mainnet", FORK_CHEATCODES_ENABLED: false, FORK_FAUCET_ENABLED: false, NETWORK_LABEL: "", NETWORK_FEE_ESTIMATE: "", DEV_WALLET_ADDRESS: undefined };
const stubs = { "./config": config, "@/lib/solana/config": config };
const cache = new Map();
const load = (file) => loadTs(file, stubs, cache);
const { assetConfigAddress, reserveAddress } = load("src/lib/solana/program-accounts.ts");
const { priceAccountAddress } = load("src/lib/solana/oracle-prices.ts");
const { assets } = load("src/lib/solana/assets.ts");

function vannaAddresses() {
  const rows = [["Vanna program", new PublicKey(config.VANNA_PROGRAM_ID)]];
  for (const asset of assets) {
    const mint = new PublicKey(asset.mint);
    rows.push([`${asset.symbol} mint`, mint], [`${asset.symbol} asset config`, assetConfigAddress(mint)], [`${asset.symbol} reserve`, reserveAddress(mint)], [`${asset.symbol} price feed`, priceAccountAddress(asset)]);
  }
  return rows;
}

function authority() {
  if (fs.existsSync(KEY_FILE)) return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(KEY_FILE, "utf8"))));
  const keypair = Keypair.generate();
  fs.mkdirSync(path.dirname(KEY_FILE), { recursive: true });
  fs.writeFileSync(KEY_FILE, JSON.stringify(Array.from(keypair.secretKey)));
  console.log(`Created a new authority wallet: ${KEY_FILE}\nKeep this file safe and private: it is the only key that can add addresses to the table.\n`);
  return keypair;
}

async function send(connection, payer, instructions) {
  const latest = await connection.getLatestBlockhash("confirmed");
  const transaction = new VersionedTransaction(new TransactionMessage({ payerKey: payer.publicKey, recentBlockhash: latest.blockhash, instructions }).compileToV0Message());
  transaction.sign([payer]);
  const signature = await connection.sendTransaction(transaction, { maxRetries: 5 });
  const result = await connection.confirmTransaction({ signature, ...latest }, "confirmed");
  if (result.value.err) throw new Error(`Transaction ${signature} failed: ${JSON.stringify(result.value.err)}`);
  return signature;
}

(async () => {
  const connection = new Connection(RPC, "confirmed");
  const rows = vannaAddresses();
  console.log(`Vanna lookup table contents (${rows.length} addresses):`);
  rows.forEach(([name, address], index) => console.log(`  ${String(index).padStart(2)}  ${name.padEnd(22)} ${address.toBase58()}`));

  const payer = authority();
  const balance = await connection.getBalance(payer.publicKey);
  const rent = await connection.getMinimumBalanceForRentExemption(56 + 32 * rows.length);
  console.log(`\nAuthority wallet: ${payer.publicKey.toBase58()}`);
  console.log(`Balance on ${RPC}: ${balance / 1e9} SOL`);
  console.log(`Table rent: ${rent / 1e9} SOL (refundable by closing the table), plus a few transaction fees`);

  if (balance < MIN_BALANCE_LAMPORTS) {
    console.log(`\nSend at least ${MIN_BALANCE_LAMPORTS / 1e9} SOL (0.015 is comfortable) to ${payer.publicKey.toBase58()} on mainnet, then run again.`);
    return;
  }
  if (!SEND) {
    console.log("\nDry run only. Run again with --send to create the table.");
    return;
  }

  const recentSlot = await connection.getSlot("finalized");
  const [createIx, table] = AddressLookupTableProgram.createLookupTable({ authority: payer.publicKey, payer: payer.publicKey, recentSlot });
  console.log(`\nCreating table ${table.toBase58()} ...`);
  console.log(`  created: ${await send(connection, payer, [createIx])}`);
  const addresses = rows.map(([, address]) => address);
  for (let start = 0; start < addresses.length; start += ADDRESSES_PER_EXTEND) {
    const chunk = addresses.slice(start, start + ADDRESSES_PER_EXTEND);
    const extendIx = AddressLookupTableProgram.extendLookupTable({ lookupTable: table, authority: payer.publicKey, payer: payer.publicKey, addresses: chunk });
    console.log(`  added ${start}-${start + chunk.length - 1}: ${await send(connection, payer, [extendIx])}`);
  }

  const created = (await connection.getAddressLookupTable(table)).value;
  const ok = created !== null && created.state.addresses.length === addresses.length && created.state.addresses.every((address, index) => address.equals(addresses[index]));
  console.log(`\n${ok ? "DONE" : "CHECK FAILED"}: table ${table.toBase58()} holds ${created?.state.addresses.length ?? 0} addresses.`);
  console.log("Send this table address to the app and web teams. Do not freeze it, so new assets can be added later.");
})().catch((error) => {
  console.error("ERROR", error.message);
  process.exit(1);
});
