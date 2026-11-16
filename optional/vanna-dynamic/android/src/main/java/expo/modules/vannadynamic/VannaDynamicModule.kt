package expo.modules.vannadynamic

import androidx.activity.ComponentActivity
import com.dynamic.sdk.android.DynamicSDK
import com.dynamic.sdk.android.Models.BaseWallet
import com.dynamic.sdk.android.Module.Auth.SocialAuthModule
import com.dynamic.sdk.android.core.ClientProps
import com.dynamic.sdk.android.core.LoggerLevel
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull

class ConfigureOptions : Record {
  @Field val appName: String? = null
  @Field val appLogoUrl: String? = null
  @Field val appOrigin: String? = null
  @Field val redirectUrl: String? = null
}

private const val CODE = "ERR_VANNA_DYNAMIC"
private const val READY_TIMEOUT_MS = 15_000L
private const val WALLETS_TIMEOUT_MS = 25_000L
private const val RESTORE_TIMEOUT_MS = 10_000L

class VannaDynamicModule : Module() {
  private var configuredEnvId: String? = null

  override fun definition() = ModuleDefinition {
    Name("VannaDynamic")

    // Coming back from the browser (Google sign-in) or another app leaves the page paused; wake it again.
    // Dynamic's browser sign-in (Google / X) ends with its WebAuthSession restarting the app's activity (NEW_TASK | CLEAR_TASK), so the
    // activity the page was attached to is destroyed. Re-attach the page to the new activity, or it stays detached and never answers.
    OnActivityEntersForeground {
      if (configuredEnvId != null) runCatching {
        val web = DynamicSDK.getInstance().webViewController.webView
        attachPage(web)
        keepPageAwake(web)
      }
    }

    AsyncFunction("configure") Coroutine { environmentId: String, options: ConfigureOptions? ->
      guarded { configure(environmentId, options) }
    }

    AsyncFunction("sendEmailCode") Coroutine { email: String ->
      guarded { awaitSdk().auth.email.sendOTP(email.trim()) }
    }

    AsyncFunction("verifyEmailCode") Coroutine { code: String ->
      guarded {
        val sdk = awaitSdk()
        sdk.auth.email.verifyOTP(code.trim())
        // Dynamic creates the embedded wallets after authentication; wait for both chains.
        // A first-time user's two wallets take a while, so a short wait here would return only one of them.
        withTimeoutOrNull(WALLETS_TIMEOUT_MS) {
          sdk.wallets.userWalletsChanges.first { w -> solana(w) != null && stellar(w) != null }
        }
        sessionMap(sdk)
      }
    }

    AsyncFunction("signInSocial") Coroutine { provider: String ->
      guarded {
        val sdk = awaitSdk()
        val social = when (provider) {
          "google" -> SocialAuthModule.SocialProvider.GOOGLE
          "x" -> SocialAuthModule.SocialProvider.TWITTER
          else -> throw CodedException(CODE, "Unknown sign-in provider", null)
        }
        // A leftover token with no user makes the page treat this as "link a social account" and reject it
        // ("User is not logged in"). Starting from a clean signed-out state makes it a normal sign-in.
        if (sdk.auth.authenticatedUser == null) withTimeoutOrNull(5_000) { runCatching { sdk.auth.logout() } }
        sdk.auth.social.connect(social)
        withTimeoutOrNull(WALLETS_TIMEOUT_MS) {
          sdk.wallets.userWalletsChanges.first { w -> solana(w) != null && stellar(w) != null }
        }
        sessionMap(sdk)
      }
    }

    // Opens a link in one named app, so Android doesn't show its "Open with" list. False when that app can't take it.
    AsyncFunction("openInApp") { uri: String, packageName: String ->
      val context = appContext.reactContext ?: return@AsyncFunction false
      val intent = android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(uri))
        .setPackage(packageName)
        .addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
      try {
        context.startActivity(intent)
        true
      } catch (_: android.content.ActivityNotFoundException) {
        false
      }
    }

    AsyncFunction("appInstalled") { packageName: String ->
      appContext.reactContext?.packageManager?.getLaunchIntentForPackage(packageName) != null
    }

