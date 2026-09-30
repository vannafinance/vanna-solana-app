import { previewVaults } from "@/lib/preview-data/earn";
import type { VaultDetail } from "@/types/earn";
import type { Resource } from "@/types/resource";

import { previewResource } from "./preview-resource";

export function useVault(id: string): Resource<VaultDetail> {
  const vault = previewVaults.find((candidate) => candidate.id === id);
  return vault ? previewResource(vault) : { status: "empty" };
}
