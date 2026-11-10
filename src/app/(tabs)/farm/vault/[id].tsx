import { useLocalSearchParams } from "expo-router";

import FarmVaultScreen from "@/screens/farm/vault";

// Farm vault detail (design farm-vault / farm-position): a vault card or a position opens it.
export default function FarmVaultRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <FarmVaultScreen id={String(id)} />;
}
