import ExpoModulesCore
import DynamicSDKSwift

// UNBUILT, best effort from https://www.dynamic.xyz/docs/swift/* (SDK 1.9.0). GUESSES, not confirmed in docs:
// BaseWallet.id optionality, authenticatedUser.email, sdk.stellar.getNetwork return type.

private let errCode = "ERR_VANNA_DYNAMIC"

internal final class VannaDynamicException: GenericException<String>, @unchecked Sendable {
  override var reason: String { param }
  override var code: String { errCode }
}

// Lets `wallet.id` compile whether the SDK types it as String or String?.
private func asOptional<T>(_ v: T?) -> T? { v }
private func asOptional<T>(_ v: T) -> T? { v }

internal struct ConfigureOptions: Record {
  @Field var appName: String?
  @Field var appLogoUrl: String?
  @Field var appOrigin: String?
  @Field var redirectUrl: String?
}

public class VannaDynamicModule: Module {
  private var configuredEnvId: String?

  public func definition() -> ModuleDefinition {
    Name("VannaDynamic")

    AsyncFunction("configure") { (environmentId: String, options: ConfigureOptions?) async throws in
      try await self.configure(environmentId, options)
    }

    AsyncFunction("sendEmailCode") { (email: String) async throws in
      let sdk = try self.sdk()
      try await sdk.auth.email.sendOTP(email: email.trimmingCharacters(in: .whitespacesAndNewlines))
    }

    AsyncFunction("verifyEmailCode") { (code: String) async throws -> [String: Any?] in
      let sdk = try self.sdk()
      try await sdk.auth.email.verifyOTP(token: code.trimmingCharacters(in: .whitespacesAndNewlines))
      // Dynamic creates the wallets after authentication; poll until both chains exist (max ~25 s).
      for _ in 0..<50 {
        let w = sdk.wallets.userWallets
        if self.solana(w) != nil && self.stellar(w) != nil { break }
        try await Task.sleep(nanoseconds: 500_000_000)
      }
      return self.session(sdk)
    }

    AsyncFunction("getSession") { () async throws -> [String: Any?]? in
      let sdk = try self.sdk()
      guard sdk.auth.authenticatedUser != nil else { return nil }
      return self.session(sdk)
    }

    AsyncFunction("signStellarXdr") { (xdr: String) async throws -> String in
      let sdk = try self.sdk()
      guard let wallet = self.stellar(sdk.wallets.userWallets), let id = asOptional(wallet.id) else {
        throw VannaDynamicException("No Stellar wallet for this user. Is Stellar enabled in the Dynamic dashboard?")
      }
      return try await sdk.stellar.signTransaction(
        walletId: id,
        transactionXdr: xdr.trimmingCharacters(in: .whitespacesAndNewlines)
      )
    }

    AsyncFunction("signSolanaTransaction") { (base64: String) async throws -> String in
      let sdk = try self.sdk()
      guard let wallet = self.solana(sdk.wallets.userWallets) else {
        throw VannaDynamicException("No Solana wallet for this user. Is Solana enabled in the Dynamic dashboard?")
      }
      let signer = sdk.solana.createSigner(wallet: wallet)
      return try await signer.signEncodedTransaction(
        base64Transaction: base64.trimmingCharacters(in: .whitespacesAndNewlines)
      )
    }

    AsyncFunction("getStellarNetwork") { () async throws -> String in
      let sdk = try self.sdk()
      guard let wallet = self.stellar(sdk.wallets.userWallets), let id = asOptional(wallet.id) else {
        throw VannaDynamicException("No Stellar wallet for this user")
      }
      let network = try await sdk.stellar.getNetwork(walletId: id)
      return "\(network)"
    }

    AsyncFunction("signOut") { () async throws in
      try await self.sdk().auth.logout()
    }
  }

  @MainActor
  private func configure(_ environmentId: String, _ options: ConfigureOptions?) async throws {
    if let current = configuredEnvId {
      if current == environmentId { return }
      throw VannaDynamicException("Dynamic is already configured with another environment ID; restart the app to change it.")
    }
    guard !environmentId.isEmpty else { throw VannaDynamicException("Dynamic environment ID is empty") }
    _ = DynamicSDK.initialize(
      props: ClientProps(
        environmentId: environmentId,
        appLogoUrl: options?.appLogoUrl ?? "https://test.vanna.finance/favicon.ico",
        appName: options?.appName ?? "Vanna",
        redirectUrl: options?.redirectUrl ?? "vannadynamic://",
        appOrigin: options?.appOrigin ?? "https://test.vanna.finance"
      )
    )
    configuredEnvId = environmentId
  }

  private func sdk() throws -> DynamicSDK {
    guard configuredEnvId != nil else {
      throw VannaDynamicException("Dynamic is not configured; call configure(environmentId) first")
    }
    return DynamicSDK.instance()
  }

  private func solana(_ wallets: [BaseWallet]) -> BaseWallet? {
    wallets.first { ["SOL", "SOLANA"].contains($0.chain.uppercased()) }
  }

  private func stellar(_ wallets: [BaseWallet]) -> BaseWallet? {
    wallets.first { $0.chain.uppercased() == "STELLAR" }
  }

  private func session(_ sdk: DynamicSDK) -> [String: Any?] {
    let wallets = sdk.wallets.userWallets
    return [
      "email": sdk.auth.authenticatedUser?.email,
      "solanaAddress": solana(wallets)?.address,
      "stellarAddress": stellar(wallets)?.address
    ]
  }
}
