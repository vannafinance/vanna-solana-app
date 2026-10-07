import { AppState } from "react-native";

const LONGEST_WAIT_MS = 60_000;

// After a wallet refuses, it shows its own error screen and does not always switch back to Vanna. Android does not let an
// app in the background open the wallet again, so a retry waits until Vanna is in front (the user came back), then pauses
// long enough for the wallet to have closed its screen. Gives up waiting after a minute and tries anyway.
export async function waitForForeground(pauseMs: number): Promise<void> {
  if (AppState.currentState !== "active") {
    await new Promise<void>((resolve) => {
      const timer = setTimeout(done, LONGEST_WAIT_MS);
      const subscription = AppState.addEventListener("change", (state) => {
        if (state === "active") done();
      });
      function done() {
        clearTimeout(timer);
        subscription.remove();
        resolve();
      }
    });
  }
  await new Promise((resolve) => setTimeout(resolve, pauseMs));
}