    AsyncFunction("launchApp") { packageName: String ->
      val context = appContext.reactContext ?: return@AsyncFunction false
      val intent = context.packageManager.getLaunchIntentForPackage(packageName) ?: return@AsyncFunction false
      context.startActivity(intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK))
      true
    }

    // Image and post together in the phone's own share menu. expo-sharing can only send the file.
    AsyncFunction("shareImage") { uri: String, text: String, name: String ->
      val context = appContext.reactContext ?: return@AsyncFunction false
      val path = android.net.Uri.parse(uri).path ?: return@AsyncFunction false
      // Apps show the file's own name, and a captured view is called something like ReactNative-snapshot-image123.png.
      val dir = java.io.File(context.cacheDir, "vanna-share").apply { mkdirs() }
      val named = java.io.File(path).copyTo(java.io.File(dir, java.io.File(name).name), overwrite = true)
      val content = androidx.core.content.FileProvider.getUriForFile(context, "${context.packageName}.SharingFileProvider", named)
      val send = android.content.Intent(android.content.Intent.ACTION_SEND).apply {
        type = "image/png"
        putExtra(android.content.Intent.EXTRA_STREAM, content)
        putExtra(android.content.Intent.EXTRA_TEXT, text)
        // The clip is what lets the system menu show the image as a preview.
        clipData = android.content.ClipData.newRawUri("Vanna", content)
        addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION)
      }
      val menu = android.content.Intent.createChooser(send, null)
      menu.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK or android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION)
      context.startActivity(menu)
      true
    }

    // Saves to Pictures/Vanna. No storage permission on Android 10 and later; older phones get false.
    AsyncFunction("saveImage") { uri: String, name: String ->
      if (android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.Q) return@AsyncFunction false
      val context = appContext.reactContext ?: return@AsyncFunction false
      val path = android.net.Uri.parse(uri).path ?: return@AsyncFunction false
      val resolver = context.contentResolver
      val values = android.content.ContentValues().apply {
        put(android.provider.MediaStore.Images.Media.DISPLAY_NAME, java.io.File(name).name)
        put(android.provider.MediaStore.Images.Media.MIME_TYPE, "image/png")
        put(android.provider.MediaStore.Images.Media.RELATIVE_PATH, android.os.Environment.DIRECTORY_PICTURES + "/Vanna")
        put(android.provider.MediaStore.Images.Media.IS_PENDING, 1)
      }
      val item = resolver.insert(android.provider.MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values) ?: return@AsyncFunction false
      val out = resolver.openOutputStream(item) ?: return@AsyncFunction false
      out.use { sink -> java.io.File(path).inputStream().use { it.copyTo(sink) } }
      values.clear()
      values.put(android.provider.MediaStore.Images.Media.IS_PENDING, 0)
      resolver.update(item, values, null, null)
      true
    }

    AsyncFunction("getSession") Coroutine { ->
      guarded {
        val sdk = awaitSdk()
        if (sdk.auth.authenticatedUser == null) null else sessionMap(sdk)
      }
    }

    AsyncFunction("signStellarXdr") Coroutine { xdr: String ->
      guarded {
        val sdk = awaitSdk()
        val wallet = restored(sdk, ::stellar) ?: throw CodedException(CODE, "No Stellar wallet for this user. Is Stellar enabled in the Dynamic dashboard?", null)
        val id = wallet.id ?: throw CodedException(CODE, "Stellar wallet has no id", null)
        sdk.stellar.signTransaction(walletId = id, transactionXdr = xdr.trim())
      }
    }

    // ed25519 signature over 32 bytes (given as 64 hex chars) with the Stellar wallet; returns the signature in base64.
    // signStellarXdr makes Dynamic's page and wallet iframe read the whole transaction, and their Stellar library rejects ledger keys
    // of newer XDR types (e.g. Aquarius "amm.constant", ScVal type 22). A Stellar signature is just ed25519 over the transaction hash,
    // so the app hashes the transaction itself and signs the hash here.
    // Uses Stellar signMessage: the wallet iframe's Stellar client decodes a hex message to its bytes and signs exactly those (the
    // same MPC call its own signTransaction makes with the hash). waas_signRawMessage (isFormatted) failed or never returned for Stellar.
    AsyncFunction("signStellarHash") Coroutine { hashHex: String ->
      guarded {
        val sdk = awaitSdk()
        val wallet = restored(sdk, ::stellar) ?: throw CodedException(CODE, "No Stellar wallet for this user. Is Stellar enabled in the Dynamic dashboard?", null)
        val id = wallet.id ?: throw CodedException(CODE, "Stellar wallet has no id", null)
        sdk.stellar.signMessage(walletId = id, message = hashHex.trim())
      }
    }

    AsyncFunction("signSolanaTransaction") Coroutine { base64: String ->
      guarded {
        val sdk = awaitSdk()
        val wallet = restored(sdk, ::solana) ?: throw CodedException(CODE, "No Solana wallet for this user. Is Solana enabled in the Dynamic dashboard?", null)
        sdk.solana.signTransaction(base64.trim(), wallet)
      }
    }

    AsyncFunction("getStellarNetwork") Coroutine { ->
      guarded {
        val sdk = awaitSdk()
        val wallet = stellar(sdk.wallets.userWallets) ?: throw CodedException(CODE, "No Stellar wallet for this user", null)
        val id = wallet.id ?: throw CodedException(CODE, "Stellar wallet has no id", null)
        sdk.stellar.getNetwork(walletId = id)
      }
    }

    AsyncFunction("signOut") Coroutine { ->
      guarded { awaitSdk().auth.logout() }
    }
  }

  // The wallet's signing runs in a hidden page; Chrome pauses a page that is not visible and focused, so a signature never came
  // back. Mark it resumed, visible and focused. Posted so it also runs once the view has been laid out.
  private fun keepPageAwake(web: android.webkit.WebView) {
    val wake = Runnable {
      runCatching {
        web.onResume()
        web.resumeTimers()
        web.isFocusable = true
        web.isFocusableInTouchMode = true
        web.dispatchWindowVisibilityChanged(android.view.View.VISIBLE)
        web.onWindowFocusChanged(true)
        web.requestFocus()
      }
    }
    web.post(wake)
    web.postDelayed(wake, 1500)
    web.postDelayed(wake, 5000)
  }

  // Hosts the page in the current activity's content area (invisible, off-screen, real size). If it sits in an older, destroyed
  // activity's view tree it is moved here first.
  private fun attachPage(web: android.webkit.WebView) {
    val activity = appContext.currentActivity ?: return
    val host = activity.findViewById<android.view.ViewGroup>(android.R.id.content) ?: return
    val parent = web.parent as? android.view.ViewGroup
    if (parent != null && parent.rootView === host.rootView) return // already in this activity's window
    parent?.removeView(web)
    val d = activity.resources.displayMetrics.density
    web.alpha = 0f
    web.translationX = -4000f
    activity.addContentView(web, android.widget.FrameLayout.LayoutParams((360 * d).toInt(), (640 * d).toInt()))
  }

  private suspend fun configure(environmentId: String, options: ConfigureOptions?) {
    val current = configuredEnvId
    if (current != null) {
      if (current == environmentId) return
      throw CodedException(CODE, "Dynamic is already configured with another environment ID; restart the app to change it.", null)
    }
    if (environmentId.isBlank()) throw CodedException(CODE, "Dynamic environment ID is empty", null)

    val activity = appContext.currentActivity as? ComponentActivity
      ?: throw CodedException(CODE, "Dynamic needs a visible ComponentActivity to initialise", null)

    withContext(Dispatchers.Main) {
      val props = ClientProps(
        environmentId = environmentId,
        appLogoUrl = options?.appLogoUrl ?: "https://test.vanna.finance/favicon.ico",
        appName = options?.appName ?: "Vanna",
        redirectUrl = options?.redirectUrl ?: "vannadynamic://",
        appOrigin = options?.appOrigin ?: "https://test.vanna.finance",
        logLevel = LoggerLevel.WARN
      )
      DynamicSDK.initialize(props, activity.applicationContext, activity)
      // The SDK loads its page with webView.post { loadUrl }, which only runs once the WebView is attached to a
      // window. Its Compose DynamicUI() normally hosts it; this app has no Compose, so attach it ourselves, invisible.
      // It must also count as visible: Chrome reports a tiny or hidden page as "hidden" and holds the wallet's signing
      // (MPC) back until it is shown, so a signature never came back. Give it a real size, but park it off-screen so it
      // cannot be seen or touched.
      val web = DynamicSDK.getInstance().webViewController.webView
      attachPage(web)
      keepPageAwake(web)
    }
    configuredEnvId = environmentId
  }

  private fun sdk(): DynamicSDK {
    if (configuredEnvId == null) throw CodedException(CODE, "Dynamic is not configured; call configure(environmentId) first", null)
    return DynamicSDK.getInstance()
  }

  // The SDK runs in a headless WebView; calling it before that WebView is ready hangs or fails.
  private suspend fun awaitSdk(): DynamicSDK {
    val sdk = sdk()
    if (!sdk.sdk.ready && withTimeoutOrNull(READY_TIMEOUT_MS) { sdk.sdk.readyChanges.first { it } } == null) {
      throw CodedException(CODE, "Sign-in service didn't start. Check your connection and try again.", null)
    }
    return sdk
  }

  private fun solana(wallets: List<BaseWallet>): BaseWallet? =
    wallets.firstOrNull { it.chain.uppercase() == "SOL" || it.chain.uppercase() == "SOLANA" }

  private fun stellar(wallets: List<BaseWallet>): BaseWallet? =
    wallets.firstOrNull { it.chain.uppercase() == "STELLAR" }

  // After an app relaunch the wallet list fills in shortly after the SDK reports ready.
  private suspend fun restored(sdk: DynamicSDK, pick: (List<BaseWallet>) -> BaseWallet?): BaseWallet? =
    pick(sdk.wallets.userWallets)
      ?: withTimeoutOrNull(RESTORE_TIMEOUT_MS) { sdk.wallets.userWalletsChanges.first { pick(it) != null } }?.let(pick)

  private fun sessionMap(sdk: DynamicSDK): Map<String, Any?> {
    val wallets = sdk.wallets.userWallets
    return mapOf(
      "email" to sdk.auth.authenticatedUser?.email,
      "solanaAddress" to solana(wallets)?.address,
      "stellarAddress" to stellar(wallets)?.address
    )
  }

  private suspend fun <T> guarded(block: suspend () -> T): T {
    try {
      return block()
    } catch (e: CancellationException) {
      throw e
    } catch (e: CodedException) {
      throw e
    } catch (e: Exception) {
      throw CodedException(CODE, e.message ?: e.javaClass.simpleName, e)
    }
  }
}
