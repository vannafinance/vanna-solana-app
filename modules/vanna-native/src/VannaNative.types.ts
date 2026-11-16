export interface VannaNativeModule {
  /** Opens a link in one named app. False when that app is missing or cannot take the link. */
  openInApp(uri: string, packageName: string): Promise<boolean>;
  /** True when the named app is installed. */
  appInstalled(packageName: string): Promise<boolean>;
  /** Brings an installed app to the front. */
  launchApp(packageName: string): Promise<boolean>;
  /** Image and post text together in the phone share menu. */
  shareImage(uri: string, text: string, name: string): Promise<boolean>;
  /** Saves a PNG to Pictures/Vanna (Android 10 and later). */
  saveImage(uri: string, name: string): Promise<boolean>;
}
