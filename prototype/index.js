// Entry of the prototype build (replaces the app's index.js / polyfill.js, which install react-native-quick-crypto,
// a native-only module). The prelude sets up the browser stand-ins, then Expo Router starts the real app.
import "./shims/prelude";
import "expo-router/entry";
