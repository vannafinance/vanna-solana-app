// Config plugin for the local vanna-dynamic module (Android).
// - raises minSdk to 28 (Dynamic Android SDK requirement)
// - adds INTERNET / ACCESS_NETWORK_STATE and Dynamic's AuthCallbackActivity (deep link scheme)
// - adds the vendored Dynamic AARs to the app module (a library module can only compileOnly them)
const fs = require('fs');
const path = require('path');
const {
  withAndroidManifest,
  withAppBuildGradle,
  withGradleProperties,
  withInfoPlist,
  AndroidConfig,
} = require('expo/config-plugins');

const MARK = '// vanna-dynamic AARs';
const REDIRECT_SCHEME = 'vannadynamic'; // keep in sync with redirectUrl default in the native module

function withMinSdk(config) {
  return withGradleProperties(config, (c) => {
    const key = 'android.minSdkVersion';
    const item = c.modResults.find((p) => p.type === 'property' && p.key === key);
    if (item) {
      if (parseInt(item.value, 10) < 28) item.value = '28';
    } else {
      c.modResults.push({ type: 'property', key, value: '28' });
    }
    return c;
  });
}

function withManifest(config) {
  return withAndroidManifest(config, (c) => {
    const manifest = c.modResults.manifest;
    manifest['uses-permission'] = manifest['uses-permission'] ?? [];
    for (const name of ['android.permission.INTERNET', 'android.permission.ACCESS_NETWORK_STATE']) {
      if (!manifest['uses-permission'].some((p) => p.$['android:name'] === name)) {
        manifest['uses-permission'].push({ $: { 'android:name': name } });
      }
    }
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(c.modResults);
    app.activity = app.activity ?? [];
    const cb = 'com.dynamic.sdk.android.Auth.AuthCallbackActivity';
    if (!app.activity.some((a) => a.$['android:name'] === cb)) {
      app.activity.push({
        $: {
          'android:name': cb,
          'android:exported': 'true',
          'android:launchMode': 'singleTop',
          'android:noHistory': 'true',
          'android:theme': '@android:style/Theme.Translucent.NoTitleBar',
        },
        'intent-filter': [
          {
            action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
            category: [
              { $: { 'android:name': 'android.intent.category.DEFAULT' } },
              { $: { 'android:name': 'android.intent.category.BROWSABLE' } },
            ],
            data: [{ $: { 'android:scheme': REDIRECT_SCHEME } }],
          },
        ],
      });
    }
    return c;
  });
}

function withAars(config) {
  return withAppBuildGradle(config, (c) => {
    const libs = path.join(c.modRequest.projectRoot, 'modules', 'vanna-dynamic', 'android', 'libs');
    for (const aar of ['dynamic-sdk-android.aar', 'solana-web3.aar']) {
      if (!fs.existsSync(path.join(libs, aar))) {
        throw new Error(
          `vanna-dynamic: ${aar} is missing in ${libs}. Run: node modules/vanna-dynamic/scripts/fetch-android-sdk.mjs`
        );
      }
    }
    if (!c.modResults.contents.includes(MARK)) {
      const rel = '../../modules/vanna-dynamic/android/libs';
      c.modResults.contents = c.modResults.contents.replace(
        /dependencies\s*\{/,
        `dependencies {\n    ${MARK}\n    implementation files("${rel}/dynamic-sdk-android.aar")\n    implementation files("${rel}/solana-web3.aar")`
      );
    }
    return c;
  });
}

function withIosScheme(config) {
  return withInfoPlist(config, (c) => {
    const types = c.modResults.CFBundleURLTypes ?? [];
    if (!types.some((t) => (t.CFBundleURLSchemes ?? []).includes(REDIRECT_SCHEME))) {
      types.push({ CFBundleURLSchemes: [REDIRECT_SCHEME] });
    }
    c.modResults.CFBundleURLTypes = types;
    return c;
  });
}

module.exports = (config) => withIosScheme(withAars(withManifest(withMinSdk(config))));
