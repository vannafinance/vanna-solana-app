/** Types for the `VannaDynamic` native module (Dynamic embedded wallets, Solana + Stellar). */

export type VannaDynamicConfigureOptions = {
  appName?: string;
  appLogoUrl?: string;
  /** Origin sent to Dynamic. Defaults to https://test.vanna.finance. */
  appOrigin?: string;
  /** Deep link scheme, must match the manifest/Info.plist scheme and the Dynamic dashboard. Default `vannadynamic://`. */
  redirectUrl?: string;
};

export type VannaDynamicSession = {
  email: string | null;
  solanaAddress?: string;
  stellarAddress?: string;
};

export interface VannaDynamicNativeModule {
  configure(environmentId: string, options?: VannaDynamicConfigureOptions): Promise<void>;
  sendEmailCode(email: string): Promise<void>;
  verifyEmailCode(code: string): Promise<VannaDynamicSession>;
  /** Google or X in the browser, then the same wallets as email. Android only so far. */
  signInSocial?(provider: "google" | "x"): Promise<VannaDynamicSession>;
  openInApp?(uri: string, packageName: string): Promise<boolean>;
  appInstalled?(packageName: string): Promise<boolean>;
  launchApp?(packageName: string): Promise<boolean>;
  getSession(): Promise<VannaDynamicSession | null>;
  /** Base64 transaction envelope XDR in, signed envelope XDR out. */
  signStellarXdr(xdr: string): Promise<string>;
  /** Base64 serialized transaction in, signed base64 transaction out (not broadcast). */
  signSolanaTransaction(base64: string): Promise<string>;
  /** Network of the Stellar wallet as configured in the Dynamic dashboard (e.g. "PUBLIC", "TESTNET"). */
  getStellarNetwork(): Promise<string>;
  signOut(): Promise<void>;
}
