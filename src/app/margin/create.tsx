import { MarginSetup } from "@/components/margin/margin-setup";
import { useHeaderProps } from "@/hooks/use-header-props";
import { useMarginCreate } from "@/hooks/use-margin-create";

export default function CreateMarginAccount() {
  const headerProps = useHeaderProps();
  const { view } = useMarginCreate();

  return <MarginSetup view={view} headerProps={headerProps} />;
}
