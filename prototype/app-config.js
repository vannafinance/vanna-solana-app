// App config of the prototype build, derived from the app's own app.json (which targets Android only): same app,
// plus the web platform, exported as a single-page app. build.mjs writes the result to the staged app.json.
module.exports = function prototypeAppConfig(appJson) {
  const expo = { ...appJson.expo };
  expo.platforms = [...new Set([...(expo.platforms || []), "web"])];
  expo.web = { ...(expo.web || {}), bundler: "metro", output: "single" };
  return { ...appJson, expo };
};
