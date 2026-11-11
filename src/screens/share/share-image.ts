import * as Sharing from "expo-sharing";
import { type HostInstance, Platform, Share } from "react-native";
import { captureRef } from "react-native-view-shot";

import * as dynamic from "@/chain/dynamic";

// Picture of a view plus its text, handed to the phone's own share menu together. The file gets a readable name
// (a captured view is otherwise called something like ReactNative-snapshot-image123.png).
export async function shareCaptured(view: { current: HostInstance | null }, text: string, fileName: string) {
  if (Platform.OS === "web") {
    await Share.share({ message: text });
    return;
  }
  const uri = await captureRef(view, { format: "png", quality: 1, result: "tmpfile" });
  if (Platform.OS === "ios") {
    await Share.share({ url: uri, message: text });
    return;
  }
  if (await dynamic.shareImage(uri, text, fileName)) return;
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Share" });
  else await Share.share({ message: text });
}
