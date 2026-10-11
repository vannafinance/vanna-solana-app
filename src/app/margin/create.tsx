import { MarginAccountSheet } from "@/components/margin/margin-account-sheet";
import { useMarginCreate } from "@/hooks/use-margin-create";

export default function CreateMarginAccount() {
  return <MarginAccountSheet view={useMarginCreate()} />;
}
