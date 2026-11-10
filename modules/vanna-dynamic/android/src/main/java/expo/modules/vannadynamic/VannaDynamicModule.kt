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
