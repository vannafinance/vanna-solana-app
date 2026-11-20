// The Solana wallet library always shows Android's wallet list and times out after 10 s (too short when a chooser or cold
// wallet starts). This lets a call name one wallet app so it opens directly, and raises the association wait to 45 s.
// Runs after every install; safe to run twice.
const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "node_modules", "@solana-mobile", "mobile-wallet-adapter-protocol", "android", "src", "main", "java", "com", "solanamobile", "mobilewalletadapter", "reactnative", "SolanaMobileWalletAdapterModule.kt");

if (fs.existsSync(file)) {
  let source = fs.readFileSync(file, "utf8");
  const marker = 'config?.getString("packageName")';
  if (!source.includes(marker)) {
    const anchor = /(localAssociation\.session\s*\)\r?\n)/;
    if (!anchor.test(source)) throw new Error("patch-mwa: the wallet library changed; update scripts/patch-mwa.js");
    source = source.replace(anchor, `$1                ${marker}?.let { intent.setPackage(it) }\n`);
  }
  source = source.replace(/ASSOCIATION_TIMEOUT_MS\s*=\s*10000\b/, "ASSOCIATION_TIMEOUT_MS = 45000");
  // Each wallet request (authorize, sign) is cut off after 90 s. Phantom shows several screens for a fork transaction (Request blocked,
  // Confirm (unsafe), Are you sure, tick, Yes) and on a slow phone that can take longer, so the request timed out while the person was
  // still approving. 5 minutes. Needs a native rebuild to take effect.
  source = source.replace(/CLIENT_TIMEOUT_MS\s*=\s*90000\b/, "CLIENT_TIMEOUT_MS = 300000");
  // Cancel. `invoke` waits for the wallet's answer on the React module thread, and endSession is queued behind it on that same thread:
  // a request the person cancelled kept the one-session lock until the wallet answered (or 5 minutes). Waiting on a coroutine instead
  // lets endSession close the session at once, which releases the lock. Needs a native rebuild.
  if (!source.includes("vanna: invoke off the module thread")) {
    const invoke = /@ReactMethod\s+override fun invoke\([\s\S]*?(?=@ReactMethod\s+override fun endSession)/;
    if (!invoke.test(source)) throw new Error("patch-mwa: the wallet library changed (invoke); update scripts/patch-mwa.js");
    const tick = "`";
    const replacement = [
      "@ReactMethod",
      "    override fun invoke(method: String, params: ReadableMap?, promise: Promise): Unit {",
      "        // vanna: invoke off the module thread, so endSession can end the session while a wallet request is still waiting",
      `        val state = sessionState ?: throw NullPointerException("Tried to invoke ${tick}$method${tick} without an active session")`,
      "        val json = convertMapToJson(params)",
      "        launch {",
      `            Log.d(TAG, "invoke ${tick}$method${tick} with params $params")`,
      "            try {",
      "                val result = state.client.methodCall(method, json, CLIENT_TIMEOUT_MS).get() as JSONObject",
      "                promise.resolve(convertJsonToMap(result))",
      "            } catch (e: ExecutionException) {",
      "                val cause = e.cause",
      "                if (cause is JsonRpc20Client.JsonRpc20RemoteException) {",
      "                    val userInfo = Arguments.createMap()",
      '                    userInfo.putInt("jsonRpcErrorCode", cause.code)',
      '                    promise.reject("JSON_RPC_ERROR", cause, userInfo)',
      "                } else if (cause is TimeoutException) {",
      '                    promise.reject("Timed out waiting for response", e)',
      "                } else {",
      `                    Log.e(TAG, "Failed to invoke ${tick}$method${tick}", e)`,
      "                    promise.reject(e)",
      "                }",
      "            } catch (e: Throwable) {",
      `                Log.e(TAG, "Failed to invoke ${tick}$method${tick} with params $params", e)`,
      "                promise.reject(e)",
      "            }",
      "        }",
      "    }",
      "",
      "    ",
    ].join("\n");
    source = source.replace(invoke, () => replacement);
  }
  fs.writeFileSync(file, source);
}
