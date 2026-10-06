// Runs before Expo Router and the app (see ../index.js). Order matters: the location must exist before expo-router
// reads it, and the fetch interceptor is installed before any query runs.
import "./memory-location";
import "./appearance";
import "./svg-id-scope";
import "./wallet-stand-in";
import "./fetch-interceptor";
