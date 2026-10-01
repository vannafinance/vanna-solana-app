import { Redirect } from "expo-router";
import { useMobileWallet } from "@wallet-ui/react-native-web3js";

export default function Index() {
  const { account } = useMobileWallet();
  return <Redirect href={account ? "/home" : "/welcome"} />;
}
