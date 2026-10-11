import { Redirect } from "expo-router";
import { useMobileWallet } from "@wallet-ui/react-native-web3js";

import { useSpaceChoice } from "@/hooks/use-space-choice";

export default function Index() {
  const { account } = useMobileWallet();
  const choice = useSpaceChoice();

  if (!account) return <Redirect href="/welcome" />;
  if (choice.status === "loading") return null;
  return <Redirect href={choice.entryRoute} />;
}
