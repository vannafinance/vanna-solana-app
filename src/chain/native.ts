import { requireOptionalNativeModule } from "expo";

import type { VannaNativeModule } from "../../modules/vanna-native";

// Small Android helpers (modules/vanna-native): open or launch a wallet app, share or save an image. Each one answers false when the
// native module is missing (Expo Go, iOS) so the callers can fall back.
const native = requireOptionalNativeModule<VannaNativeModule>("VannaNative");

export const nativeAvailable = native != null;
export const openInApp = async (uri: string, packageName: string): Promise<boolean> => (native ? native.openInApp(uri, packageName) : false);
export const appInstalled = async (packageName: string): Promise<boolean> => (native ? native.appInstalled(packageName) : false);
export const launchApp = async (packageName: string): Promise<boolean> => (native ? native.launchApp(packageName) : false);
export const shareImage = async (uri: string, text: string, name: string): Promise<boolean> => (native ? native.shareImage(uri, text, name) : false);
export const saveImage = async (uri: string, name: string): Promise<boolean> => (native ? native.saveImage(uri, name) : false);

