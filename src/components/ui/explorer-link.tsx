import { IconButton } from "./icon-button";

type ExplorerLinkProps = {
  signature: string;
  onOpen: (signature: string) => void;
};

export function ExplorerLink({ signature, onOpen }: ExplorerLinkProps) {
  return <IconButton icon="arrow_outward" label="View transaction on Solana Explorer" size={44} onPress={() => onOpen(signature)} />;
}
