/**
 * Dynamic (dynamic.xyz) email sign-in + embedded wallets: one Solana and one Stellar wallet per email.
 *
 * Backed by the local native module `modules/vanna-dynamic` (Dynamic Kotlin/Swift SDKs). It only exists in a
 * development build. In Expo Go `available` is false and every call rejects with a DynamicUnavailableError;
 * nothing here throws at import time.
 */
import { requireOptionalNativeModule } from 'expo';

import type {
  VannaDynamicNativeModule,
  VannaDynamicSession,
} from '../../modules/vanna-dynamic';

export type { VannaDynamicSession as DynamicSession };

const NEEDS_BUILD =
  'Email sign-in needs the development build (Dynamic uses native code that Expo Go does not include). ' +
  'Install the Vanna dev build: npx expo run:android or eas build --profile development.';

export class DynamicUnavailableError extends Error {
  constructor(message: string = NEEDS_BUILD) {
    super(message);
    this.name = 'DynamicUnavailableError';
  }
}

const native = requireOptionalNativeModule<VannaDynamicNativeModule>('VannaDynamic');

/** True only in a build that contains the native module. */
export const available: boolean = native != null;

/** From EXPO_PUBLIC_DYNAMIC_ENV_ID (inlined by Expo at bundle time). */
export const environmentId: string = process.env.EXPO_PUBLIC_DYNAMIC_ENV_ID ?? '';

let configuring: Promise<void> | null = null;

function ready(): Promise<VannaDynamicNativeModule> {
  if (!native) return Promise.reject(new DynamicUnavailableError());
  if (!environmentId) {
    return Promise.reject(new Error('EXPO_PUBLIC_DYNAMIC_ENV_ID is not set. Add it to .env and restart Expo.'));
  }
  configuring ??= native.configure(environmentId, {}).catch((e: unknown) => {
    configuring = null; // allow a retry
    throw e;
  });
  return configuring.then(() => native);
}

/** Initialises the SDK. Optional: every other call does it lazily. */
export async function configure(): Promise<void> {
  await ready();
}

/** Sends the one-time code to the email address. */
export async function sendEmailCode(email: string): Promise<void> {
  return (await ready()).sendEmailCode(email);
}

/** Verifies the code; resolves once Dynamic has created (or restored) both wallets. */
export async function verifyEmailCode(code: string): Promise<VannaDynamicSession> {
  return (await ready()).verifyEmailCode(code);
}

export async function signInSocial(provider: "google" | "x"): Promise<VannaDynamicSession> {
  const module = await ready();
  if (!module.signInSocial) throw new Error("Google and X sign-in aren't available on this device yet");
  return module.signInSocial(provider);
}

/** Opens a link in one named Android app. False when that app is missing or can't take the link. */
export async function openInApp(uri: string, packageName: string): Promise<boolean> {
  return native?.openInApp ? native.openInApp(uri, packageName) : false;
}

/** The signed-in user and wallet addresses, or null when signed out. */
export async function getSession(): Promise<VannaDynamicSession | null> {
  if (!available) return null; // Expo Go: simply no session, so startup never errors
  return (await ready()).getSession();
}

/** Signs a base64 transaction envelope XDR with the Stellar wallet; returns the signed XDR. */
export async function signStellarXdr(xdr: string): Promise<string> {
  return (await ready()).signStellarXdr(xdr);
}

/** Signs a base64 serialized Solana transaction (does not broadcast); returns the signed base64. */
export async function signSolanaTransaction(base64: string): Promise<string> {
  return (await ready()).signSolanaTransaction(base64);
}

/** Network the Dynamic dashboard assigned to the Stellar wallet (check it is testnet). */
export async function getStellarNetwork(): Promise<string> {
  return (await ready()).getStellarNetwork();
}

export async function signOut(): Promise<void> {
  return (await ready()).signOut();
}
